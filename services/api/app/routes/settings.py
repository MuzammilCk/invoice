"""Settings endpoint (BP 8.1, 4.8)."""

import datetime

from contracts.preset import BusinessProfileUpdate, PresetModel
from fastapi import APIRouter, Cookie, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import hash_pin, validate_session
from app.db import get_db
from app.errors import error_json
from app.models.business_profile import BusinessProfile
from app.models.preset import Preset
from app.models.workspace import Workspace

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsResponse(BaseModel):
    workspace_id: str
    name: str
    address_lines: list[str]
    phones: list[str]
    footer: str
    currency: str
    date_format: str
    help_improve_voice: bool
    default_preset_id: str | None
    default_preset: PresetModel | None = None


def _get_workspace_id(session: str | None = Cookie(default=None, alias="session")) -> str:
    if session is None:
        raise ValueError("NOT_AUTHENTICATED")
    ws_id = validate_session(session)
    if ws_id is None:
        raise ValueError("INVALID_SESSION")
    return ws_id


@router.get("", response_model=SettingsResponse)
def get_settings(
    session: str | None = Cookie(default=None, alias="session"),
    db: Session = Depends(get_db),
):
    try:
        ws_id = _get_workspace_id(session)
    except ValueError:
        return error_json(401, "NOT_AUTHENTICATED", "Authentication required")

    profile = db.query(BusinessProfile).filter_by(workspace_id=ws_id).first()
    if not profile:
        ws = db.query(Workspace).filter_by(id=ws_id).first()
        if not ws:
            return error_json(404, "NOT_FOUND", "Workspace not found")
        # Return initial empty profile structure
        return SettingsResponse(
            workspace_id=ws.id,
            name=ws.name,
            address_lines=[],
            phones=[],
            footer="",
            currency="₹",
            date_format="DD MMMM YYYY",
            help_improve_voice=ws.help_improve_voice,
            default_preset_id=None,
            default_preset=None,
        )

    default_preset = None
    if profile.default_preset_id:
        default_preset = db.query(Preset).filter_by(id=profile.default_preset_id).first()

    return SettingsResponse(
        workspace_id=profile.workspace_id,
        name=profile.name,
        address_lines=profile.address_lines,
        phones=profile.phones,
        footer=profile.footer,
        currency=profile.currency,
        date_format=profile.date_format,
        help_improve_voice=profile.help_improve_voice,
        default_preset_id=profile.default_preset_id,
        default_preset=default_preset,
    )


@router.put("", response_model=SettingsResponse)
def update_settings(
    body: BusinessProfileUpdate,
    session: str | None = Cookie(default=None, alias="session"),
    db: Session = Depends(get_db),
):
    try:
        ws_id = _get_workspace_id(session)
    except ValueError:
        return error_json(401, "NOT_AUTHENTICATED", "Authentication required")

    profile = db.query(BusinessProfile).filter_by(workspace_id=ws_id).first()
    ws = db.query(Workspace).filter_by(id=ws_id).first()
    if not ws:
        return error_json(404, "NOT_FOUND", "Workspace not found")

    if not profile:
        profile = BusinessProfile(
            workspace_id=ws_id,
            name=body.name or ws.name,
            address_lines=body.address_lines or [],
            phones=body.phones or [],
            footer=body.footer or "",
            currency=body.currency or "₹",
            date_format=body.date_format or "DD MMMM YYYY",
            default_preset_id=body.default_preset_id,
            help_improve_voice=(
                body.help_improve_voice if body.help_improve_voice is not None else True
            ),
        )
        db.add(profile)
    else:
        if body.name is not None:
            profile.name = body.name
            ws.name = body.name
        if body.address_lines is not None:
            profile.address_lines = body.address_lines
        if body.phones is not None:
            profile.phones = body.phones
        if body.footer is not None:
            profile.footer = body.footer
        if body.currency is not None:
            profile.currency = body.currency
        if body.date_format is not None:
            profile.date_format = body.date_format
        if body.help_improve_voice is not None:
            profile.help_improve_voice = body.help_improve_voice
            ws.help_improve_voice = body.help_improve_voice
        if body.default_preset_id is not None:
            profile.default_preset_id = body.default_preset_id

    # Handle PIN update if provided
    if body.pin is not None:
        pin_hash = hash_pin(body.pin)
        profile.pin_hash = pin_hash
        ws.pin_hash = pin_hash

    profile.updated_at = datetime.datetime.now()
    db.commit()
    db.refresh(profile)

    default_preset = None
    if profile.default_preset_id:
        default_preset = db.query(Preset).filter_by(id=profile.default_preset_id).first()

    return SettingsResponse(
        workspace_id=profile.workspace_id,
        name=profile.name,
        address_lines=profile.address_lines,
        phones=profile.phones,
        footer=profile.footer,
        currency=profile.currency,
        date_format=profile.date_format,
        help_improve_voice=profile.help_improve_voice,
        default_preset_id=profile.default_preset_id,
        default_preset=default_preset,
    )

"""First-run setup endpoint (BP 4.9, Decision D2)."""

import uuid

from contracts.columns import order_columns, validate_columns
from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import (
    create_session_token,
    hash_pin,
    store_session,
)
from app.config import settings
from app.db import get_db
from app.errors import error_json
from app.models.business_profile import BusinessProfile
from app.models.preset import Preset
from app.models.workspace import Workspace

router = APIRouter(prefix="/setup", tags=["setup"])


class FirstRunSetupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    address_lines: list[str] = Field(default_factory=list, max_length=4)
    phones: list[str] = Field(default_factory=list, max_length=3)
    footer: str = Field(default="", max_length=500)
    currency: str = Field(default="₹", max_length=10)
    date_format: str = Field(default="DD MMMM YYYY", max_length=50)
    design_id: str = Field(default="design1", min_length=1)
    columns: list[str] = Field(default=["no", "item", "qty", "rate", "amount"])
    pin: str = Field(..., min_length=4, max_length=50)
    help_improve_voice: bool = Field(default=True)


@router.post("")
def setup_first_run(
    body: FirstRunSetupRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """Atomic first-run setup: creates/updates workspace, profile, default preset and logs in."""
    valid, err = validate_columns(body.columns)
    if not valid:
        return error_json(400, "INVALID_COLUMNS", err or "Invalid columns", field="columns")

    # 1. Get or create Workspace
    workspace = db.query(Workspace).first()
    if workspace is None:
        workspace = Workspace(
            id=str(uuid.uuid4()),
            name=body.name,
        )
        db.add(workspace)
        db.commit()
        db.refresh(workspace)

    workspace.name = body.name
    workspace.pin_hash = hash_pin(body.pin)
    workspace.help_improve_voice = body.help_improve_voice

    # 2. Create Default Preset
    preset = Preset(
        workspace_id=workspace.id,
        name="Default",
        design_id=body.design_id,
        columns=order_columns(body.columns),
        labels={},
    )
    db.add(preset)
    db.commit()
    db.refresh(preset)

    # 3. Create or update BusinessProfile
    profile = db.query(BusinessProfile).filter_by(workspace_id=workspace.id).first()
    if profile is None:
        profile = BusinessProfile(
            workspace_id=workspace.id,
            name=body.name,
            address_lines=body.address_lines,
            phones=body.phones,
            footer=body.footer,
            currency=body.currency,
            date_format=body.date_format,
            default_preset_id=preset.id,
            pin_hash=workspace.pin_hash,
            help_improve_voice=body.help_improve_voice,
        )
        db.add(profile)
    else:
        profile.name = body.name
        profile.address_lines = body.address_lines
        profile.phones = body.phones
        profile.footer = body.footer
        profile.currency = body.currency
        profile.date_format = body.date_format
        profile.default_preset_id = preset.id
        profile.pin_hash = workspace.pin_hash
        profile.help_improve_voice = body.help_improve_voice

    db.commit()

    # 4. Auto-login and issue session cookie
    token = create_session_token()
    store_session(token, workspace.id, settings.session_max_age_seconds)
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_max_age_seconds,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
    )

    return {
        "message": "ok",
        "workspace_id": workspace.id,
        "preset_id": preset.id,
    }

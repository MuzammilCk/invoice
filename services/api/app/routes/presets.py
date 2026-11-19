"""Presets endpoint (BP 8.1, 3.4)."""

import datetime

from contracts.columns import order_columns, validate_columns
from contracts.preset import PresetCreate, PresetModel, PresetUpdate
from fastapi import APIRouter, Cookie, Depends
from sqlalchemy.orm import Session

from app.auth import validate_session
from app.db import get_db
from app.errors import error_json
from app.models.preset import Preset

router = APIRouter(prefix="/presets", tags=["presets"])


def _get_workspace_id(session: str | None = Cookie(default=None, alias="session")) -> str:
    if session is None:
        raise ValueError("NOT_AUTHENTICATED")
    ws_id = validate_session(session)
    if ws_id is None:
        raise ValueError("INVALID_SESSION")
    return ws_id


@router.get("", response_model=list[PresetModel])
def list_presets(
    session: str | None = Cookie(default=None, alias="session"),
    db: Session = Depends(get_db),
):
    try:
        ws_id = _get_workspace_id(session)
    except ValueError:
        return error_json(401, "NOT_AUTHENTICATED", "Authentication required")

    presets = (
        db.query(Preset)
        .filter_by(workspace_id=ws_id, archived=False)
        .order_by(Preset.created_at.desc())
        .all()
    )
    return presets


@router.post("", response_model=PresetModel)
def create_preset(
    body: PresetCreate,
    session: str | None = Cookie(default=None, alias="session"),
    db: Session = Depends(get_db),
):
    try:
        ws_id = _get_workspace_id(session)
    except ValueError:
        return error_json(401, "NOT_AUTHENTICATED", "Authentication required")

    valid, err = validate_columns(body.columns)
    if not valid:
        return error_json(400, "INVALID_COLUMNS", err or "Invalid columns", field="columns")

    preset = Preset(
        workspace_id=ws_id,
        name=body.name,
        design_id=body.design_id,
        columns=order_columns(body.columns),
        labels=body.labels,
    )
    db.add(preset)
    db.commit()
    db.refresh(preset)
    return preset


@router.get("/{preset_id}", response_model=PresetModel)
def get_preset(
    preset_id: str,
    session: str | None = Cookie(default=None, alias="session"),
    db: Session = Depends(get_db),
):
    try:
        ws_id = _get_workspace_id(session)
    except ValueError:
        return error_json(401, "NOT_AUTHENTICATED", "Authentication required")

    preset = db.query(Preset).filter_by(id=preset_id, workspace_id=ws_id).first()
    if not preset:
        return error_json(404, "PRESET_NOT_FOUND", f"Preset '{preset_id}' not found")
    return preset


@router.put("/{preset_id}", response_model=PresetModel)
def update_preset(
    preset_id: str,
    body: PresetUpdate,
    session: str | None = Cookie(default=None, alias="session"),
    db: Session = Depends(get_db),
):
    try:
        ws_id = _get_workspace_id(session)
    except ValueError:
        return error_json(401, "NOT_AUTHENTICATED", "Authentication required")

    preset = db.query(Preset).filter_by(id=preset_id, workspace_id=ws_id).first()
    if not preset:
        return error_json(404, "PRESET_NOT_FOUND", f"Preset '{preset_id}' not found")

    if body.columns is not None:
        valid, err = validate_columns(body.columns)
        if not valid:
            return error_json(400, "INVALID_COLUMNS", err or "Invalid columns", field="columns")
        preset.columns = order_columns(body.columns)

    if body.name is not None:
        preset.name = body.name
    if body.design_id is not None:
        preset.design_id = body.design_id
    if body.labels is not None:
        preset.labels = body.labels
    if body.archived is not None:
        preset.archived = body.archived

    preset.updated_at = datetime.datetime.now()
    db.commit()
    db.refresh(preset)
    return preset

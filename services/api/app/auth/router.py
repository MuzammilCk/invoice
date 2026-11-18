"""Auth endpoints (BP 8.1): POST /auth/login, POST /auth/logout, GET /me."""

from __future__ import annotations

from fastapi import APIRouter, Cookie, Depends, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import (
    create_session_token,
    delete_session,
    hash_pin,
    rate_limiter,
    store_session,
    validate_session,
    verify_pin,
)
from app.config import settings
from app.db import get_db
from app.errors import error_json
from app.models.workspace import Workspace

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    pin: str = Field(min_length=1, max_length=50)


class MeResponse(BaseModel):
    workspace_id: str
    name: str


class SetupRequest(BaseModel):
    """Set the initial PIN (only if no PIN is set yet)."""

    pin: str = Field(min_length=4, max_length=50)
    name: str = Field(default="My Business", max_length=200)


@router.post("/login")
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """Authenticate with PIN, return a session cookie."""
    workspace = db.query(Workspace).first()
    if workspace is None:
        return error_json(500, "NO_WORKSPACE", "No workspace configured")

    if workspace.pin_hash is None:
        return error_json(400, "PIN_NOT_SET", "PIN has not been set up yet. Use /auth/setup first.")

    # Rate limiting (BP 8.2)
    if rate_limiter.is_locked(workspace.id):
        remaining = rate_limiter.remaining_lockout(workspace.id)
        return error_json(
            429,
            "RATE_LIMITED",
            f"Too many attempts. Try again in {remaining // 60} minutes.",
        )

    if not verify_pin(workspace.pin_hash, body.pin):
        locked = rate_limiter.record_failure(workspace.id)
        if locked:
            return error_json(
                429,
                "RATE_LIMITED",
                "Too many attempts. Try again in 10 minutes.",
            )
        return error_json(401, "INVALID_PIN", "Incorrect PIN")

    # Success
    rate_limiter.reset(workspace.id)
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
    return {"message": "ok"}


@router.post("/logout")
def logout(
    response: Response,
    session: str | None = Cookie(default=None, alias="session"),
):
    """Clear the session cookie."""
    if session:
        delete_session(session)
    response.delete_cookie(key=settings.session_cookie_name)
    return {"message": "ok"}


@router.get("/me", response_model=MeResponse)
def me(
    session: str | None = Cookie(default=None, alias="session"),
    db: Session = Depends(get_db),
):
    """Return the current workspace info, or 401."""
    if session is None:
        return error_json(401, "NOT_AUTHENTICATED", "Not authenticated")

    workspace_id = validate_session(session)
    if workspace_id is None:
        return error_json(401, "INVALID_SESSION", "Session expired or invalid")

    workspace = db.query(Workspace).filter_by(id=workspace_id).first()
    if workspace is None:
        return error_json(401, "WORKSPACE_NOT_FOUND", "Workspace not found")

    return MeResponse(workspace_id=workspace.id, name=workspace.name)


@router.post("/setup")
def setup(body: SetupRequest, response: Response, db: Session = Depends(get_db)):
    """Set the initial PIN for the workspace (only if none is set)."""
    workspace = db.query(Workspace).first()
    if workspace is None:
        return error_json(500, "NO_WORKSPACE", "No workspace configured")

    if workspace.pin_hash is not None:
        return error_json(400, "PIN_ALREADY_SET", "PIN is already set. Use settings to change it.")

    workspace.pin_hash = hash_pin(body.pin)
    if body.name:
        workspace.name = body.name
    db.commit()

    # Auto-login after setup
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
    return {"message": "ok"}

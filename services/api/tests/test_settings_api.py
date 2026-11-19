"""Tests for /settings and /setup API endpoints (BP 8.1, 4.8, 4.9)."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.auth import create_session_token, store_session, verify_pin
from app.models.business_profile import BusinessProfile
from app.models.preset import Preset
from app.models.workspace import Workspace


def test_first_run_setup_flow(client: TestClient, db_session: Session):
    # Clear existing state to test from clean slate
    db_session.query(BusinessProfile).delete()
    db_session.query(Preset).delete()
    db_session.query(Workspace).delete()
    db_session.commit()

    setup_payload = {
        "name": "Kerala Wood Works",
        "address_lines": ["Main Road", "Calicut"],
        "phones": ["+91 94000 00000"],
        "footer": "Thank you for your business",
        "currency": "₹",
        "date_format": "DD MMMM YYYY",
        "design_id": "design1",
        "columns": ["no", "item", "qty", "rate", "amount"],
        "pin": "1234",
        "help_improve_voice": True,
    }

    res = client.post("/setup", json=setup_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["message"] == "ok"
    assert "session" in res.cookies

    # Query DB
    ws = db_session.query(Workspace).first()
    assert ws is not None
    assert ws.name == "Kerala Wood Works"
    assert verify_pin(ws.pin_hash, "1234")

    profile = db_session.query(BusinessProfile).first()
    assert profile is not None
    assert profile.name == "Kerala Wood Works"
    assert profile.address_lines == ["Main Road", "Calicut"]
    assert profile.phones == ["+91 94000 00000"]
    assert profile.default_preset_id is not None

    preset = db_session.query(Preset).filter_by(id=profile.default_preset_id).first()
    assert preset is not None
    assert preset.columns == ["no", "item", "qty", "rate", "amount"]


def test_get_and_update_settings(client: TestClient, db_session: Session):
    ws = db_session.query(Workspace).first()
    if not ws:
        ws = Workspace(id="ws-set-1", name="Original Co", pin_hash="fake")
        db_session.add(ws)
        db_session.commit()

    profile = db_session.query(BusinessProfile).filter_by(workspace_id=ws.id).first()
    if not profile:
        profile = BusinessProfile(
            workspace_id=ws.id,
            name="Original Co",
            address_lines=["Addr 1"],
            phones=["1111"],
        )
        db_session.add(profile)
        db_session.commit()

    token = create_session_token()
    store_session(token, ws.id, 3600)
    client.cookies.set("session", token)

    # GET /settings
    res = client.get("/settings")
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Original Co"

    # PUT /settings
    update_payload = {
        "name": "Updated Co",
        "footer": "Updated footer",
        "help_improve_voice": False,
    }
    update_res = client.put("/settings", json=update_payload)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["name"] == "Updated Co"
    assert updated_data["footer"] == "Updated footer"
    assert updated_data["help_improve_voice"] is False

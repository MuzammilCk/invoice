"""Tests for /presets API endpoints (BP 8.1, 3.4)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.auth import create_session_token, store_session
from app.models.preset import Preset
from app.models.workspace import Workspace


@pytest.fixture
def auth_client(client: TestClient, db_session: Session):
    ws = db_session.query(Workspace).first()
    if not ws:
        ws = Workspace(id="ws-test-1", name="Test Workspace", pin_hash="fake")
        db_session.add(ws)
        db_session.commit()

    token = create_session_token()
    store_session(token, ws.id, 3600)
    client.cookies.set("session", token)
    return client, ws.id


def test_presets_require_auth(client: TestClient):
    client.cookies.clear()
    res = client.get("/presets")
    assert res.status_code == 401


def test_create_and_list_presets(auth_client, db_session: Session):
    c, ws_id = auth_client

    payload = {
        "name": "My Custom Preset",
        "design_id": "design1",
        "columns": ["no", "item", "qty", "rate", "amount"],
        "labels": {"billed_to": "Bill To"},
    }
    create_res = c.post("/presets", json=payload)
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["name"] == "My Custom Preset"
    assert created["columns"] == ["no", "item", "qty", "rate", "amount"]
    preset_id = created["id"]

    # List presets
    list_res = c.get("/presets")
    assert list_res.status_code == 200
    presets = list_res.json()
    assert any(p["id"] == preset_id for p in presets)


def test_create_preset_invalid_columns_rejected(auth_client):
    c, _ = auth_client
    # Invalid: missing rate
    payload = {
        "name": "Bad Preset",
        "design_id": "design1",
        "columns": ["no", "item", "qty", "amount"],
    }
    res = c.post("/presets", json=payload)
    assert res.status_code == 422
    data = res.json()
    assert "Item and Rate are required" in data["message"]


def test_update_preset(auth_client, db_session: Session):
    c, ws_id = auth_client
    preset = Preset(
        workspace_id=ws_id,
        name="Old Name",
        design_id="design1",
        columns=["item", "rate"],
    )
    db_session.add(preset)
    db_session.commit()

    update_payload = {
        "name": "New Name",
        "columns": ["no", "item", "rate"],
    }
    res = c.put(f"/presets/{preset.id}", json=update_payload)
    assert res.status_code == 200
    updated = res.json()
    assert updated["name"] == "New Name"
    assert updated["columns"] == ["no", "item", "rate"]

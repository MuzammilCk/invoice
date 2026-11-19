"""Tests for GET /designs and GET /columns endpoints (BP 8.1, 4.2)."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_get_columns():
    response = client.get("/columns")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    ids = [col["id"] for col in data]
    # Default returns v1 columns
    assert ids == ["no", "item", "qty", "rate", "amount"]


def test_get_columns_all():
    response = client.get("/columns?v1_only=false")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 8


def test_get_designs():
    response = client.get("/designs")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    design1 = next(d for d in data if d["id"] == "design1")
    assert design1["sample_preview_url"] == "/designs/design1/sample"


def test_get_design_sample_preview():
    response = client.get("/designs/design1/sample")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert len(response.content) > 0


def test_get_unknown_design_sample_returns_404():
    response = client.get("/designs/unknown_skin/sample")
    assert response.status_code == 404

"""Tests for the health endpoint (AC1)."""


def test_health_returns_200_with_ok(client):
    """AC1: GET /health returns 200 with {"status": "ok"}."""
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

"""Tests for the error format (AC8)."""

from app.errors import ErrorResponse, error_json


def test_error_response_model():
    """AC8: Error body contains code, message, and optional field."""
    err = ErrorResponse(code="TEST_ERROR", message="Something broke", field="name")
    data = err.model_dump(exclude_none=True)
    assert data == {"code": "TEST_ERROR", "message": "Something broke", "field": "name"}


def test_error_response_without_field():
    """AC8: Error body without field omits it."""
    err = ErrorResponse(code="TEST_ERROR", message="Something broke")
    data = err.model_dump(exclude_none=True)
    assert data == {"code": "TEST_ERROR", "message": "Something broke"}
    assert "field" not in data


def test_error_json_returns_json_response():
    """AC8: error_json() returns a JSONResponse with correct status and body."""
    resp = error_json(422, "VALIDATION_ERROR", "Bad input", field="pin")
    assert resp.status_code == 422
    import json

    body = json.loads(resp.body)
    assert body["code"] == "VALIDATION_ERROR"
    assert body["message"] == "Bad input"
    assert body["field"] == "pin"

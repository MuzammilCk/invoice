"""Tests for database setup (AC16)."""

from app.models.workspace import Workspace


def test_workspace_seeded(db_session):
    """AC16: One workspace row exists after seeding."""
    workspaces = db_session.query(Workspace).all()
    assert len(workspaces) == 1
    assert workspaces[0].name == "My Business"


def test_workspace_has_expected_columns(db_session):
    """Workspace row has the expected fields."""
    ws = db_session.query(Workspace).first()
    assert ws is not None
    assert ws.id is not None
    assert ws.pin_hash is None  # not set yet
    assert ws.created_at is not None

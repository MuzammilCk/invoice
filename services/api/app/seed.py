"""Seed the database with the initial workspace row."""

import datetime
import uuid

from sqlalchemy.orm import Session

from app.models.workspace import Workspace


def seed_workspace(db: Session) -> Workspace:
    """Ensure exactly one workspace row exists. Return it."""
    workspace = db.query(Workspace).first()
    if workspace is None:
        workspace = Workspace(
            id=str(uuid.uuid4()),
            name="My Business",
            created_at=datetime.datetime.now(datetime.UTC),
        )
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
    return workspace

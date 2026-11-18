"""Shared test fixtures."""

import os
import tempfile

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

# Set test environment before importing app modules
os.environ["VTI_COOKIE_SECURE"] = "false"
os.environ["VTI_DATABASE_URL"] = "sqlite:///test.db"

from app.db import Base, get_db
from app.main import create_app
from app.models import Workspace  # noqa: F401 — register models
from app.seed import seed_workspace


@event.listens_for(Engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):  # type: ignore[no-untyped-def]
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


@pytest.fixture()
def db_path():
    """Create a temporary SQLite database file."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    yield path
    os.unlink(path)


@pytest.fixture()
def db_session(db_path: str):
    """Create a database session with all tables and a seeded workspace."""
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    test_session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    session = test_session_factory()
    seed_workspace(session)
    yield session
    session.close()
    engine.dispose()


@pytest.fixture()
def client(db_session: Session):
    """Create a test client with the DB session overridden."""
    from fastapi.testclient import TestClient

    app = create_app()

    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c

"""Tests for S03 SQLAlchemy models (BusinessProfile and Preset)."""

import uuid

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.models.business_profile import BusinessProfile
from app.models.preset import Preset
from app.models.workspace import Workspace


def test_models_crud_and_relationships():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    db = session_factory()

    # 1. Create workspace
    ws_id = str(uuid.uuid4())
    ws = Workspace(id=ws_id, name="Test Co")
    db.add(ws)
    db.commit()

    # 2. Create Preset
    preset_id = str(uuid.uuid4())
    preset = Preset(
        id=preset_id,
        workspace_id=ws_id,
        name="Standard",
        design_id="design1",
        columns=["no", "item", "qty", "rate", "amount"],
        labels={"billed_to": "Customer"},
    )
    db.add(preset)
    db.commit()

    # 3. Create BusinessProfile
    profile = BusinessProfile(
        workspace_id=ws_id,
        name="Kerala Traders",
        address_lines=["Line 1", "Line 2"],
        phones=["+91 9999999999"],
        footer="Thank you",
        currency="₹",
        date_format="DD MMMM YYYY",
        default_preset_id=preset_id,
        help_improve_voice=True,
    )
    db.add(profile)
    db.commit()

    # Query back
    saved_profile = db.query(BusinessProfile).filter_by(workspace_id=ws_id).first()
    assert saved_profile is not None
    assert saved_profile.name == "Kerala Traders"
    assert saved_profile.address_lines == ["Line 1", "Line 2"]
    assert saved_profile.phones == ["+91 9999999999"]
    assert saved_profile.default_preset_id == preset_id

    saved_preset = db.query(Preset).filter_by(id=preset_id).first()
    assert saved_preset is not None
    assert saved_preset.columns == ["no", "item", "qty", "rate", "amount"]
    assert saved_preset.labels == {"billed_to": "Customer"}
    assert saved_preset.archived is False

    db.close()

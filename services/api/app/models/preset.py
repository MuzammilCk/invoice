"""Preset model (BP 3.2, 3.4)."""

import datetime
import uuid

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Preset(Base):
    __tablename__ = "presets"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    workspace_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workspace.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, default="Default")
    design_id: Mapped[str] = mapped_column(String(50), nullable=False, default="design1")
    columns: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    labels: Mapped[dict[str, str]] = mapped_column(JSON, default=dict, nullable=False)
    archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.now, nullable=False
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now, nullable=False
    )

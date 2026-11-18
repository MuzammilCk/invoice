"""Workspace model — one row per business."""

import datetime
import uuid

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Workspace(Base):
    __tablename__ = "workspace"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, default="My Business")
    pin_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    help_improve_voice: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.now, nullable=False
    )

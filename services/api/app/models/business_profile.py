"""BusinessProfile model — one row per business workspace (BP 3.2)."""

import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class BusinessProfile(Base):
    __tablename__ = "business_profile"

    workspace_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workspace.id"), primary_key=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address_lines: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    phones: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    footer: Mapped[str] = mapped_column(Text, default="", nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="₹", nullable=False)
    date_format: Mapped[str] = mapped_column(String(50), default="DD MMMM YYYY", nullable=False)
    default_preset_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("presets.id", use_alter=True, name="fk_profile_default_preset"),
        nullable=True,
    )
    pin_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    help_improve_voice: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.now, nullable=False
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now, nullable=False
    )

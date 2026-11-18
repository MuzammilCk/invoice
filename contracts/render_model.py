"""RenderModel and sub-models for S01 Renderer engine.

The renderer is PURE: it only places pre-formatted text.
Money totals, dates and labels must be formatted by the caller.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class BusinessModel(BaseModel):
    """Business header data."""

    name: str = Field(..., min_length=1, max_length=200)
    lines: list[str] = Field(default_factory=list)
    phones: list[str] = Field(default_factory=list)


class LabelsModel(BaseModel):
    """Display labels (pre-translated / formatted strings)."""

    billed_to: str = Field(default="BILLED TO")
    date: str = Field(default="DATE")
    total: str = Field(default="TOTAL")


class ColumnModel(BaseModel):
    """A single column descriptor."""

    id: str = Field(..., min_length=1)
    label: str = Field(..., min_length=1)
    kind: Literal["text", "number", "integer"] = "text"
    align: Literal["left", "right"] = "left"


class RenderModel(BaseModel):
    """Complete data bag handed to the renderer.

    All strings must already be formatted (money, dates, labels).
    The renderer places text only — it never computes values.
    """

    business: BusinessModel
    date_display: str = Field(..., min_length=1)
    billed_to: str = Field(..., min_length=1, max_length=80)
    labels: LabelsModel = Field(default_factory=LabelsModel)
    columns: list[ColumnModel] = Field(..., min_length=1)
    # rows: list of dicts mapping column id -> display string
    rows: list[dict[str, str]] = Field(default_factory=list)
    total_display: str = Field(..., min_length=1)
    footer: str = Field(default="")
    currency: str = Field(default="₹")

"""Preset and Business Profile schemas (BP 3.2, 3.4)."""

from __future__ import annotations

import datetime

from pydantic import BaseModel, Field, field_validator

from contracts.columns import order_columns, validate_columns


class PresetBase(BaseModel):
    name: str = Field(default="Default", min_length=1, max_length=100)
    design_id: str = Field(default="design1", min_length=1, max_length=50)
    columns: list[str] = Field(
        default=["no", "item", "qty", "rate", "amount"],
        description="Ordered column IDs",
    )
    labels: dict[str, str] = Field(
        default_factory=dict,
        description="Overrides for billed_to, date, total",
    )

    @field_validator("columns")
    @classmethod
    def validate_and_order_columns(cls, v: list[str]) -> list[str]:
        valid, err = validate_columns(v)
        if not valid:
            raise ValueError(err)
        return order_columns(v)


class PresetCreate(PresetBase):
    pass


class PresetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    design_id: str | None = Field(default=None, min_length=1, max_length=50)
    columns: list[str] | None = None
    labels: dict[str, str] | None = None
    archived: bool | None = None

    @field_validator("columns")
    @classmethod
    def validate_and_order_columns(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        valid, err = validate_columns(v)
        if not valid:
            raise ValueError(err)
        return order_columns(v)


class PresetModel(PresetBase):
    id: str
    workspace_id: str
    archived: bool = False
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None


class BusinessProfileBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    address_lines: list[str] = Field(default_factory=list, max_length=4)
    phones: list[str] = Field(default_factory=list, max_length=3)
    footer: str = Field(default="", max_length=500)
    currency: str = Field(default="₹", max_length=10)
    date_format: str = Field(default="DD MMMM YYYY", max_length=50)
    help_improve_voice: bool = Field(default=True)
    default_preset_id: str | None = None


class BusinessProfileCreate(BusinessProfileBase):
    pass


class BusinessProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    address_lines: list[str] | None = Field(default=None, max_length=4)
    phones: list[str] | None = Field(default=None, max_length=3)
    footer: str | None = Field(default=None, max_length=500)
    currency: str | None = Field(default=None, max_length=10)
    date_format: str | None = Field(default=None, max_length=50)
    help_improve_voice: bool | None = None
    default_preset_id: str | None = None
    pin: str | None = Field(default=None, min_length=4, max_length=50)


class BusinessProfileModel(BusinessProfileBase):
    workspace_id: str
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None

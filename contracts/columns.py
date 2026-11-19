"""Column Registry and Preset validation rules (BP 3.3, 3.4)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

ColumnKind = Literal["serial", "text", "number", "money", "percent"]
FilledBy = Literal["auto", "voice", "computed"]
ColumnAlign = Literal["left", "center", "right"]


class ColumnRegistryItem(BaseModel):
    id: str = Field(..., min_length=1)
    label: str = Field(..., min_length=1)
    kind: ColumnKind
    filled_by: FilledBy
    width: str
    align: ColumnAlign
    version1: bool


COLUMN_REGISTRY: list[ColumnRegistryItem] = [
    ColumnRegistryItem(
        id="no",
        label="No.",
        kind="serial",
        filled_by="auto",
        width="fixed, narrow",
        align="center",
        version1=True,
    ),
    ColumnRegistryItem(
        id="item",
        label="Item",
        kind="text",
        filled_by="voice",
        width="flexible, wraps",
        align="left",
        version1=True,
    ),
    ColumnRegistryItem(
        id="qty",
        label="Qty",
        kind="number",
        filled_by="voice",
        width="fixed",
        align="right",
        version1=True,
    ),
    ColumnRegistryItem(
        id="unit",
        label="Unit",
        kind="text",
        filled_by="voice",
        width="fixed",
        align="left",
        version1=False,
    ),
    ColumnRegistryItem(
        id="rate",
        label="Rate",
        kind="money",
        filled_by="voice",
        width="fixed",
        align="right",
        version1=True,
    ),
    ColumnRegistryItem(
        id="discount",
        label="Disc %",
        kind="percent",
        filled_by="voice",
        width="fixed",
        align="right",
        version1=False,
    ),
    ColumnRegistryItem(
        id="tax",
        label="Tax %",
        kind="percent",
        filled_by="voice",
        width="fixed",
        align="right",
        version1=False,
    ),
    ColumnRegistryItem(
        id="amount",
        label="Amount",
        kind="money",
        filled_by="computed",
        width="fixed",
        align="right",
        version1=True,
    ),
]

COLUMN_REGISTRY_MAP: dict[str, ColumnRegistryItem] = {
    col.id: col for col in COLUMN_REGISTRY
}

REGISTRY_ORDER: list[str] = [col.id for col in COLUMN_REGISTRY]


def get_v1_columns() -> list[ColumnRegistryItem]:
    """Return columns marked on for version 1 (BP 3.4 rule 5)."""
    return [col for col in COLUMN_REGISTRY if col.version1]


def order_columns(column_ids: list[str]) -> list[str]:
    """Sort column IDs strictly following registry order (BP 3.4 rule 4)."""
    # Deduplicate while preserving registry order
    chosen = set(column_ids)
    return [cid for cid in REGISTRY_ORDER if cid in chosen]


def resolve_total_column(column_ids: list[str]) -> str:
    """The total column is Amount if present, otherwise Rate (BP 3.4 rule 3)."""
    return "amount" if "amount" in column_ids else "rate"


def validate_columns(column_ids: list[str]) -> tuple[bool, str | None]:
    """Validate column configuration according to BP 3.4 preset rules.

    Returns:
        (True, None) if valid.
        (False, error_message) if invalid.
    """
    if not column_ids:
        return False, "At least one column is required."

    # Check for unknown columns
    unknown = [cid for cid in column_ids if cid not in COLUMN_REGISTRY_MAP]
    if unknown:
        return False, f"Unknown column(s): {', '.join(unknown)}"

    # Rule 4: At most 6 columns
    unique_ids = list(dict.fromkeys(column_ids))
    if len(unique_ids) > 6:
        return False, "At most 6 columns are permitted."

    # Rule 1: Item and Rate are required
    if "item" not in unique_ids or "rate" not in unique_ids:
        return False, "Item and Rate are required."

    # Rule 2: Qty and Amount come together
    has_qty = "qty" in unique_ids
    has_amount = "amount" in unique_ids
    if has_qty and not has_amount:
        return False, "Qty requires Amount."
    if has_amount and not has_qty:
        return False, "Amount requires Qty and Rate."

    return True, None

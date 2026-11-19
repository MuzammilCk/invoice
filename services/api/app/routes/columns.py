"""Columns endpoint (BP 8.1, 3.3)."""

from contracts.columns import (
    COLUMN_REGISTRY,
    ColumnRegistryItem,
    get_v1_columns,
)
from fastapi import APIRouter

router = APIRouter(prefix="/columns", tags=["columns"])


@router.get("", response_model=list[ColumnRegistryItem])
def list_columns(v1_only: bool = True):
    """Return column registry items."""
    if v1_only:
        return get_v1_columns()
    return COLUMN_REGISTRY

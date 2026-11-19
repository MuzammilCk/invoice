"""Tests for Column Registry and Preset Rules (BP 3.3, 3.4)."""

import pytest
from contracts.columns import (
    COLUMN_REGISTRY,
    COLUMN_REGISTRY_MAP,
    get_v1_columns,
    order_columns,
    resolve_total_column,
    validate_columns,
)
from contracts.preset import PresetCreate


class TestColumnRegistry:
    def test_registry_has_exact_8_columns_in_order(self):
        expected_ids = ["no", "item", "qty", "unit", "rate", "discount", "tax", "amount"]
        actual_ids = [col.id for col in COLUMN_REGISTRY]
        assert actual_ids == expected_ids

    def test_registry_metadata(self):
        no_col = COLUMN_REGISTRY_MAP["no"]
        assert no_col.label == "No."
        assert no_col.kind == "serial"
        assert no_col.filled_by == "auto"
        assert no_col.align == "center"
        assert no_col.version1 is True

        item_col = COLUMN_REGISTRY_MAP["item"]
        assert item_col.label == "Item"
        assert item_col.kind == "text"
        assert item_col.filled_by == "voice"
        assert item_col.align == "left"
        assert item_col.version1 is True

        qty_col = COLUMN_REGISTRY_MAP["qty"]
        assert qty_col.label == "Qty"
        assert qty_col.kind == "number"
        assert qty_col.filled_by == "voice"
        assert qty_col.align == "right"
        assert qty_col.version1 is True

        unit_col = COLUMN_REGISTRY_MAP["unit"]
        assert unit_col.label == "Unit"
        assert unit_col.version1 is False

        disc_col = COLUMN_REGISTRY_MAP["discount"]
        assert disc_col.label == "Disc %"
        assert disc_col.version1 is False

        tax_col = COLUMN_REGISTRY_MAP["tax"]
        assert tax_col.label == "Tax %"
        assert tax_col.version1 is False

        amount_col = COLUMN_REGISTRY_MAP["amount"]
        assert amount_col.label == "Amount"
        assert amount_col.kind == "money"
        assert amount_col.filled_by == "computed"
        assert amount_col.version1 is True

    def test_v1_columns_filtered(self):
        v1_cols = get_v1_columns()
        v1_ids = [c.id for c in v1_cols]
        assert v1_ids == ["no", "item", "qty", "rate", "amount"]
        assert "unit" not in v1_ids
        assert "discount" not in v1_ids
        assert "tax" not in v1_ids


class TestPresetRulesValidation:
    """BP 3.4 Preset rules validated on the server."""

    def test_item_and_rate_required(self):
        # Missing both
        valid, err = validate_columns(["no", "qty", "amount"])
        assert not valid
        assert "Item and Rate are required" in err

        # Missing item
        valid, err = validate_columns(["no", "rate"])
        assert not valid
        assert "Item and Rate are required" in err

        # Missing rate
        valid, err = validate_columns(["no", "item"])
        assert not valid
        assert "Item and Rate are required" in err

    def test_qty_and_amount_come_together(self):
        # Qty without amount
        valid, err = validate_columns(["item", "rate", "qty"])
        assert not valid
        assert "Qty requires Amount" in err or "Amount requires Qty" in err

        # Amount without qty
        valid, err = validate_columns(["item", "rate", "amount"])
        assert not valid
        assert "Amount requires Qty" in err or "Qty requires Amount" in err

    def test_maximum_6_columns(self):
        valid, err = validate_columns(["no", "item", "qty", "unit", "rate", "discount", "amount"])
        assert not valid
        assert "At most 6 columns" in err

    def test_unknown_column_rejected(self):
        valid, err = validate_columns(["item", "rate", "custom_col"])
        assert not valid
        assert "Unknown column" in err

    def test_valid_setups(self):
        # Minimal: Item + Rate
        valid, err = validate_columns(["item", "rate"])
        assert valid
        assert err is None

        # No + Item + Rate
        valid, err = validate_columns(["no", "item", "rate"])
        assert valid
        assert err is None

        # Full V1: No + Item + Qty + Rate + Amount
        valid, err = validate_columns(["no", "item", "qty", "rate", "amount"])
        assert valid
        assert err is None

        # Item + Qty + Rate + Amount
        valid, err = validate_columns(["item", "qty", "rate", "amount"])
        assert valid
        assert err is None


class TestTotalColumnResolution:
    """BP 3.4 Rule 3: Total column is Amount if present, otherwise Rate."""

    def test_total_is_amount_when_present(self):
        assert resolve_total_column(["no", "item", "qty", "rate", "amount"]) == "amount"
        assert resolve_total_column(["item", "qty", "rate", "amount"]) == "amount"

    def test_total_is_rate_when_no_amount(self):
        assert resolve_total_column(["no", "item", "rate"]) == "rate"
        assert resolve_total_column(["item", "rate"]) == "rate"


class TestOrderColumns:
    """BP 3.4 Rule 4: Order strictly follows the registry."""

    def test_order_columns_sorts_by_registry(self):
        scrambled = ["amount", "rate", "no", "item", "qty"]
        ordered = order_columns(scrambled)
        assert ordered == ["no", "item", "qty", "rate", "amount"]

        scrambled2 = ["rate", "item"]
        ordered2 = order_columns(scrambled2)
        assert ordered2 == ["item", "rate"]


class TestPresetPydanticModels:
    def test_preset_create_valid(self):
        preset = PresetCreate(
            name="Standard",
            design_id="design1",
            columns=["no", "item", "qty", "rate", "amount"],
        )
        assert preset.columns == ["no", "item", "qty", "rate", "amount"]
        assert preset.design_id == "design1"

    def test_preset_create_invalid_columns_raises(self):
        with pytest.raises(ValueError, match="Item and Rate are required"):
            PresetCreate(
                name="Bad",
                design_id="design1",
                columns=["no", "item"],
            )

    def test_preset_create_normalizes_column_order(self):
        preset = PresetCreate(
            name="Scrambled",
            design_id="design1",
            columns=["amount", "rate", "item", "qty"],
        )
        assert preset.columns == ["item", "qty", "rate", "amount"]

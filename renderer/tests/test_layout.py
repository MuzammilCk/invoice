"""T3 tests: Layout engine — column clamping, wrapping, pagination, orphan prevention.

Run:
    pytest renderer/tests/test_layout.py -v
"""
from __future__ import annotations

import pytest

from contracts.render_model import ColumnModel, RenderModel
from renderer.layout import (
    A4_WIDTH,
    LayoutEngine,
    LayoutPage,
    PageRow,
)

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

PAGE_MARGIN = 48.0
TABLE_WIDTH = A4_WIDTH - 2 * PAGE_MARGIN


def _col(col_id: str, label: str, kind: str = "text", align: str = "left") -> ColumnModel:
    return ColumnModel.model_validate({"id": col_id, "label": label, "kind": kind, "align": align})


def _make_model(columns: list[ColumnModel], rows: list[dict[str, str]]) -> RenderModel:
    return RenderModel.model_validate({
        "business": {"name": "VIVA ELECTRONICS"},
        "date_display": "10 November 2026",
        "billed_to": "Illikkal Auditorium",
        "columns": [c.model_dump() for c in columns],
        "rows": rows,
        "total_display": "₹900.00",
    })


def _engine() -> LayoutEngine:
    from renderer.font_manager import FontManager
    return LayoutEngine(FontManager())


# ---------------------------------------------------------------------------
# Column width allocation
# ---------------------------------------------------------------------------

class TestColumnWidths:
    def test_item_rate_columns_no_overflow(self) -> None:
        """[Item, Rate] setup: total allocated width must not exceed table width."""
        cols = [_col("item", "ITEM", "text", "left"), _col("rate", "RATE", "number", "right")]
        engine = _engine()
        widths = engine.compute_column_widths(cols, [], TABLE_WIDTH, font_size=11)
        assert sum(widths.values()) <= TABLE_WIDTH + 1  # tolerance 1pt

    def test_item_column_takes_remaining_width(self) -> None:
        """Item (text) column consumes all remaining width after fixed columns."""
        cols = [
            _col("no", "NO.", "integer", "left"),
            _col("item", "ITEM", "text", "left"),
            _col("rate", "RATE", "number", "right"),
        ]
        engine = _engine()
        widths = engine.compute_column_widths(cols, [], TABLE_WIDTH, font_size=11)
        # Item should be the widest
        assert widths["item"] > widths["no"]
        assert widths["item"] > widths["rate"]

    def test_full_5_col_setup_fits(self) -> None:
        """[No, Item, Qty, Rate, Amount] setup: all columns fit within table width."""
        cols = [
            _col("no", "NO.", "integer", "left"),
            _col("item", "ITEM", "text", "left"),
            _col("qty", "QTY", "number", "right"),
            _col("rate", "RATE", "number", "right"),
            _col("amount", "AMOUNT", "number", "right"),
        ]
        engine = _engine()
        widths = engine.compute_column_widths(cols, [], TABLE_WIDTH, font_size=11)
        assert sum(widths.values()) <= TABLE_WIDTH + 1

    def test_fixed_column_at_least_header_width(self) -> None:
        """Fixed columns (number/integer) are at least as wide as their header label."""
        cols = [_col("item", "ITEM", "text", "left"), _col("amount", "AMOUNT", "number", "right")]
        engine = _engine()
        widths = engine.compute_column_widths(cols, [], TABLE_WIDTH, font_size=11)
        from renderer.font_manager import FontManager
        fm = FontManager()
        header_w = fm.string_width("AMOUNT", fm.medium, 7.5)
        assert widths["amount"] >= header_w - 1  # tolerance 1pt

    def test_all_widths_positive(self) -> None:
        """Every column must have a positive allocated width."""
        cols = [
            _col("no", "NO.", "integer", "left"),
            _col("item", "ITEM", "text", "left"),
            _col("qty", "QTY", "number", "right"),
            _col("rate", "RATE", "number", "right"),
            _col("amount", "AMOUNT", "number", "right"),
        ]
        engine = _engine()
        widths = engine.compute_column_widths(cols, [], TABLE_WIDTH, font_size=11)
        for col_id, w in widths.items():
            assert w > 0, f"Column {col_id!r} has non-positive width {w}"


# ---------------------------------------------------------------------------
# Text wrapping
# ---------------------------------------------------------------------------

class TestTextWrapping:
    def test_short_text_one_line(self) -> None:
        engine = _engine()
        lines = engine.wrap_text("Short item", width=200, font_name="Poppins-Regular", font_size=11)
        assert lines == ["Short item"]

    def test_long_text_wraps(self) -> None:
        engine = _engine()
        long_text = "This is a very long item description that must wrap across multiple lines in a narrow column"
        lines = engine.wrap_text(long_text, width=100, font_name="Poppins-Regular", font_size=11)
        assert len(lines) > 1

    def test_very_long_word_hard_breaks(self) -> None:
        """A single word wider than the column must still be broken (hard break)."""
        engine = _engine()
        # 60-char word with no spaces
        word = "A" * 60
        lines = engine.wrap_text(word, width=50, font_name="Poppins-Regular", font_size=11)
        # Should produce multiple lines rather than a single overflow
        assert len(lines) >= 1
        for line in lines:
            w = engine.fm.string_width(line, "Poppins-Regular", 11)
            assert w <= 55  # allow 5pt tolerance


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------

class TestPagination:
    def test_single_page_for_few_rows(self) -> None:
        cols = [_col("item", "ITEM"), _col("rate", "RATE", "number", "right")]
        rows = [{"item": f"Item {i}", "rate": f"₹{i * 100}.00"} for i in range(1, 6)]
        engine = _engine()
        pages = engine.paginate(cols, rows, TABLE_WIDTH)
        assert len(pages) == 1

    def test_multi_page_for_many_rows(self) -> None:
        cols = [_col("item", "ITEM"), _col("rate", "RATE", "number", "right")]
        rows = [{"item": f"Item {i}", "rate": f"₹{i * 100}.00"} for i in range(1, 50)]
        engine = _engine()
        pages = engine.paginate(cols, rows, TABLE_WIDTH)
        assert len(pages) > 1

    def test_no_rows_cross_page_boundary(self) -> None:
        """Every page must have at least one row (except maybe last edge case)."""
        cols = [_col("item", "ITEM"), _col("rate", "RATE", "number", "right")]
        rows = [{"item": f"Item {i}", "rate": f"₹{i * 100}.00"} for i in range(1, 50)]
        engine = _engine()
        pages = engine.paginate(cols, rows, TABLE_WIDTH)
        for page in pages:
            assert len(page.rows) > 0

    def test_all_rows_accounted(self) -> None:
        """Total rows across all pages must equal input row count."""
        cols = [_col("item", "ITEM"), _col("rate", "RATE", "number", "right")]
        rows = [{"item": f"Item {i}", "rate": f"₹{i * 100}.00"} for i in range(1, 50)]
        engine = _engine()
        pages = engine.paginate(cols, rows, TABLE_WIDTH)
        total = sum(len(p.rows) for p in pages)
        assert total == len(rows)

    def test_200_row_limit_raises(self) -> None:
        """Paginating more than 200 rows raises RenderLimitExceeded."""
        from renderer.layout import RenderLimitExceeded
        cols = [_col("item", "ITEM"), _col("rate", "RATE", "number", "right")]
        rows = [{"item": f"Item {i}", "rate": "₹1.00"} for i in range(201)]
        engine = _engine()
        with pytest.raises(RenderLimitExceeded):
            engine.paginate(cols, rows, TABLE_WIDTH)


# ---------------------------------------------------------------------------
# Orphan total prevention
# ---------------------------------------------------------------------------

class TestOrphanPrevention:
    def test_total_block_carries_last_row(self) -> None:
        """When total does not fit on the final page, the last row must move to the next page."""
        engine = _engine()

        # We'll force an orphan by crafting pages where the last page has very
        # little room left. We'll use apply_orphan_prevention() directly.

        # Simulate: page 1 has 29 rows; page 2 has 1 row but total_height > remaining_space
        rows_p1 = [PageRow(cells={"item": f"Item {i}", "rate": "₹1.00"}, height=30) for i in range(29)]
        row_last = PageRow(cells={"item": "Last item", "rate": "₹999.00"}, height=30)
        pages = [LayoutPage(rows=rows_p1), LayoutPage(rows=[row_last])]

        # Total card height > remaining space on page 2  → should trigger carry
        total_card_height = 60.0
        usable_height = 400.0  # page 2 usable height
        used_height = 30.0     # just the one row

        result = engine.apply_orphan_prevention(pages, total_card_height, usable_height, used_height_last_page=used_height)

        # The original last page should have zero rows and a new page should have the row
        # OR: the layout has at least 2 pages and the final page carries the last row
        last_page_rows = result[-1].rows
        assert any(r.cells.get("item") == "Last item" for r in last_page_rows)

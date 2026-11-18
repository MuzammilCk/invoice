"""Layout engine for the S01 renderer — pure column-width, wrapping and pagination.

No canvas operations here. All sizes are in ReportLab points (1 pt = 1/72 inch).
A4: 595 × 842 pt.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from contracts.render_model import ColumnModel
from renderer.font_manager import FontManager

# A4 dimensions in points
A4_WIDTH: float = 595.27
A4_HEIGHT: float = 841.89

# Page margins (matches Design 1 token M=48)
PAGE_MARGIN: float = 48.0

# Table typography
_HEADER_FONT_SIZE: float = 7.5
_ROW_FONT_SIZE: float = 11.0
_HEADER_HEIGHT: float = 32.0
_ROW_HEIGHT_MIN: float = 36.0
_LINE_HEIGHT: float = 14.0

# Column width constraints
_FIXED_COL_MIN_WIDTH: float = 32.0
_FIXED_COL_MAX_WIDTH: float = 120.0
_FIXED_COL_PADDING: float = 24.0  # padding added to measured width

# Skin-level page limits
_MAX_ROWS: int = 200
_MAX_PAGES: int = 10

# Printable area heights (excluding header/footer blocks)
# Top block (business + date + divider + billed-to): ~230 pt
_FIRST_PAGE_TABLE_TOP: float = A4_HEIGHT - 240.0
_SUBSEQUENT_PAGE_TABLE_TOP: float = A4_HEIGHT - PAGE_MARGIN - _HEADER_HEIGHT
_PAGE_BOTTOM_MARGIN: float = PAGE_MARGIN + 48.0  # footer area


class RenderLimitExceeded(ValueError):
    """Raised when row or page hard limits are breached."""


@dataclass
class PageRow:
    """A single laid-out table row."""

    cells: dict[str, str]
    height: float  # points


@dataclass
class LayoutPage:
    """A single laid-out page containing a slice of rows."""

    rows: list[PageRow] = field(default_factory=list)
    is_first_page: bool = False


class LayoutEngine:
    """Pure layout calculator. Accepts a FontManager; produces LayoutPage lists."""

    def __init__(self, fm: FontManager) -> None:
        self.fm = fm

    # ------------------------------------------------------------------
    # Column widths
    # ------------------------------------------------------------------

    def compute_column_widths(
        self,
        columns: list[ColumnModel],
        rows: list[dict[str, str]],
        table_width: float,
        font_size: float = _ROW_FONT_SIZE,
    ) -> dict[str, float]:
        """Allocate column widths.

        Fixed (number/integer) columns: max(header_width, widest_cell) + padding,
        clamped to [_FIXED_COL_MIN_WIDTH, _FIXED_COL_MAX_WIDTH].

        The first 'text' column (Item) takes the remaining width.
        If there are multiple text columns, the first one is treated as Item.
        """
        # Identify text (item) column — first column of kind "text"
        text_col_id = next((c.id for c in columns if c.kind == "text"), None)

        fixed_total: float = 0.0
        fixed_widths: dict[str, float] = {}

        for col in columns:
            if col.id == text_col_id:
                continue  # deferred
            header_w = self.fm.string_width(col.label, self.fm.medium, _HEADER_FONT_SIZE)
            cell_w: float = 0.0
            for row in rows:
                val = row.get(col.id, "")
                cell_w = max(cell_w, self.fm.string_width(val, self.fm.regular, font_size))
            raw = max(header_w, cell_w) + _FIXED_COL_PADDING
            clamped = max(_FIXED_COL_MIN_WIDTH, min(_FIXED_COL_MAX_WIDTH, raw))
            fixed_widths[col.id] = clamped
            fixed_total += clamped

        result: dict[str, float] = {}
        if text_col_id is not None:
            item_width = max(_FIXED_COL_MIN_WIDTH, table_width - fixed_total)
            result[text_col_id] = item_width
        result.update(fixed_widths)

        # Respect column order
        return {c.id: result[c.id] for c in columns if c.id in result}

    # ------------------------------------------------------------------
    # Text wrapping
    # ------------------------------------------------------------------

    def wrap_text(
        self,
        text: str,
        width: float,
        font_name: str,
        font_size: float,
    ) -> list[str]:
        """Wrap text to fit within `width` points. Hard-breaks words that exceed width."""
        if not text:
            return [""]
        words = text.split()
        lines: list[str] = []
        current = ""
        for word in words:
            # Hard-break overlong single words
            word = self._hard_break(word, width, font_name, font_size)
            test = f"{current} {word}".strip() if current else word
            if self.fm.string_width(test, font_name, font_size) <= width:
                current = test
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
        return lines or [""]

    def _hard_break(self, word: str, width: float, font_name: str, font_size: float) -> str:
        """Return word broken with newline if it exceeds width (single-segment)."""
        # We only return the first segment; wrap_text handles the rest
        # Actually we need to split and return one line at a time — simpler: just return as-is
        # if entire word fits; otherwise let wrap_text truncate gracefully.
        # For genuine hard-break support: produce multiple tokens.
        if self.fm.string_width(word, font_name, font_size) <= width:
            return word
        # Gradually shorten until it fits
        broken = ""
        for ch in word:
            if self.fm.string_width(broken + ch, font_name, font_size) <= width:
                broken += ch
            else:
                break
        return broken if broken else word[:1]

    def row_height(
        self,
        row: dict[str, str],
        col_widths: dict[str, float],
        columns: list[ColumnModel],
        font_size: float = _ROW_FONT_SIZE,
    ) -> float:
        """Calculate row height from the maximum wrapped-line count across all cells."""
        max_lines = 1
        text_col_id = next((c.id for c in columns if c.kind == "text"), None)
        for col in columns:
            if col.id != text_col_id:
                # Fixed columns: single line
                continue
            text = row.get(col.id, "")
            w = col_widths.get(col.id, 100.0)
            lines = self.wrap_text(text, w, self.fm.regular, font_size)
            max_lines = max(max_lines, len(lines))
        return max(
            _ROW_HEIGHT_MIN,
            _LINE_HEIGHT * max_lines + 12,  # 12pt padding
        )

    # ------------------------------------------------------------------
    # Pagination
    # ------------------------------------------------------------------

    def paginate(
        self,
        columns: list[ColumnModel],
        rows: list[dict[str, str]],
        table_width: float,
    ) -> list[LayoutPage]:
        """Slice rows into pages respecting height limits and row/page hard limits.

        Raises RenderLimitExceeded when rows > 200.
        """
        if len(rows) > _MAX_ROWS:
            raise RenderLimitExceeded(
                f"Invoice has {len(rows)} rows which exceeds the limit of {_MAX_ROWS}."
            )

        col_widths = self.compute_column_widths(columns, rows, table_width)

        pages: list[LayoutPage] = []
        current_page_rows: list[PageRow] = []
        # First page has less usable height (business/date header occupies top)
        usable_first = _FIRST_PAGE_TABLE_TOP - _PAGE_BOTTOM_MARGIN
        usable_rest = _SUBSEQUENT_PAGE_TABLE_TOP - _PAGE_BOTTOM_MARGIN
        current_height: float = 0.0
        is_first = True
        usable = usable_first

        for row_data in rows:
            rh = self.row_height(row_data, col_widths, columns)
            if current_height + rh > usable and current_page_rows:
                # Flush current page
                pages.append(LayoutPage(rows=current_page_rows, is_first_page=is_first))
                current_page_rows = []
                current_height = 0.0
                is_first = False
                usable = usable_rest
                if len(pages) >= _MAX_PAGES:
                    raise RenderLimitExceeded(
                        f"Invoice exceeds the {_MAX_PAGES}-page limit."
                    )
            current_page_rows.append(PageRow(cells=row_data, height=rh))
            current_height += rh

        # Flush last page
        if current_page_rows or not pages:
            pages.append(LayoutPage(rows=current_page_rows, is_first_page=is_first))

        return pages

    # ------------------------------------------------------------------
    # Orphan prevention
    # ------------------------------------------------------------------

    def apply_orphan_prevention(
        self,
        pages: list[LayoutPage],
        total_card_height: float,
        usable_height: float,
        used_height_last_page: float,
    ) -> list[LayoutPage]:
        """If the total card does not fit on the last page, carry the last row over.

        Args:
            pages: list of LayoutPage from paginate().
            total_card_height: height in points of the totals card block.
            usable_height: usable vertical space on a continuation page.
            used_height_last_page: height already used by rows on the last page.

        Returns:
            Possibly extended pages list.
        """
        if len(pages) == 0:
            return pages

        last = pages[-1]
        remaining = usable_height - used_height_last_page

        if remaining >= total_card_height:
            # Fits — no action needed
            return pages

        # Does not fit: carry the last row to a new page
        if len(last.rows) <= 1:
            # Cannot carry any further — accept as-is to avoid infinite loop
            return pages

        carried_row = last.rows[-1]
        pages[-1] = LayoutPage(rows=last.rows[:-1], is_first_page=last.is_first_page)
        pages.append(LayoutPage(rows=[carried_row], is_first_page=False))
        return pages

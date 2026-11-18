"""Reference skin: Design 1.

Ported from design/candidates/design-1.py.
Pure and token-driven; contains no hardcoded invoice data.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from renderer.layout import LayoutEngine
from renderer.skins.base import BaseSkin

if TYPE_CHECKING:
    from contracts.render_model import ColumnModel, RenderModel
    from renderer.font_manager import FontManager
    from renderer.layout import LayoutPage

# --- Colors ---
INK = HexColor("#111111")
GRAY = HexColor("#6B6B6B")
SOFT = HexColor("#A3A3A3")
LINE = HexColor("#E6E6E6")
WHITE = white

# --- Geometry Tokens ---
W, H = A4
M = 48.0  # margin
R = 8.0   # corner radius


class Design1Skin(BaseSkin):
    """Design 1 reference skin."""

    def __init__(self, fm: FontManager) -> None:
        super().__init__(fm)
        self.layout_engine = LayoutEngine(fm)

    @property
    def table_width(self) -> float:
        return W - 2 * M

    def render_document(
        self,
        c: canvas.Canvas,
        model: RenderModel,
        pages: list[LayoutPage],
    ) -> None:
        """Render all pages of the document."""
        col_widths = self.layout_engine.compute_column_widths(
            model.columns, model.rows, self.table_width
        )

        for page_idx, page in enumerate(pages):
            is_first = (page_idx == 0)
            is_last = (page_idx == len(pages) - 1)

            if is_first:
                self._render_first_page_header(c, model)
                top = H - 240.0
            else:
                top = H - M - 20.0

            # Render table header
            self._render_table_header(c, model.columns, col_widths, top)

            # Render page rows
            y = top - 32.0  # header height is 32
            y = self._render_rows(c, page, model.columns, col_widths, y)

            # If last page, render total block
            if is_last:
                self._render_total_block(c, model, col_widths, y)

            # Render footer on every page
            self._render_footer(c, model.footer)

            c.showPage()

    def _render_first_page_header(self, c: canvas.Canvas, model: RenderModel) -> None:
        """Render top business block, date, divider, and billed-to."""
        # Date top-right
        c.setFillColor(GRAY)
        self.spaced_text(
            c, W - M, H - 72.0, model.labels.date, self.fm.medium, 7.5, 1.4, align="right"
        )
        c.setFillColor(INK)
        c.setFont(self.fm.medium, 10.5)
        c.drawRightString(W - M, H - 92.0, model.date_display)

        # Business name top-left with fit rules
        max_name_width = (W - 2 * M) - 140.0  # leave room for date block
        name_lines, font_size = self.fit_business_name(model.business.name, max_name_width)
        c.setFillColor(INK)
        c.setFont(self.fm.bold, font_size)

        cur_y = H - 72.0
        line_step = font_size + 3.0
        for line in name_lines:
            c.drawString(M, cur_y, line)
            cur_y -= line_step

        # Business lines
        c.setFillColor(GRAY)
        c.setFont(self.fm.regular, 9.5)
        b_y = min(cur_y - 2.0, H - 92.0)
        for line in model.business.lines:
            c.drawString(M, b_y, line)
            b_y -= 14.0

        # Hairline divider
        c.setStrokeColor(LINE)
        c.setLineWidth(0.8)
        c.line(M, H - 128.0, W - M, H - 128.0)

        # Billed to
        c.setFillColor(GRAY)
        self.spaced_text(c, M, H - 168.0, model.labels.billed_to, self.fm.medium, 7.5, 1.4)
        c.setFillColor(INK)
        c.setFont(self.fm.medium, 14.0)
        c.drawString(M, H - 190.0, model.billed_to)

    def _render_table_header(
        self,
        c: canvas.Canvas,
        columns: list[ColumnModel],
        col_widths: dict[str, float],
        top: float,
    ) -> None:
        """Render the dark rounded rect header bar and column labels."""
        tx, tw = M, self.table_width
        hh = 32.0

        c.setFillColor(INK)
        c.roundRect(tx, top - hh, tw, hh, R, fill=1, stroke=0)

        c.setFillColor(WHITE)
        col_x = tx
        for col in columns:
            w = col_widths.get(col.id, 80.0)
            if col.align == "right":
                self.spaced_text(
                    c, col_x + w - 16.0, top - 20.0, col.label, self.fm.medium, 7.5, 1.4, align="right"
                )
            else:
                self.spaced_text(
                    c, col_x + 16.0, top - 20.0, col.label, self.fm.medium, 7.5, 1.4, align="left"
                )
            col_x += w

    def _render_rows(
        self,
        c: canvas.Canvas,
        page: LayoutPage,
        columns: list[ColumnModel],
        col_widths: dict[str, float],
        start_y: float,
    ) -> float:
        """Render rows on this page and return the final y position."""
        tx, tw = M, self.table_width
        y = start_y

        for row in page.rows:
            rh = row.height
            base = y - rh / 2.0 - 4.0

            col_x = tx
            for col in columns:
                w = col_widths.get(col.id, 80.0)
                raw_val = row.cells.get(col.id, "")
                val = self.fm.safe_currency(raw_val)

                if col.kind == "integer":
                    c.setFillColor(GRAY)
                    c.setFont(self.fm.regular, 10.0)
                    c.drawString(col_x + 16.0, base, val)
                elif col.kind == "text":
                    c.setFillColor(INK)
                    c.setFont(self.fm.medium, 11.0)
                    # Handle multiline text wrapping
                    lines = self.layout_engine.wrap_text(val, w - 24.0, self.fm.medium, 11.0)
                    if len(lines) > 1:
                        # Center block vertically in the row
                        total_text_h = len(lines) * 14.0
                        line_y = y - (rh - total_text_h) / 2.0 - 11.0
                        for line in lines:
                            c.drawString(col_x + 16.0, line_y, line)
                            line_y -= 14.0
                    else:
                        c.drawString(col_x + 16.0, base, val)
                else:  # number
                    c.setFillColor(INK)
                    c.setFont(self.fm.medium, 11.0)
                    if col.align == "right":
                        c.drawRightString(col_x + w - 16.0, base, val)
                    else:
                        c.drawString(col_x + 16.0, base, val)

                col_x += w

            y -= rh
            # Draw row separator line
            c.setStrokeColor(LINE)
            c.setLineWidth(0.8)
            c.line(tx, y, tx + tw, y)

        return y

    def _render_total_block(
        self,
        c: canvas.Canvas,
        model: RenderModel,
        col_widths: dict[str, float],
        table_bottom_y: float,
    ) -> None:
        """Render the dark rounded total card aligned with the last column."""
        tx, tw = M, self.table_width
        bw, bh = 248.0, 48.0
        bx = tx + tw - bw
        by = table_bottom_y - 24.0 - bh

        c.setFillColor(INK)
        c.roundRect(bx, by, bw, bh, R, fill=1, stroke=0)

        base = by + bh / 2.0 - 6.0
        c.setFillColor(SOFT)
        self.spaced_text(c, bx + 20.0, base, model.labels.total, self.fm.medium, 7.5, 1.4)

        # Right align value with the table's right padding
        c.setFillColor(WHITE)
        c.setFont(self.fm.bold, 18.0)
        total_text = self.fm.safe_currency(model.total_display)
        c.drawRightString(tx + tw - 16.0, base, total_text)

    def _render_footer(self, c: canvas.Canvas, footer_text: str) -> None:
        """Render hairline and footer text."""
        if not footer_text:
            return
        c.setStrokeColor(LINE)
        c.setLineWidth(0.8)
        c.line(M, 72.0, W - M, 72.0)

        c.setFillColor(GRAY)
        c.setFont(self.fm.regular, 8.5)
        c.drawCentredString(W / 2.0, 52.0, footer_text)

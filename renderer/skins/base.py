"""Base skin interface and shared rendering helpers."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas

if TYPE_CHECKING:
    from contracts.render_model import RenderModel
    from renderer.font_manager import FontManager
    from renderer.layout import LayoutPage


class BaseSkin(ABC):
    """Abstract base class for invoice skins."""

    def __init__(self, fm: FontManager) -> None:
        self.fm = fm

    @property
    @abstractmethod
    def table_width(self) -> float:
        """Usable table width in points."""

    def spaced_text(
        self,
        c: canvas.Canvas,
        x: float,
        y: float,
        text: str,
        font: str,
        size: float,
        space: float,
        align: str = "left",
    ) -> None:
        """Render text with character spacing."""
        if not text:
            return
        width = pdfmetrics.stringWidth(text, font, size) + space * len(text)
        if align == "right":
            x -= width
        t = c.beginText(x, y)
        t.setFont(font, size)
        t.setCharSpace(space)
        t.textOut(text)
        t.setCharSpace(0)
        c.drawText(t)

    def fit_business_name(
        self,
        name: str,
        max_width: float,
        max_size: float = 20.0,
        min_size: float = 14.0,
    ) -> tuple[list[str], float]:
        """Fit business name according to BP 7.4 rules:

        Shrink down to min_size, then wrap up to 2 lines, then truncate with ellipsis.
        """
        font = self.fm.bold
        name = " ".join(name.strip().split())

        # Step 1: Shrink font size on a single line
        size = max_size
        while size >= min_size:
            w = self.fm.string_width(name, font, size)
            if w <= max_width:
                return [name], size
            size -= 0.5

        # Step 2: At min_size, wrap to at most 2 lines
        words = name.split()
        line1 = ""
        line2 = ""
        idx = 0

        # Build line 1
        while idx < len(words):
            test = f"{line1} {words[idx]}".strip() if line1 else words[idx]
            if self.fm.string_width(test, font, min_size) <= max_width:
                line1 = test
                idx += 1
            else:
                break

        # If line1 couldn't fit even one word, force it
        if not line1 and words:
            line1 = words[0]
            idx = 1

        # Build line 2 with remaining words
        while idx < len(words):
            test = f"{line2} {words[idx]}".strip() if line2 else words[idx]
            if self.fm.string_width(test, font, min_size) <= max_width:
                line2 = test
                idx += 1
            else:
                break

        # If there are still words remaining, truncate line 2 with ellipsis
        if idx < len(words):
            # Needs ellipsis
            ellipsis = "..."
            target = f"{line2} {words[idx]}".strip() if line2 else words[idx]
            while target and self.fm.string_width(target + ellipsis, font, min_size) > max_width:
                target = target[:-1].rstrip()
            line2 = target + ellipsis
            return [line1, line2], min_size

        if line2:
            return [line1, line2], min_size
        return [line1], min_size

    @abstractmethod
    def render_document(
        self,
        c: canvas.Canvas,
        model: RenderModel,
        pages: list[LayoutPage],
    ) -> None:
        """Render the complete multi-page document to the canvas."""

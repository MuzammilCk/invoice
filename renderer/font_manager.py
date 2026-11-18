"""Font manager for the S01 renderer engine.

Registers Poppins TTFs (OFL-licensed) with ReportLab and provides:
- font name constants (regular, medium, bold)
- glyph coverage check for ₹ (U+20B9) with Rs. fallback
- string_width helper (thin wrapper around pdfmetrics)
"""
from __future__ import annotations

from pathlib import Path

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

RUPEE = "\u20b9"
_FALLBACK = "Rs."

_FONTS_DIR = Path(__file__).parent / "fonts"

# Logical font names used by the renderer and skins
_REGULAR = "Poppins-Regular"
_MEDIUM = "Poppins-Medium"
_BOLD = "Poppins-Bold"


class FontManager:
    """Registers Poppins fonts with ReportLab and exposes helper methods.

    Usage::

        fm = FontManager()          # call once at module level
        pdf_canvas.setFont(fm.bold, 20)
        currency = fm.safe_currency("₹")  # "₹" or "Rs."
    """

    regular: str = _REGULAR
    medium: str = _MEDIUM
    bold: str = _BOLD

    def __init__(self) -> None:
        self._register()
        self._has_rupee: bool = self.has_rupee_glyph()

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------

    def _register(self) -> None:
        """Register all three Poppins weights if not already registered."""
        for logical, filename in (
            (_REGULAR, "Poppins-Regular.ttf"),
            (_MEDIUM, "Poppins-Medium.ttf"),
            (_BOLD, "Poppins-Bold.ttf"),
        ):
            if logical not in pdfmetrics._fonts:
                font_path = _FONTS_DIR / filename
                if not font_path.is_file():
                    raise FileNotFoundError(
                        f"Required font not found: {font_path}. "
                        "Run 'make fonts' to download OFL-licensed Poppins TTFs."
                    )
                pdfmetrics.registerFont(TTFont(logical, str(font_path)))

    # ------------------------------------------------------------------
    # Glyph coverage
    # ------------------------------------------------------------------

    def has_rupee_glyph(self) -> bool:
        """Return True if Poppins-Regular contains U+20B9 (₹)."""
        # Ensure font is loaded before checking glyph via stringWidth
        pdfmetrics.getFont(_REGULAR)
        try:
            # stringWidth returns >0 if the glyph is present in the font
            w = pdfmetrics.stringWidth(RUPEE, _REGULAR, 12)
            return w > 0
        except Exception:  # noqa: BLE001
            return False

    def safe_currency(self, symbol: str) -> str:
        """Return symbol unchanged, or 'Rs.' if the ₹ glyph is not in the font."""
        if symbol == RUPEE and not self._has_rupee:
            return _FALLBACK
        return symbol

    # ------------------------------------------------------------------
    # Width helper
    # ------------------------------------------------------------------

    def string_width(self, text: str, font_name: str, font_size: float) -> float:
        """Return the width of text in points at the given font and size."""
        if not text:
            return 0.0
        return float(pdfmetrics.stringWidth(text, font_name, font_size))

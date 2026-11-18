"""T2 tests: Font bundling and glyph verification.

Run:
    pytest renderer/tests/test_fonts.py -v
"""
from __future__ import annotations

import pytest

from renderer.font_manager import RUPEE, FontManager


class TestFontManager:
    def test_fonts_are_bundled(self, font_manager: FontManager) -> None:
        """All three Poppins weights must exist as files."""
        from pathlib import Path

        fonts_dir = Path(__file__).parent.parent / "fonts"
        for name in ("Poppins-Regular.ttf", "Poppins-Medium.ttf", "Poppins-Bold.ttf"):
            assert (fonts_dir / name).is_file(), f"Missing font file: {name}"

    def test_registration_names(self, font_manager: FontManager) -> None:
        """After init, all three logical font names are registered with ReportLab."""
        from reportlab.pdfbase import pdfmetrics

        for name in (font_manager.regular, font_manager.medium, font_manager.bold):
            assert name in pdfmetrics._fonts, f"Font not registered: {name}"

    def test_rupee_glyph_present(self, font_manager: FontManager) -> None:
        """Poppins-Regular must contain the ₹ glyph (U+20B9)."""
        assert font_manager.has_rupee_glyph() is True

    def test_safe_currency_rupee_passthrough(self, font_manager: FontManager) -> None:
        """When ₹ glyph is present, safe_currency returns ₹."""
        result = font_manager.safe_currency("₹")
        assert result == "₹"

    def test_safe_currency_fallback(self, monkeypatch: pytest.MonkeyPatch, font_manager: FontManager) -> None:
        """When glyph is absent, safe_currency returns Rs. fallback."""
        monkeypatch.setattr(font_manager, "_has_rupee", False)
        result = font_manager.safe_currency("₹")
        assert result == "Rs."

    def test_safe_currency_non_rupee_unchanged(self, font_manager: FontManager) -> None:
        """Non-₹ currency strings are returned unchanged."""
        result = font_manager.safe_currency("$")
        assert result == "$"

    def test_rupee_constant(self) -> None:
        """RUPEE constant is the Unicode rupee sign."""
        assert RUPEE == "\u20b9"

    def test_string_width_callable(self, font_manager: FontManager) -> None:
        """string_width must return a positive float for non-empty text."""
        w = font_manager.string_width("ITEM", font_manager.medium, 10)
        assert isinstance(w, float)
        assert w > 0

    def test_string_width_empty(self, font_manager: FontManager) -> None:
        """Empty string width is 0."""
        w = font_manager.string_width("", font_manager.regular, 10)
        assert w == 0.0


@pytest.fixture(scope="module")
def font_manager() -> FontManager:
    return FontManager()

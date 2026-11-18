"""FakeRenderer — deterministic test double for the S01 renderer contract.

Downstream slices (S03, S04) use this when S01 is not yet DONE.
No ReportLab or PyMuPDF is imported here.
"""
from __future__ import annotations

# Minimal valid PDF header bytes (not a real PDF, but non-empty bytes).
_FAKE_PDF = b"%PDF-1.4\n%%EOF\n"

# 1×1 transparent PNG (67 bytes, public domain).
_FAKE_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
    b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


class FakeRenderer:
    """Implements the renderer interface without any real rendering.

    Usage::

        from contracts.fakes.renderer import FakeRenderer
        pdf_bytes, page_count = FakeRenderer.render(model)
        pages = FakeRenderer.previews(pdf_bytes)
    """

    @staticmethod
    def render(model: object, design_id: str = "design1") -> tuple[bytes, int]:
        """Return stub PDF bytes and a page count of 1."""
        return _FAKE_PDF, 1

    @staticmethod
    def previews(pdf_bytes: bytes, dpi: int = 110) -> list[bytes]:
        """Return a list containing one stub PNG page."""
        return [_FAKE_PNG]

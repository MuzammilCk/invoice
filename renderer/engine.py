"""Public rendering engine API for S01.

Provides pure functions:
- render(model, design_id="design1") -> tuple[bytes, int]
- previews(pdf_bytes, dpi=110) -> list[bytes]
"""
from __future__ import annotations

import io
from typing import TYPE_CHECKING

import pymupdf

from renderer.canvas import create_deterministic_canvas
from renderer.font_manager import FontManager
from renderer.layout import LayoutEngine, RenderLimitExceeded
from renderer.skins.design1 import Design1Skin

if TYPE_CHECKING:
    from contracts.render_model import RenderModel
    from renderer.skins.base import BaseSkin

# Shared font manager and skin registry
_FONT_MANAGER: FontManager | None = None


def _get_font_manager() -> FontManager:
    global _FONT_MANAGER
    if _FONT_MANAGER is None:
        _FONT_MANAGER = FontManager()
    return _FONT_MANAGER


def _get_skin(design_id: str, fm: FontManager) -> BaseSkin:
    if design_id == "design1":
        return Design1Skin(fm)
    raise ValueError(f"Unknown design '{design_id}'. Supported designs: ['design1']")


def render(model: RenderModel, design_id: str = "design1") -> tuple[bytes, int]:
    """Render a validated RenderModel into deterministic PDF bytes and page count.

    Args:
        model: Fully formatted RenderModel.
        design_id: Skin identifier (default: "design1").

    Returns:
        tuple[bytes, int]: (pdf_bytes, page_count).

    Raises:
        ValueError: If design_id is unrecognized.
        RenderLimitExceeded: If rows > 200 or page count > 10.
    """
    fm = _get_font_manager()
    skin = _get_skin(design_id, fm)
    layout = LayoutEngine(fm)

    # Paginate rows
    pages = layout.paginate(model.columns, model.rows, skin.table_width)
    page_count = len(pages)

    if page_count > 10:
        raise RenderLimitExceeded(f"Invoice requires {page_count} pages, which exceeds the limit of 10.")

    # Render to invariant canvas
    buf = io.BytesIO()
    c = create_deterministic_canvas(
        buf,
        title=f"Invoice - {model.billed_to}",
        author=model.business.name,
    )
    skin.render_document(c, model, pages)
    c.save()

    return buf.getvalue(), page_count


def previews(pdf_bytes: bytes, dpi: int = 110) -> list[bytes]:
    """Generate PNG preview images for all pages in the PDF at specified DPI.

    Args:
        pdf_bytes: PDF document binary content.
        dpi: Target resolution in dots per inch (default: 110).

    Returns:
        list[bytes]: PNG image byte strings, one per page.
    """
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    pages: list[bytes] = []
    for page_idx in range(len(doc)):
        page = doc[page_idx]
        pix = page.get_pixmap(dpi=dpi)
        pages.append(pix.tobytes(output="png"))
    return pages

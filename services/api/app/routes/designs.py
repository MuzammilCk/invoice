"""Designs endpoint (BP 8.1, 4.2)."""

import json
from pathlib import Path

from contracts.render_model import RenderModel
from fastapi import APIRouter, Response
from pydantic import BaseModel
from renderer import previews, render

from app.errors import error_json

router = APIRouter(prefix="/designs", tags=["designs"])

AVAILABLE_DESIGNS = [
    {
        "id": "design1",
        "name": "Design 1 (Reference)",
        "sample_preview_url": "/designs/design1/sample",
    }
]

# Cache for sample preview PNGs
_SAMPLE_CACHE: dict[str, bytes] = {}


def _get_sample_png(design_id: str) -> bytes | None:
    if design_id in _SAMPLE_CACHE:
        return _SAMPLE_CACHE[design_id]

    fixture_path = (
        Path(__file__).resolve().parents[4]
        / "renderer"
        / "fixtures"
        / "matrix_full_8.json"
    )
    if not fixture_path.is_file():
        return None

    try:
        data = json.loads(fixture_path.read_text())
        model = RenderModel.model_validate(data)
        pdf_bytes, _ = render(model, design_id=design_id)
        png_pages = previews(pdf_bytes, dpi=110)
        if png_pages:
            _SAMPLE_CACHE[design_id] = png_pages[0]
            return png_pages[0]
    except Exception:
        return None

    return None


class DesignItem(BaseModel):
    id: str
    name: str
    sample_preview_url: str


@router.get("", response_model=list[DesignItem])
def list_designs():
    """Return available designs with sample preview URLs."""
    return AVAILABLE_DESIGNS


@router.get("/{design_id}/sample")
def get_design_sample(design_id: str):
    """Return a PNG sample preview for the requested design."""
    if design_id not in [d["id"] for d in AVAILABLE_DESIGNS]:
        return error_json(404, "DESIGN_NOT_FOUND", f"Design '{design_id}' not found")

    png_bytes = _get_sample_png(design_id)
    if not png_bytes:
        return error_json(500, "RENDER_FAILED", "Failed to render sample preview")

    return Response(content=png_bytes, media_type="image/png")

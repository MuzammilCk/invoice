"""T5 tests: Public rendering engine and PyMuPDF preview pipeline.

Run:
    pytest renderer/tests/test_engine.py -v
"""
from __future__ import annotations

import hashlib

import pytest

from contracts.render_model import RenderModel
from renderer import RenderLimitExceeded, previews, render


def _sample_model(row_count: int = 2) -> RenderModel:
    rows = [
        {"no": f"{i:02d}", "item": f"Service item #{i}", "rate": f"₹{i * 100}.00"}
        for i in range(1, row_count + 1)
    ]
    return RenderModel.model_validate({
        "business": {"name": "VIVA ELECTRONICS", "lines": ["Kerala"], "phones": ["9995880059"]},
        "date_display": "10 November 2026",
        "billed_to": "Illikkal Auditorium",
        "labels": {"billed_to": "BILLED TO", "date": "DATE", "total": "TOTAL"},
        "columns": [
            {"id": "no", "label": "NO.", "kind": "integer", "align": "left"},
            {"id": "item", "label": "ITEM", "kind": "text", "align": "left"},
            {"id": "rate", "label": "PRICE", "kind": "number", "align": "right"},
        ],
        "rows": rows,
        "total_display": "₹300.00",
        "footer": "Thank you for your business.",
        "currency": "₹",
    })


class TestRenderEngine:
    def test_render_returns_bytes_and_page_count(self) -> None:
        model = _sample_model(row_count=2)
        pdf_bytes, page_count = render(model)
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert page_count == 1
        assert pdf_bytes.startswith(b"%PDF")

    def test_render_byte_determinism(self) -> None:
        """Calling render twice with identical model must yield byte-identical sha256."""
        model = _sample_model(row_count=5)
        pdf1, p1 = render(model)
        pdf2, p2 = render(model)

        assert p1 == p2
        h1 = hashlib.sha256(pdf1).hexdigest()
        h2 = hashlib.sha256(pdf2).hexdigest()
        assert h1 == h2

    def test_render_multi_page(self) -> None:
        model = _sample_model(row_count=40)
        pdf_bytes, page_count = render(model)
        assert page_count > 1
        assert len(pdf_bytes) > 0

    def test_unknown_design_raises_value_error(self) -> None:
        model = _sample_model()
        with pytest.raises(ValueError, match="Unknown design 'design_unknown'"):
            render(model, design_id="design_unknown")

    def test_row_limit_enforced(self) -> None:
        model = _sample_model(row_count=201)
        with pytest.raises(RenderLimitExceeded, match="limit of 200"):
            render(model)


class TestPreviews:
    def test_previews_returns_list_of_png_bytes(self) -> None:
        model = _sample_model(row_count=2)
        pdf_bytes, page_count = render(model)
        pages = previews(pdf_bytes, dpi=110)

        assert len(pages) == page_count
        for png in pages:
            assert isinstance(png, bytes)
            assert png[:8] == b"\x89PNG\r\n\x1a\n"

    def test_previews_multi_page(self) -> None:
        model = _sample_model(row_count=40)
        pdf_bytes, page_count = render(model)
        pages = previews(pdf_bytes, dpi=110)

        assert len(pages) == page_count
        assert len(pages) > 1
        for png in pages:
            assert png[:8] == b"\x89PNG\r\n\x1a\n"

    def test_previews_dpi_affects_size(self) -> None:
        model = _sample_model(row_count=2)
        pdf_bytes, _ = render(model)
        low_res = previews(pdf_bytes, dpi=72)
        high_res = previews(pdf_bytes, dpi=150)

        # High resolution image buffer should be larger
        assert len(high_res[0]) > len(low_res[0])

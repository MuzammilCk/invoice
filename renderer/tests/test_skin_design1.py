"""T4 tests: Reference skin (Design 1) and deterministic ReportLab canvas.

Run:
    pytest renderer/tests/test_skin_design1.py -v
"""
from __future__ import annotations

import io

import pymupdf

from contracts.render_model import RenderModel
from renderer.canvas import create_deterministic_canvas
from renderer.font_manager import FontManager
from renderer.layout import LayoutEngine
from renderer.skins.design1 import Design1Skin


def _sample_model(business_name: str = "VIVA ELECTRONICS") -> RenderModel:
    return RenderModel.model_validate({
        "business": {
            "name": business_name,
            "lines": ["Chettiyamkinar, Kottakkal, Malappuram, Kerala", "9995880059  ·  9633334786"],
            "phones": [],
        },
        "date_display": "10 November 2026",
        "billed_to": "Illikkal Auditorium",
        "labels": {"billed_to": "BILLED TO", "date": "DATE", "total": "TOTAL"},
        "columns": [
            {"id": "no", "label": "NO.", "kind": "integer", "align": "left"},
            {"id": "item", "label": "ITEM", "kind": "text", "align": "left"},
            {"id": "rate", "label": "PRICE", "kind": "number", "align": "right"},
        ],
        "rows": [
            {"no": "01", "item": "Sub Amp Servicing", "rate": "₹900.00"},
            {"no": "02", "item": "Speaker Repair & Re-cone", "rate": "₹1,250.00"},
        ],
        "total_display": "₹2,150.00",
        "footer": "Thank you for your business.",
        "currency": "₹",
    })


class TestCanvasDeterminism:
    def test_deterministic_canvas_produces_identical_bytes(self) -> None:
        buf1 = io.BytesIO()
        c1 = create_deterministic_canvas(buf1, title="Invoice")
        c1.drawString(100, 100, "Test Invariant")
        c1.showPage()
        c1.save()
        bytes1 = buf1.getvalue()

        buf2 = io.BytesIO()
        c2 = create_deterministic_canvas(buf2, title="Invoice")
        c2.drawString(100, 100, "Test Invariant")
        c2.showPage()
        c2.save()
        bytes2 = buf2.getvalue()

        assert bytes1 == bytes2
        assert len(bytes1) > 0


class TestBusinessNameFitRules:
    def test_short_name_single_line_at_max_font(self) -> None:
        fm = FontManager()
        skin = Design1Skin(fm)
        # Standard width ~ 300 pt available
        lines, size = skin.fit_business_name("VIVA ELECTRONICS", max_width=300.0)
        assert len(lines) == 1
        assert lines[0] == "VIVA ELECTRONICS"
        assert size == 20.0

    def test_medium_name_shrinks_font(self) -> None:
        fm = FontManager()
        skin = Design1Skin(fm)
        # Length that fits at 16pt (200pt) but not 20pt (250pt)
        name = "VIVA ELECTRONICS & CO."
        lines, size = skin.fit_business_name(name, max_width=220.0)
        assert len(lines) == 1
        assert 14.0 <= size < 20.0

    def test_long_name_wraps_to_two_lines(self) -> None:
        fm = FontManager()
        skin = Design1Skin(fm)
        name = "VIVA ELECTRONICS AND AUDIO SYSTEM INTEGRATION AND MAINTENANCE"
        lines, size = skin.fit_business_name(name, max_width=250.0)
        assert len(lines) == 2
        assert size == 14.0

    def test_extremely_long_name_truncates_with_ellipsis(self) -> None:
        fm = FontManager()
        skin = Design1Skin(fm)
        name = "VIVA ELECTRONICS " + "SUPER LONG BUSINESS NAME TEXT " * 5
        lines, size = skin.fit_business_name(name, max_width=250.0)
        assert len(lines) == 2
        assert lines[1].endswith("...")
        assert size == 14.0


class TestDesign1SkinRendering:
    def test_renders_single_page_pdf(self) -> None:
        fm = FontManager()
        skin = Design1Skin(fm)
        model = _sample_model()
        layout_engine = LayoutEngine(fm)

        buf = io.BytesIO()
        c = create_deterministic_canvas(buf, title=f"Invoice - {model.billed_to}")
        pages = layout_engine.paginate(model.columns, model.rows, skin.table_width)
        skin.render_document(c, model, pages)
        c.save()

        pdf_bytes = buf.getvalue()
        assert len(pdf_bytes) > 0

        # Validate with PyMuPDF
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        assert len(doc) == 1
        page = doc[0]
        text = page.get_text()
        assert "VIVA ELECTRONICS" in text
        assert "Illikkal Auditorium" in text
        assert "Sub Amp Servicing" in text
        assert "2,150.00" in text
        assert "Thank you for your business." in text

    def test_renders_multi_page_pdf_with_repeated_headers(self) -> None:
        fm = FontManager()
        skin = Design1Skin(fm)
        layout_engine = LayoutEngine(fm)

        # 40 rows forces multiple pages
        rows = [{"no": f"{i:02d}", "item": f"Servicing Unit #{i}", "rate": f"₹{i * 100}.00"} for i in range(1, 41)]
        model = RenderModel.model_validate({
            "business": {"name": "VIVA ELECTRONICS"},
            "date_display": "10 November 2026",
            "billed_to": "Illikkal Auditorium",
            "columns": [
                {"id": "no", "label": "NO.", "kind": "integer", "align": "left"},
                {"id": "item", "label": "ITEM", "kind": "text", "align": "left"},
                {"id": "rate", "label": "PRICE", "kind": "number", "align": "right"},
            ],
            "rows": rows,
            "total_display": "₹82,000.00",
            "footer": "Thank you for your business.",
            "currency": "₹",
        })

        buf = io.BytesIO()
        c = create_deterministic_canvas(buf, title=f"Invoice - {model.billed_to}")
        pages = layout_engine.paginate(model.columns, model.rows, skin.table_width)
        assert len(pages) > 1

        skin.render_document(c, model, pages)
        c.save()

        pdf_bytes = buf.getvalue()
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        assert len(doc) == len(pages)

        # Check table header repeats on second page (accounting for character spacing)
        page2_text = doc[1].get_text()
        assert "ITEM" in page2_text.replace(" ", "")
        assert "PRICE" in page2_text.replace(" ", "")

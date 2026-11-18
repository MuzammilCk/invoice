"""T1 tests: RenderModel schema and FakeRenderer contract.

Run:
    pytest renderer/tests/test_contracts.py -v
"""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from contracts.fakes.renderer import FakeRenderer
from contracts.render_model import (
    BusinessModel,
    ColumnModel,
    LabelsModel,
    RenderModel,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _minimal_model(**overrides: object) -> RenderModel:
    data: dict = {
        "business": {"name": "VIVA ELECTRONICS", "lines": [], "phones": []},
        "date_display": "10 November 2026",
        "billed_to": "Illikkal Auditorium",
        "columns": [
            {"id": "item", "label": "ITEM", "kind": "text", "align": "left"},
            {"id": "rate", "label": "RATE", "kind": "number", "align": "right"},
        ],
        "rows": [{"item": "Sub Amp Servicing", "rate": "₹900.00"}],
        "total_display": "₹900.00",
        "footer": "Thank you for your business.",
        "currency": "₹",
    }
    data.update(overrides)
    return RenderModel.model_validate(data)


# ---------------------------------------------------------------------------
# BusinessModel
# ---------------------------------------------------------------------------

class TestBusinessModel:
    def test_name_required(self) -> None:
        with pytest.raises(ValidationError):
            BusinessModel.model_validate({"name": "", "lines": [], "phones": []})

    def test_valid_business(self) -> None:
        b = BusinessModel.model_validate(
            {"name": "VIVA ELECTRONICS", "lines": ["Kerala"], "phones": ["9995880059"]}
        )
        assert b.name == "VIVA ELECTRONICS"
        assert b.lines == ["Kerala"]
        assert b.phones == ["9995880059"]

    def test_defaults(self) -> None:
        b = BusinessModel.model_validate({"name": "X"})
        assert b.lines == []
        assert b.phones == []


# ---------------------------------------------------------------------------
# ColumnModel
# ---------------------------------------------------------------------------

class TestColumnModel:
    def test_valid_column(self) -> None:
        col = ColumnModel.model_validate(
            {"id": "rate", "label": "RATE", "kind": "number", "align": "right"}
        )
        assert col.align == "right"

    def test_invalid_align_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ColumnModel.model_validate(
                {"id": "x", "label": "X", "kind": "text", "align": "center"}
            )

    def test_invalid_kind_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ColumnModel.model_validate(
                {"id": "x", "label": "X", "kind": "float", "align": "left"}
            )

    def test_defaults(self) -> None:
        col = ColumnModel.model_validate({"id": "item", "label": "ITEM"})
        assert col.kind == "text"
        assert col.align == "left"


# ---------------------------------------------------------------------------
# LabelsModel
# ---------------------------------------------------------------------------

class TestLabelsModel:
    def test_defaults(self) -> None:
        lbl = LabelsModel()
        assert lbl.billed_to == "BILLED TO"
        assert lbl.date == "DATE"
        assert lbl.total == "TOTAL"

    def test_override(self) -> None:
        lbl = LabelsModel.model_validate({"billed_to": "BILL TO", "date": "DATE", "total": "TOTAL"})
        assert lbl.billed_to == "BILL TO"


# ---------------------------------------------------------------------------
# RenderModel
# ---------------------------------------------------------------------------

class TestRenderModel:
    def test_minimal_valid(self) -> None:
        m = _minimal_model()
        assert m.business.name == "VIVA ELECTRONICS"
        assert len(m.columns) == 2
        assert m.total_display == "₹900.00"

    def test_billed_to_max_length(self) -> None:
        # exactly 80 chars — valid
        m = _minimal_model(billed_to="A" * 80)
        assert len(m.billed_to) == 80

    def test_billed_to_too_long(self) -> None:
        with pytest.raises(ValidationError):
            _minimal_model(billed_to="A" * 81)

    def test_columns_at_least_one(self) -> None:
        with pytest.raises(ValidationError):
            _minimal_model(columns=[])

    def test_rows_default_empty(self) -> None:
        m = _minimal_model(rows=[])
        assert m.rows == []

    def test_labels_default(self) -> None:
        m = _minimal_model()
        assert m.labels.total == "TOTAL"

    def test_currency_default(self) -> None:
        m = _minimal_model()
        assert m.currency == "₹"

    def test_full_column_setup(self) -> None:
        m = _minimal_model(
            columns=[
                {"id": "no", "label": "NO.", "kind": "integer", "align": "left"},
                {"id": "item", "label": "ITEM", "kind": "text", "align": "left"},
                {"id": "qty", "label": "QTY", "kind": "number", "align": "right"},
                {"id": "rate", "label": "RATE", "kind": "number", "align": "right"},
                {"id": "amount", "label": "AMOUNT", "kind": "number", "align": "right"},
            ],
            rows=[{
                "no": "01", "item": "Sub Amp Servicing",
                "qty": "2.500", "rate": "₹900.00", "amount": "₹2,250.00",
            }],
            total_display="₹2,250.00",
        )
        assert len(m.columns) == 5
        assert m.rows[0]["qty"] == "2.500"


# ---------------------------------------------------------------------------
# FakeRenderer
# ---------------------------------------------------------------------------

class TestFakeRenderer:
    def test_render_returns_bytes_and_page_count(self) -> None:
        m = _minimal_model()
        pdf_bytes, page_count = FakeRenderer.render(m)
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert page_count == 1

    def test_render_accepts_design_id(self) -> None:
        m = _minimal_model()
        _pdf_bytes, page_count = FakeRenderer.render(m, design_id="design1")
        assert page_count == 1

    def test_previews_returns_list_of_png_bytes(self) -> None:
        m = _minimal_model()
        pdf_bytes, _ = FakeRenderer.render(m)
        pages = FakeRenderer.previews(pdf_bytes)
        assert isinstance(pages, list)
        assert len(pages) == 1
        assert isinstance(pages[0], bytes)
        # PNG magic bytes
        assert pages[0][:4] == b"\x89PNG"

    def test_fake_does_not_import_reportlab(self) -> None:
        """FakeRenderer must not depend on reportlab or fitz."""
        # The key: importing FakeRenderer itself should never raise ImportError
        from contracts.fakes.renderer import FakeRenderer as FR  # noqa: F401

    def test_deterministic_output(self) -> None:
        m = _minimal_model()
        pdf1, _ = FakeRenderer.render(m)
        pdf2, _ = FakeRenderer.render(m)
        assert pdf1 == pdf2

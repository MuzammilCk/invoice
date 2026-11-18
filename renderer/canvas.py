"""Deterministic ReportLab canvas wrapper for S01 renderer."""
from __future__ import annotations

from typing import Any

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

FIXED_CREATION_DATE = "D:20261118000000Z"
PRODUCER_NAME = "Voice-to-Invoice S01 Invariant Engine"


def create_deterministic_canvas(
    target: Any,
    pagesize: tuple[float, float] = A4,
    title: str = "Invoice",
    author: str = "Voice-to-Invoice",
) -> canvas.Canvas:
    """Create a ReportLab Canvas configured for byte-deterministic output."""
    c = canvas.Canvas(target, pagesize=pagesize, invariant=1)
    c.setTitle(title)
    c.setAuthor(author)
    c.setSubject("Invoice")
    c.setCreator("Voice-to-Invoice")
    if hasattr(c, "_doc") and hasattr(c._doc, "info"):
        c._doc.info.producer = PRODUCER_NAME
        c._doc.info.creationDate = FIXED_CREATION_DATE
    return c

"""T6 tests: Golden matrix and stress baselines comparison.

Validates:
- 3 column setups x 3 sizes (1, 8, 40 rows)
- Stress cases (long business name, long item, long recipient, large amount, decimal qty, orphan total)
- Pixel mismatch < 0.1% against approved baselines
- Total text extraction match in PDF text
- 200-row limit boundary enforcement

Run:
    pytest renderer/tests/test_golden.py -v
"""
from __future__ import annotations

import io
import json
from pathlib import Path

import pymupdf
import pytest
from PIL import Image

from contracts.render_model import RenderModel
from renderer import RenderLimitExceeded, previews, render

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"
GOLDEN_DIR = Path(__file__).parent.parent / "golden"


def _pixel_diff_ratio(img1_bytes: bytes, img2_bytes: bytes) -> float:
    """Calculate the ratio of differing pixels between two PNG images."""
    im1 = Image.open(io.BytesIO(img1_bytes)).convert("RGB")
    im2 = Image.open(io.BytesIO(img2_bytes)).convert("RGB")

    if im1.size != im2.size:
        return 1.0

    pixels1 = list(im1.get_flattened_data())
    pixels2 = list(im2.get_flattened_data())

    diff_count = sum(1 for p1, p2 in zip(pixels1, pixels2) if p1 != p2)
    return diff_count / len(pixels1)


# List all standard fixtures (excluding limit tests)
STANDARD_FIXTURES = [
    p for p in sorted(FIXTURES_DIR.glob("*.json"))
    if "limit_200" not in p.name and "generate_fixtures" not in p.name
]


@pytest.mark.parametrize("fixture_path", STANDARD_FIXTURES, ids=lambda p: p.stem)
def test_golden_matrix_and_stress_fixtures(fixture_path: Path) -> None:
    data = json.loads(fixture_path.read_text())
    model = RenderModel.model_validate(data)

    # 1. Render PDF and previews
    pdf_bytes, page_count = render(model)
    png_pages = previews(pdf_bytes, dpi=110)

    assert len(png_pages) == page_count

    # 2. Compare against golden baseline images
    for idx, current_png in enumerate(png_pages, 1):
        baseline_file = GOLDEN_DIR / f"{fixture_path.stem}_p{idx}.png"
        assert baseline_file.is_file(), f"Missing golden baseline: {baseline_file.name}"

        baseline_bytes = baseline_file.read_bytes()
        diff_ratio = _pixel_diff_ratio(current_png, baseline_bytes)

        # Tolerance: strictly under 0.1% (0.001) pixel drift
        assert diff_ratio < 0.001, (
            f"Pixel difference {diff_ratio:.4%} exceeded 0.1% limit for {baseline_file.name}"
        )

    # 3. Assert extracted text contains total amount
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    all_text = " ".join(doc[i].get_text() for i in range(len(doc)))
    clean_text = all_text.replace(" ", "").replace("\n", "")

    # Compare stripped numeric value of total
    total_val = model.total_display.replace("₹", "").replace("Rs.", "").replace(" ", "").strip()
    assert total_val in clean_text, (
        f"Expected total '{total_val}' not found in extracted PDF text."
    )


def test_stress_limit_200_rows() -> None:
    """Documents breaching the 200-row limit or 10-page limit raise RenderLimitExceeded."""
    limit_fixture = FIXTURES_DIR / "stress_limit_200_rows.json"
    if not limit_fixture.is_file():
        pytest.skip("Limit fixture not found")

    data = json.loads(limit_fixture.read_text())
    model = RenderModel.model_validate(data)

    # 200 rows exceeds the 10-page limit and raises RenderLimitExceeded
    with pytest.raises(RenderLimitExceeded):
        render(model)

    # > 200 rows raises RenderLimitExceeded on row count
    over_limit = model.model_copy(deep=True)
    over_limit.rows.append(model.rows[0])
    with pytest.raises(RenderLimitExceeded, match="limit of 200"):
        render(over_limit)

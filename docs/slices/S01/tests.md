# S01: Renderer engine — Tests & Acceptance Criteria

## Acceptance Criteria

- **AC1: Pure Deterministic PDF Rendering (BP 7.1)**
  - *Given* a valid `RenderModel` instance and `design_id="design1"`,
  - *When* `render(model, "design1")` is called repeatedly with identical input,
  - *Then* it returns identical `pdf_bytes` (matching SHA-256 hash across executions) and integer `page_count >= 1`.

- **AC2: PNG Preview Generation (BP 7.1, 7.8)**
  - *Given* valid `pdf_bytes` produced by `render()`,
  - *When* `previews(pdf_bytes, dpi=110)` is invoked,
  - *Then* it returns a list of PNG image byte strings of length equal to `page_count`, rendered at 110 dpi.

- **AC3: Dynamic Column Width Clamping and Text Wrapping (BP 7.3)**
  - *Given* a `RenderModel` with fixed columns (`No`, `Rate`, `Qty`, `Amount`) and an `Item` column,
  - *When* column widths are calculated by the layout engine,
  - *Then* each fixed column width equals `max(header_width, max_cell_width) + padding` clamped to minimum/maximum limits, the `Item` column consumes the remaining width, and item text wraps based on measured string width.

- **AC4: Multi-Page Pagination and Repeating Header (BP 7.3)**
  - *Given* an invoice with rows whose heights exceed the printable height of a single page,
  - *When* rendered into PDF,
  - *Then* rows break cleanly across pages, no text crosses page margins, and the table header row is repeated at the top of every subsequent page.

- **AC5: Total Block Orphan Prevention (BP 7.3)**
  - *Given* an invoice where the table rows terminate near the bottom margin such that the total card does not fit on that page,
  - *When* rendered,
  - *Then* the total block is not placed alone on the next page; instead, the final table row is carried over to the next page along with the total block.

- **AC6: Business Name Fit Rules (BP 7.4)**
  - *Given* a business name of varying character lengths,
  - *When* rendered in the header,
  - *Then* standard names render at 20pt; longer names shrink down to 14pt minimum; longer names wrap up to 2 lines; and names exceeding 2 lines at 14pt truncate with an ellipsis (`...`).

- **AC7: Missing Glyph Fallback (BP 3.1, 7.6)**
  - *Given* text containing currency symbol `₹` (U+20B9),
  - *When* rendered using a font or environment lacking that glyph,
  - *Then* the engine safely substitutes `Rs.` without throwing font or encoding errors.

- **AC8: Hard Limits Enforcement (BP 7.3)**
  - *Given* a `RenderModel` with more than 200 rows or generating more than 10 pages,
  - *When* `render()` is called,
  - *Then* it raises a `RenderLimitExceeded` exception and aborts rendering.

- **AC9: Golden Matrix & Stress Pixel Fidelity (BP 7.7)**
  - *Given* the 9 matrix fixtures (3 column configurations x [1, 8, 40] rows) and stress fixtures,
  - *When* rendered and rasterized at 110 dpi,
  - *Then* pixel difference compared to approved golden baselines is strictly < 0.1%, and extracted text from the PDF matches the expected `total_display` string.

- **AC10: CLI Command Interface (BP 15)**
  - *Given* a valid `RenderModel` JSON file,
  - *When* `python -m renderer render sample.json --out invoice.pdf --preview` is executed,
  - *Then* it exits with code 0, outputs `invoice.pdf`, and generates preview PNG `invoice_page1.png`.

- **AC11: Render Latency Budget (BP 7.8, BP 15)**
  - *Given* standard invoice models (up to 40 rows),
  - *When* measured across 50 consecutive renders,
  - *Then* the 95th percentile (p95) execution time of `render()` is strictly under 500 ms.

- **AC12: FakeRenderer Compatibility (BP 15)**
  - *Given* dependent slices (S03, S04),
  - *When* `FakeRenderer.render(model)` and `FakeRenderer.previews(bytes)` are called,
  - *Then* they return reproducible mock PDF bytes and PNG bytes conforming to the contract without loading ReportLab.

---

## Test Matrix

| Acceptance Criteria | Unit Tests | Integration Tests | Golden / E2E Tests |
| --- | --- | --- | --- |
| AC1: Deterministic PDF | `test_canvas.py` | `test_engine.py` | `test_golden.py` |
| AC2: PNG Previews | `test_engine.py` | `test_engine.py` | `test_golden.py` |
| AC3: Column Clamping & Wrap | `test_layout.py` | `test_skin_design1.py` | `test_golden.py` |
| AC4: Pagination & Headers | `test_layout.py` | `test_skin_design1.py` | `test_golden.py` |
| AC5: Orphan Prevention | `test_layout.py` | `test_skin_design1.py` | `test_golden.py` |
| AC6: Business Name Fit | `test_skin_design1.py` | `test_skin_design1.py` | `test_golden.py` |
| AC7: Glyph Fallback | `test_fonts.py` | `test_engine.py` | `test_golden.py` |
| AC8: Hard Limits | `test_engine.py` | `test_engine.py` | — |
| AC9: Golden Matrix & Stress | — | — | `test_golden.py` |
| AC10: CLI Command | — | `test_cli.py` | `test_cli.py` |
| AC11: Latency Budget | — | — | `test_perf.py` |
| AC12: FakeRenderer | `test_contracts.py` | `test_contracts.py` | — |

---

## Fakes & Fixtures
- **Fakes**: `FakeRenderer` provided in `contracts/fakes/renderer.py` returning static valid PDF header bytes and a transparent 1x1 or stub PNG image.
- **Fixtures** in `renderer/fixtures/`:
  - `matrix_no_item_rate_1.json`, `matrix_no_item_rate_8.json`, `matrix_no_item_rate_40.json`
  - `matrix_item_rate_1.json`, `matrix_item_rate_8.json`, `matrix_item_rate_40.json`
  - `matrix_full_1.json`, `matrix_full_8.json`, `matrix_full_40.json`
  - `stress_long_business_name.json` (testing shrink/wrap/ellipsis)
  - `stress_long_item.json` (testing text wrap)
  - `stress_long_recipient.json` (testing 80-char recipient)
  - `stress_large_amount.json` (testing `1,23,45,678.50`)
  - `stress_decimal_qty.json` (testing `2.500`)
  - `stress_orphan_total.json` (table ending near page bottom carrying last row)
  - `stress_limit_200_rows.json` (boundary limit test)

---

## Edge Cases & Error States
- Business name longer than available header width at 14pt: wraps to 2 lines then truncates with ellipsis.
- Item name without spaces: forced character break when exceeding column width.
- Single item invoice: single-row table with total block placed directly beneath.
- Multi-page transition: ensure running totals / table headers repeat and page numbering is consistent.
- Exact boundary for orphan prevention: table ending at exactly height `H - margin - header_height - total_card_height`.
- Unknown `design_id`: raises `ValueError: Unknown design 'xyz'`.

---

## Performance Budgets
- Memory: < 50 MB RSS during render of 40-row invoice.
- Latency: p95 render time < 500 ms for invoices up to 40 rows.
- Baseline raster comparison tolerance: pixel drift < 0.1% across platforms.

---

## Demo Script
Follow these steps to demonstrate and verify S01:

1. **Render Column Setup 1 (`[No, Item, Rate]`)**:
   ```bash
   python -m renderer render renderer/fixtures/matrix_no_item_rate_8.json --out /tmp/demo_setup1.pdf --preview
   ```
   *Expected result*: Exits 0, `/tmp/demo_setup1.pdf` and `/tmp/demo_setup1_page1.png` created; PDF shows 3 columns with numbers right-aligned.

2. **Render Column Setup 2 (`[Item, Rate]`)**:
   ```bash
   python -m renderer render renderer/fixtures/matrix_item_rate_8.json --out /tmp/demo_setup2.pdf --preview
   ```
   *Expected result*: Exits 0, `/tmp/demo_setup2.pdf` created without `No` column; Item column expands to occupy left side.

3. **Render Column Setup 3 (`[No, Item, Qty, Rate, Amount]`)**:
   ```bash
   python -m renderer render renderer/fixtures/matrix_full_8.json --out /tmp/demo_setup3.pdf --preview
   ```
   *Expected result*: Exits 0, `/tmp/demo_setup3.pdf` created with all 5 columns styled with Design 1 header card and total card.

4. **Run Golden Matrix & Stress Suite**:
   ```bash
   pytest renderer/tests/test_golden.py
   ```
   *Expected result*: All 15 matrix and stress test cases pass with pixel difference strictly < 0.1% against baselines, and extracted total text matches fixture.

5. **Run Performance Benchmark**:
   ```bash
   pytest renderer/tests/test_perf.py
   ```
   *Expected result*: 50 benchmark iterations pass with p95 render latency under 500 ms.

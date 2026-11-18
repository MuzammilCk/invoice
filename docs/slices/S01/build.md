# S01: Renderer engine — Build Plan

## Branch & Baseline Commands
- Branch: `slice/S01-renderer-engine`
- Baseline check commands:
  - Lint: `ruff check renderer contracts`
  - Type check: `mypy renderer contracts`
  - Unit & Integration tests: `pytest renderer/tests`
  - Golden matrix: `pytest renderer/tests/test_golden.py`
  - Performance benchmark: `pytest renderer/tests/test_perf.py`

## Order Rationale
1. **Contracts & Fakes First (T1)**: Establish the `RenderModel` and `FakeRenderer` contracts immediately to unblock downstream slices (S03, S04) and ensure type safety.
2. **Fonts & Glyph Validation (T2)**: ReportLab layout requires exact font metrics and licensed glyph tables. Font management must be verified before layout calculations.
3. **Pure Layout Engine (T3)**: The column-clamping, line-wrapping, and pagination algorithms are mathematically distinct from rendering primitives; building them pure allows rigorous unit testing without canvas dependencies.
4. **Reference Skin & Deterministic Canvas (T4)**: Port Design 1 tokens and ReportLab invariant mode. Stop point here allows owner visual review before golden baselines are frozen.
5. **Public Engine & Previews (T5)**: Integrate layout, skin, and PyMuPDF preview pipeline with determinism and hard-limit checks.
6. **Golden Matrix & Stress Baselines (T6)**: Implement the complete 3x3 matrix and stress fixtures, lock baseline raster images, and verify sub-0.1% pixel drift.
7. **CLI & Performance (T7)**: Provide the `python -m renderer` command-line tool and prove p95 latency stays under 500 ms.

---

## Tasks

### T1: Contracts & FakeRenderer
- **Goal**: Define `RenderModel`, `ColumnModel`, `BusinessModel`, and `LabelsModel` Pydantic schemas, and implement `FakeRenderer` for use by dependent slices.
- **Files**:
  - `contracts/render_model.py`
  - `contracts/fakes/renderer.py`
  - `contracts/__init__.py`
  - `renderer/tests/test_contracts.py`
- **Tests First**: `renderer/tests/test_contracts.py` verifying schema parsing, required fields, constraints (e.g. alignment values), and `FakeRenderer` returning stub PDF/PNG bytes.
- **Steps**:
  1. Write tests for `RenderModel` serialization and `FakeRenderer`.
  2. Implement `RenderModel` and sub-models in `contracts/render_model.py`.
  3. Implement `FakeRenderer` conforming to the renderer interface in `contracts/fakes/renderer.py`.
- **Done Check**: `pytest renderer/tests/test_contracts.py` passes; `mypy contracts` passes.
- **Stop Point**: No.

### T2: Font Bundling & Glyph Verification
- **Goal**: Bundle licensed OFL Poppins TTF fonts, register with ReportLab, verify glyph coverage for ₹ (U+20B9) and Latin, and implement fallback to 'Rs.'.
- **Files**:
  - `renderer/fonts/Poppins-Regular.ttf`
  - `renderer/fonts/Poppins-Medium.ttf`
  - `renderer/fonts/Poppins-Bold.ttf`
  - `renderer/fonts/OFL.txt`
  - `renderer/font_manager.py`
  - `renderer/tests/test_fonts.py`
- **Tests First**: `renderer/tests/test_fonts.py` testing font registration, glyph presence checks, and ₹ fallback string transformation.
- **Steps**:
  1. Add licensed Poppins TTFs and license file to `renderer/fonts/`.
  2. Implement `FontManager` to register fonts with ReportLab's `pdfmetrics`.
  3. Implement build-time/init glyph checker and safe string normalizer (substituting 'Rs.' if U+20B9 is missing).
- **Done Check**: `pytest renderer/tests/test_fonts.py` passes; fonts register cleanly without missing-glyph exceptions.
- **Stop Point**: No.

### T3: Layout Engine & Pagination Math
- **Goal**: Implement pure layout calculation: dynamic column width clamping, text wrapping for Item, row height calculation, page breaking, repeating table headers, and orphan total block prevention.
- **Files**:
  - `renderer/layout.py`
  - `renderer/tests/test_layout.py`
- **Tests First**: `renderer/tests/test_layout.py` verifying column allocations across all 3 column setups, line wrapping of long text, multi-page row slicing, and carrying the last row to prevent orphaned totals.
- **Steps**:
  1. Write tests for column clamping: fixed columns take `max(header, cell) + min`, Item takes remainder.
  2. Write tests for orphan prevention: if total block does not fit on page, move last row to next page.
  3. Implement `LayoutEngine` producing structured page layout plans.
- **Done Check**: `pytest renderer/tests/test_layout.py` passes across all test configurations.
- **Stop Point**: No.

### T4: Reference Skin (Design 1) & ReportLab Canvas
- **Goal**: Port Design 1 tokens and visual treatment into `Design1Skin` with ReportLab invariant canvas and business name fit rules.
- **Files**:
  - `renderer/skins/base.py`
  - `renderer/skins/design1.py`
  - `renderer/canvas.py`
  - `renderer/tests/test_skin_design1.py`
- **Tests First**: `renderer/tests/test_skin_design1.py` testing business name fit rules (shrink -> wrap 2 lines -> ellipsis), header divider, table styling, total block, and invariant canvas creation.
- **Steps**:
  1. Define `Skin` abstract base class / protocol in `renderer/skins/base.py`.
  2. Implement `Design1Skin` adopting tokens from `design/candidates/design-1.py` without hardcoded data.
  3. Implement deterministic canvas wrapper in `renderer/canvas.py` with invariant metadata.
- **Done Check**: `pytest renderer/tests/test_skin_design1.py` passes; sample invoice PDF renders cleanly.
- **Stop Point**: **YES** (Owner stop point: inspect first rendered PDF visual output before locking golden baselines).

### T5: Public Renderer Pipeline & PyMuPDF Preview
- **Goal**: Connect layout engine, skin, and PyMuPDF into public `render()` and `previews()` functions with determinism and limit enforcement.
- **Files**:
  - `renderer/engine.py`
  - `renderer/__init__.py`
  - `renderer/tests/test_engine.py`
- **Tests First**: `renderer/tests/test_engine.py` testing `render()` output determinism (identical sha256), page count, `previews()` PNG output at 110 dpi, and rejection of > 200 rows or > 10 pages.
- **Steps**:
  1. Implement `render(model, design_id="design1") -> tuple[bytes, int]`.
  2. Implement `previews(pdf_bytes, dpi=110) -> list[bytes]`.
  3. Re-export public functions from `renderer/__init__.py`.
- **Done Check**: `pytest renderer/tests/test_engine.py` passes; two calls on identical models produce byte-identical PDFs.
- **Stop Point**: No.

### T6: Golden Test Matrix & Stress Baselines
- **Goal**: Create JSON fixtures for 3x3 matrix and stress cases, lock baseline raster images, and assert pixel difference < 0.1% alongside total text extraction.
- **Files**:
  - `renderer/fixtures/*.json`
  - `renderer/golden/*.png`
  - `renderer/tests/test_golden.py`
- **Tests First**: `renderer/tests/test_golden.py` with pixel comparison and PDF text extraction assertions.
- **Steps**:
  1. Build 9 matrix fixtures (3 column configurations x 1, 8, 40 rows).
  2. Build stress fixtures: long name, long item, long recipient, `1,23,45,678.50` amount, `2.500` qty, orphan total trigger.
  3. Generate and verify initial baseline images in `renderer/golden/`.
  4. Implement visual diff assertion checking pixel mismatch < 0.1% and text extraction assertion for total.
- **Done Check**: `pytest renderer/tests/test_golden.py` passes for all 15+ matrix and stress fixtures.
- **Stop Point**: No.

### T7: CLI & Performance Benchmarks
- **Goal**: Implement `python -m renderer render sample.json` CLI and assert p95 render time under 500 ms.
- **Files**:
  - `renderer/cli.py`
  - `renderer/__main__.py`
  - `renderer/tests/test_cli.py`
  - `renderer/tests/test_perf.py`
- **Tests First**: `renderer/tests/test_cli.py` and `renderer/tests/test_perf.py`.
- **Steps**:
  1. Implement CLI in `renderer/cli.py` with `render` command, `--out`, and `--preview` options.
  2. Implement `renderer/__main__.py` entry point.
  3. Implement performance test measuring 50 consecutive renders of standard invoices.
- **Done Check**: CLI generates PDF from fixture successfully; `pytest renderer/tests/test_perf.py` verifies p95 latency < 500 ms.
- **Stop Point**: No.

---

## Completion Checklist
- [ ] Acceptance criteria AC1 to AC12 in `tests.md` pass.
- [ ] Golden matrix tests pass with pixel diff < 0.1%.
- [ ] Extracted text assertions for invoice totals pass.
- [ ] All code in `renderer/` and `contracts/` passes `ruff check` and `mypy`.
- [ ] p95 render time is under 500 ms.
- [ ] No hardcoded business data or module-level invoice data exists in `renderer/`.
- [ ] Only files in `renderer/` and provided `contracts/` were touched.

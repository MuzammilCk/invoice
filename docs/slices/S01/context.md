# S01: Renderer engine — Context

## Goal
Transform any valid Render Model into a deterministic, high-fidelity PDF invoice and 110 dpi PNG preview images with pure functions, zero hardcoded business data, and under 500 ms p95 latency. Downstream slices (S03 Starting UI, S04 Invoice core) benefit from the rendering contract, preview pipeline, and fake renderer.

## Blueprint References
- BP 7.1 (Contract: `render`, `previews`, ReportLab invariant mode, PyMuPDF)
- BP 7.2 (Render model schema and fields)
- BP 7.3 (Layout engine: fixed column clamping, Item column text wrapping, pagination, repeating headers, orphan total prevention, hard limits)
- BP 7.4 (Skin interface: tokens, headers, rows, totals card, footer, business name fit rules)
- BP 7.5 (Port plan: remove module-level constants from candidate script, preserve reference skin tokens, isolate unported candidates)
- BP 7.6 (Fonts: OFL TTFs bundled in `renderer/fonts/`, glyph coverage check for ₹ and Latin, fallback to 'Rs.')
- BP 7.7 (Golden tests: 3 column setups x 3 row counts, stress cases, raster pixel diff < 0.1%, text assertions)
- BP 7.8 (Preview: PNG generation at 110 dpi, p95 latency under 500 ms)
- BP 3.1 (Formatting: Indian digit grouping, Latin script only, recipient <= 80 chars, item <= 120 chars)
- BP 15 (S01 catalog entry: Owns, Provides, Not in it, Demo, Done when)

## Distilled Requirements
- **Purity & Non-computation** (BP 7.1, Operating Rules): The renderer is pure and deterministic. It places pre-formatted text and never computes money totals, taxes, discounts, or dates.
- **Contract Interface** (BP 7.1):
  - `render(model: RenderModel, design_id: str = "design1") -> tuple[bytes, int]` returning PDF bytes and total page count. Uses ReportLab invariant mode with fixed metadata for deterministic byte output.
  - `previews(pdf_bytes: bytes, dpi: int = 110) -> list[bytes]` returning PNG bytes for each page via PyMuPDF.
- **Render Model** (BP 7.2):
  - `business`: `name` (str), `lines` (list[str]), `phones` (list[str]).
  - `date_display` (str), `billed_to` (str).
  - `labels`: `billed_to` (str), `date` (str), `total` (str).
  - `columns`: list of columns (`id`: str, `label`: str, `kind`: str, `align`: str ['left' | 'right']).
  - `rows`: list of mappings (`column_id` -> cell string).
  - `total_display` (str), `footer` (str), `currency` (str).
- **Text & Formatting Rules** (BP 3.1): Recipient up to 80 chars; item up to 120 chars; trimmed with whitespace collapsed; Latin script only; Indian digit grouping (e.g. `12,34,567.50`); fallback from `₹` to `Rs.` if font lacks glyph U+20B9.
- **Layout Engine** (BP 7.3):
  - Fixed columns take `max(header_width, max_cell_width) + padding`, clamped.
  - Item column consumes remaining table width and wraps text by measured string width.
  - Row height is derived from line-wrap count. Numeric columns right-align.
  - Page breaks occur when a row crosses the skin lower margin. Table header repeats on every page.
  - Total block orphan prevention: if the total block does not fit on the page, the last table row carries over to the next page alongside it.
  - Very long words hard-break. Limits: max 200 rows, max 10 pages.
- **Reference Skin (Design 1)** (BP 7.4, 7.5):
  - Port tokens from `design/candidates/design-1.py`: A4 size, 48pt margins, 8pt corner radius, ink `#111111`, gray `#6B6B6B`, soft `#A3A3A3`, line `#E6E6E6`, white `#FFFFFF`.
  - Header treatment: Business name shrinks to min font size (14pt), wraps up to 2 lines, then truncates with ellipsis.
- **Fonts** (BP 7.6): Bundle Poppins TTF files (Regular, Medium, Bold) under OFL in `renderer/fonts/`. Verify ₹ and Latin glyph coverage at build time.
- **Golden Matrix & Stress Cases** (BP 7.7):
  - 3 column setups: `[No, Item, Rate]`, `[Item, Rate]`, `[No, Item, Qty, Rate, Amount]`.
  - 3 row counts: 1, 8, 40 rows (9 base fixtures).
  - Stress fixtures: long business name, long item text, long recipient, large amount (`1,23,45,678.50`), decimal quantity (`2.500`), orphan total trigger.
  - Pixel difference < 0.1% against approved baselines; assert extracted total text.
- **CLI** (BP 15): `python -m renderer render sample.json [--out OUT.pdf] [--preview]`.

## Owns
- `renderer/` (layout engine, reference skin design 1, font manager, bundled fonts, fixtures, golden baselines, CLI, test suite).
- Provides contract files: `contracts/render_model.py`, `contracts/fakes/renderer.py` (or `renderer/fake.py`).

## Depends on
- Nothing (no preceding slice dependencies; pure library and CLI).

## Provides
- `render(model, design_id="design1") -> tuple[bytes, int]`
- `previews(pdf_bytes, dpi=110) -> list[bytes]`
- `RenderModel` and sub-models in `contracts/render_model.py`
- `FakeRenderer` in `contracts/fakes/renderer.py`

## Not in this Slice
- FastAPI HTTP endpoints (e.g. `/render`, `/invoices/{id}/pdf`) — part of S04.
- UI components, web viewer, or React state — part of S03/S04.
- Candidate designs 2, 3, 4, and 5 — unported candidate scripts stay in `design/candidates/`.
- Computation of money, taxes, totals, or date formatting from raw numbers (belongs to S04 domain/perception).

## Decisions
- Reference skin = Design 1 (simplest) (BP Decisions table, BP 15).
- Unported skins remain in `design/candidates/` until picked and ported (BP 7.5).
- Rupee glyph fallback: use 'Rs.' when U+20B9 is unavailable in font (BP 3.1).

## Risks and Unknowns
- **ReportLab Determinism**: Invariant mode must suppress dynamic timestamps and IDs to guarantee byte-level repeatability across test executions.
- **Font Bundling**: Poppins TTFs must be packaged directly in `renderer/fonts/` with proper glyph verification to avoid OS font dependency.
- **PyMuPDF Rendering Stability**: Raster image rendering across varied host environments must maintain sub-0.1% pixel drift against golden baselines.

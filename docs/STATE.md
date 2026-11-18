# State

## Slice board

| Slice | Title | Depends on | Status | Branch | Tag | Last verified |
| --- | --- | --- | --- | --- | --- | --- |
| S00 | Foundation | none | DONE | slice/S00-foundation | S00-done | 2026-11-18 |
| S01 | Renderer engine | none | DONE | slice/S01-renderer-engine | S01-done | 2026-11-18 |
| S02 | Perception kernel | none | BUILDING | slice/S02-perception-kernel | | |
| S03 | Starting UI | S00, S01 | NOT_STARTED | | | |
| S04 | Invoice core | S00, S01, S03 | NOT_STARTED | | | |
| S05 | Typed guided fill | S02, S03, S04 | NOT_STARTED | | | |
| S06 | Review and fix tools | S04, S05 | NOT_STARTED | | | |
| S07 | Finish and library | S04, S06 | NOT_STARTED | | | |
| S08 | STT bake-off | S02 | NOT_STARTED | | | |
| S09 | Voice fill | S05, S08 | NOT_STARTED | | | |
| S10 | Polish and pilot | all | NOT_STARTED | | | |

## Contracts

- `contracts/openapi.json`: v0.1.0 (`sha256:489151f4e86db915021dd8b74f0e55ee77eebdbd1554c14e38c4ea0b2ddfeb80`)
- `contracts/render_model.py`: v0.1.0 (`sha256:d57fa68fd54e3007848ce722bece926577b156331ff521a0da1efb2c8dcb1372`)
- `contracts/fakes/renderer.py`: v0.1.0 (`sha256:6eec860a39ae051a90a60241aa995d943d542a2ddcc6f0f60f7aa5f3314bf64d`)

## Decisions

| Decision | Placeholder | Blocks |
| --- | --- | --- |
| Your father's design pick | Reference skin = design 1 (simplest). The picked design is ported when known. | Pilot |
| LLM for the Normalizer | Rule-based cleanup behind a `Normalizer` interface. Pick by eval. | M3 |
| Hosting provider | Local Docker plus any one VM. | M0 deploy |
| 'Revised' mark on the customer's PDF | None. | Cosmetic |
| UI language | English, strings externalized. | Nothing |

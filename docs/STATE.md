# State

## Slice board

| Slice | Title | Depends on | Status | Branch | Tag | Last verified |
| --- | --- | --- | --- | --- | --- | --- |
| S00 | Foundation | none | APPROVED | slice/S00-foundation | | |
| S01 | Renderer engine | none | NOT_STARTED | | | |
| S02 | Perception kernel | none | NOT_STARTED | | | |
| S03 | Starting UI | S00, S01 | NOT_STARTED | | | |
| S04 | Invoice core | S00, S01, S03 | NOT_STARTED | | | |
| S05 | Typed guided fill | S02, S03, S04 | NOT_STARTED | | | |
| S06 | Review and fix tools | S04, S05 | NOT_STARTED | | | |
| S07 | Finish and library | S04, S06 | NOT_STARTED | | | |
| S08 | STT bake-off | S02 | NOT_STARTED | | | |
| S09 | Voice fill | S05, S08 | NOT_STARTED | | | |
| S10 | Polish and pilot | all | NOT_STARTED | | | |

## Contracts

(empty)

## Decisions

| Decision | Placeholder | Blocks |
| --- | --- | --- |
| Your father's design pick | Reference skin = design 1 (simplest). The picked design is ported when known. | Pilot |
| LLM for the Normalizer | Rule-based cleanup behind a `Normalizer` interface. Pick by eval. | M3 |
| Hosting provider | Local Docker plus any one VM. | M0 deploy |
| 'Revised' mark on the customer's PDF | None. | Cosmetic |
| UI language | English, strings externalized. | Nothing |

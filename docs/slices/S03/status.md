# S03: Starting UI — Status

## State
BUILDING

## Baseline Results
- Branch: `slice/S03-starting-ui`
- Backend: 182 passed (`pytest services/api/tests/ -v`), 82 passed (`renderer/tests/`), ruff clean
- Frontend: 22 passed (`vitest run`), clean TypeScript check (`tsc -b`), clean build (`vite build`)

## Task Checklist
- [x] T1: Column Registry & Preset Rules Contract (`contracts/columns.py`, `contracts/preset.py`, `contracts/__init__.py`) — `d8fce95`
- [x] T2: Backend Data Models & Migration (`services/api/app/models/business_profile.py`, `preset.py`, migration) — `bdb0660`
- [x] T3: Backend API Endpoints (`/columns`, `/presets`, `/designs`, `/settings`, `/setup`) — `da99daa`
- [x] T4: Frontend Contracts & Client Codegen (`contracts/openapi.json`, `apps/web/src/features/presets/columns.ts`) — `6abd762`
- [x] T5: DesignPicker & ColumnPicker Components (`DesignPicker.tsx`, `ColumnPicker.tsx`, `TableHeaderPreview.tsx`, `PresetChips.tsx`) [Stop Point: Owner visual review] — `9661686`
- [x] T6: First-Run Setup Wizard (`SetupWizard.tsx`, `/setup`) — `1242000`
- [x] T7: Home Screen Adaptation & Change Flows (`HomePage.tsx`, `/new/design`, `/new/columns`) — `4c5ab1e`
- [x] T8: Settings Screen (`SettingsPage.tsx`, `/settings`)
- [ ] T9: Accessibility, Responsive Polish & Verification (360/768/1280px, 44px targets, full demo script)

## Decisions Log
- D1: Pre-select `no`, `item`, `qty`, `rate`, `amount` as default columns in the first-run wizard (owner approved).
- D2: Provide a single atomic `POST /setup` endpoint to configure profile, preset, PIN, and session cookie (owner approved).
- D3: Route "Create invoice" to a clean draft-stub card ("Draft creation begins in S04") (owner approved).

## Deviations Log
(none)

## Questions Log
(none)

## Handoff
(To be filled at slice close)

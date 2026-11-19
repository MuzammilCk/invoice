# S03: Starting UI — Status

## State
READY_FOR_VERIFY

## Baseline Results
- Branch: `slice/S03-starting-ui`
- Backend: 182 passed (`pytest services/api/tests/ -v`), 82 passed (`renderer/tests/`), ruff clean
- Frontend: 30 passed (`npm --prefix apps/web test`), clean TypeScript check (`tsc -b`), clean build (`vite build`)

## Task Checklist
- [x] T1: Column Registry & Preset Rules Contract (`contracts/columns.py`, `contracts/preset.py`, `contracts/__init__.py`) — `d8fce95`
- [x] T2: Backend Data Models & Migration (`services/api/app/models/business_profile.py`, `preset.py`, migration) — `bdb0660`
- [x] T3: Backend API Endpoints (`/columns`, `/presets`, `/designs`, `/settings`, `/setup`) — `da99daa`
- [x] T4: Frontend Contracts & Client Codegen (`contracts/openapi.json`, `apps/web/src/features/presets/columns.ts`) — `6abd762`
- [x] T5: DesignPicker & ColumnPicker Components (`DesignPicker.tsx`, `ColumnPicker.tsx`, `TableHeaderPreview.tsx`, `PresetChips.tsx`) [Stop Point: Owner visual review] — `9661686`, `102668c`
- [x] T6: First-Run Setup Wizard (`SetupWizard.tsx`, `/setup`) — `1242000`
- [x] T7: Home Screen Adaptation & Change Flows (`HomePage.tsx`, `/new/design`, `/new/columns`) — `4c5ab1e`
- [x] T8: Settings Screen (`SettingsPage.tsx`, `/settings`) — `518644b`
- [x] T9: Accessibility, Responsive Polish & Verification (360/768/1280px, 44px targets, full demo script)

## Decisions Log
- D1: Pre-select `no`, `item`, `qty`, `rate`, `amount` as default columns in the first-run wizard (owner approved).
- D2: Provide a single atomic `POST /setup` endpoint to configure profile, preset, PIN, and session cookie (owner approved).
- D3: Route "Create invoice" to a clean draft-stub card ("Draft creation begins in S04") (owner approved).

## Deviations Log
(none)

## Questions Log
(none)

## Verification Evidence
1. Backend Unit/API Tests:
   Command: `/tmp/venv/bin/python3 -m pytest services/api/tests/ -v`
   Result: 182 passed in 2.99s.
2. Renderer Engine Tests:
   Command: `/tmp/venv/bin/python3 -m pytest renderer/tests/ -v`
   Result: 82 passed in 14.13s.
3. Python Linter:
   Command: `/tmp/venv/bin/ruff check services/api/app services/api/tests contracts renderer`
   Result: All checks passed!
4. Web Unit & Component Tests:
   Command: `npm --prefix apps/web test`
   Result: 8 test files passed, 30 tests passed in 4.21s.
5. Web Build:
   Command: `npm --prefix apps/web run build`
   Result: Built production bundle without errors.
6. A11y & Touch Target Audit:
   All buttons and interactive controls satisfy >= 44px minimum touch targets (`min-h-[44px]`, `h-11`, `h-12`). Form elements have explicit label associations with `htmlFor` and `id`. Responsive styling tested at 360px, 768px, and 1280px layouts.

## Handoff
- S03 implements the starting UI, column registry, presets, business profile, first-run wizard, and settings.
- Produces `contracts/columns.py`, `contracts/preset.py`, endpoints `/columns`, `/presets`, `/designs`, `/settings`, `/setup`, and UI pages `/setup`, `/`, `/settings`, `/new/design`, `/new/columns`, `/new/draft-stub`.
- Ready for S03 verification via `docs/agent/prompts/3-verify-slice.md`. S04 will build invoice core and draft creation.

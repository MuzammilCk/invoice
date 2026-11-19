# S03: Starting UI — Status

## State
PLANNED

## Baseline Results
- Branch: `slice/S03-starting-ui`
- Backend: S00 and S02 test suites passing
- Frontend: 6 passed (`npm --prefix apps/web test`), clean TypeScript check (`tsc --noEmit`), clean build (`npm --prefix apps/web run build`)

## Task Checklist
- [ ] T1: Column Registry & Preset Rules Contract (`contracts/columns.py`, `contracts/preset.py`, `contracts/__init__.py`)
- [ ] T2: Backend Data Models & Migration (`services/api/app/models/business_profile.py`, `preset.py`, migration)
- [ ] T3: Backend API Endpoints (`/columns`, `/presets`, `/designs`, `/settings`, `/setup`)
- [ ] T4: Frontend Contracts & Client Codegen (`contracts/openapi.json`, `apps/web/src/features/presets/columns.ts`)
- [ ] T5: DesignPicker & ColumnPicker Components (`DesignPicker.tsx`, `ColumnPicker.tsx`, `TableHeaderPreview.tsx`, `PresetChips.tsx`) [Stop Point: Owner visual review]
- [ ] T6: First-Run Setup Wizard (`SetupWizard.tsx`, `/setup`)
- [ ] T7: Home Screen Adaptation & Change Flows (`HomePage.tsx`, `/new/design`, `/new/columns`)
- [ ] T8: Settings Screen (`SettingsPage.tsx`, `/settings`)
- [ ] T9: Accessibility, Responsive Polish & Verification (360/768/1280px, 44px targets, full demo script)

## Decisions Log
(none)

## Deviations Log
(none)

## Questions Log
(none)

## Handoff
(To be filled at slice close)

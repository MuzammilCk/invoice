# S03: Starting UI — Status

## State
VERIFIED

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
### What S03 Provides

1. **Contracts**:
   - `contracts/columns.py`:
     - `COLUMN_REGISTRY`: Pool of 8 items (`no`, `item`, `qty`, `unit`, `rate`, `discount`, `tax`, `amount`).
     - `validate_columns(cols: list[str]) -> tuple[bool, str | None]`: Validates rules (Item and Rate required; Qty and Amount paired; max 6 columns).
     - `order_columns(cols: list[str]) -> list[str]`: Normalizes column order strictly following the registry order.
     - `resolve_total_column(cols: list[str]) -> str`: Returns `"amount"` if present, otherwise `"rate"`.
   - `contracts/preset.py`:
     - `PresetBase`, `PresetCreate`, `PresetUpdate`, `PresetModel` (with automatic column validation and ordering).
     - `BusinessProfileBase`, `BusinessProfileCreate`, `BusinessProfileUpdate`, `BusinessProfileModel`.
   - `contracts/openapi.json`: Exported OpenAPI 3.1.0 specification including all S03 schemas and endpoints.

2. **Endpoints (Services API)**:
   - `GET /columns`: Returns active V1 columns (or all columns if `?all=true`).
   - `GET /designs`: Returns available designs metadata.
   - `GET /designs/{id}/sample`: Returns PNG thumbnail preview rendered using S01 engine.
   - `GET /presets` & `POST /presets` & `PUT /presets/{id}`: CRUD for column & design presets.
   - `GET /settings` & `PUT /settings`: Workspace profile, PIN, and default preset inspection/update.
   - `POST /setup`: First-run atomic setup creating workspace, profile, default preset, and session.

3. **Frontend Routes & Components (`apps/web`)**:
   - `/setup`: `SetupPage` (4-step onboarding wizard for unconfigured workspaces).
   - `/`: `HomePage` (Empty state with "Create invoice" button, Settings link, and remembered preset chips).
   - `/settings`: `SettingsPage` (Profile details, PIN change, voice toggle, preset summary, sign-out).
   - `/new/design`: `NewDesignPage` (Allows changing the active preset design).
   - `/new/columns`: `NewColumnsPage` (Allows toggling invoice columns with live validation).
   - `/new/draft-stub`: `DraftStubPage` (Handoff target for "Create invoice" until S04).
   - Components in `apps/web/src/features/presets/`:
     - `ColumnPicker`: Interactive toggle cards for columns with inline rule validation.
     - `TableHeaderPreview`: Visual preview of the table header matching column choices.
     - `DesignPicker`: Visual selector for invoice design layouts with live image preview.
     - `PresetChips`: Displays active design and column badges with "[Change]" navigation links.

### How Downstream Slices (S04 Invoice Core) Use S03

```python
# In S04 when creating a new invoice draft from workspace's default preset:
from app.models.business_profile import BusinessProfile
from app.models.preset import Preset

profile = db.query(BusinessProfile).filter_by(workspace_id=workspace.id).first()
preset = db.query(Preset).filter_by(id=profile.default_preset_id).first()

# Initialize invoice columns from preset:
invoice_columns = preset.columns  # e.g. ["no", "item", "qty", "rate", "amount"]
design_id = preset.design_id      # e.g. "design1"
```

In the Web UI:
- S04 replaces the `/new/draft-stub` target with real draft creation (`POST /invoices`) and redirects to `/invoices/{id}`.

### Environment Variables
- `INVOICE_DB_PATH`: Path to SQLite database (default: `data/invoice.db`).

### Known Limits & Deferred Items
- Voice capture & audio recording: Deferred to S09 (toggle is stored in profile).
- Invoice draft creation & lifecycle: Deferred to S04.
- In-memory session store: Backend process restarts require re-login via PIN.

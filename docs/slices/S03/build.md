# S03: Starting UI — Build Plan

## Branch & Baseline
- Branch: `slice/S03-starting-ui`
- Baseline commands:
  - Backend: `ruff check services/api contracts`, `pytest services/api/tests/ -v`
  - Frontend: `npm --prefix apps/web test`, `npm --prefix apps/web run build`

## Order Rationale
Start with the shared domain logic and validation rules in contracts (T1), which anchor all server and client constraints. Next, implement the database models, migrations, and backend endpoints (T2, T3) so that client codegen and frontend components (T4, T5) build on real typed schemas. Once pickers are visually verified at a stop point, build the first-run wizard (T6), Home screen (T7), and Settings page (T8), concluding with responsive/a11y polish and demo validation (T9).

## Tasks

### T1: Column Registry & Preset Rules Contract
- **Goal**: Define the column registry pool (8 items), preset schema, and validation rules (Item & Rate required; Qty & Amount paired; max 6 columns; registry order; total column rule).
- **Files**:
  - `contracts/columns.py`
  - `contracts/preset.py`
  - `contracts/__init__.py`
- **Tests first**:
  - `services/api/tests/test_columns.py` (unit tests verifying all 6 preset rules, total column resolution, invalid combinations).
- **Steps**:
  1. Define `ColumnRegistryItem` and the 8 pool column descriptors with V1 flags.
  2. Implement `validate_columns(column_ids: list[str]) -> tuple[bool, str | None]` enforcing BP 3.4 rules.
  3. Define `PresetModel`, `PresetCreate`, and `PresetUpdate` Pydantic models.
  4. Export contracts in `contracts/__init__.py`.
- **Done check**: `pytest services/api/tests/test_columns.py -v` passes all validation cases.
- **Stop point**: No.

### T2: Backend Data Models & Migration
- **Goal**: Create `BusinessProfile` and `Preset` SQLAlchemy models and write an Alembic migration.
- **Files**:
  - `services/api/app/models/business_profile.py`
  - `services/api/app/models/preset.py`
  - `services/api/app/models/__init__.py`
  - `services/api/alembic/versions/*_business_profile_and_preset.py`
- **Tests first**:
  - `services/api/tests/test_models_s03.py` (table creation, default values, workspace foreign key, preset relationship).
- **Steps**:
  1. Write `BusinessProfile` model: `workspace_id`, `name`, `address_lines` (JSON), `phones` (JSON), `footer`, `currency`, `date_format`, `default_preset_id`, `pin_hash`, `help_improve_voice`, timestamps.
  2. Write `Preset` model: `id`, `workspace_id`, `name`, `design_id`, `columns` (JSON), `labels` (JSON), `archived`, timestamps.
  3. Generate and verify Alembic migration script.
- **Done check**: Migration upgrades and downgrades cleanly against SQLite test database.
- **Stop point**: No.

### T3: Backend API Endpoints
- **Goal**: Implement routes for `/columns`, `/presets`, `/designs`, `/settings`, and `/setup`.
- **Files**:
  - `services/api/app/routes/columns.py`
  - `services/api/app/routes/presets.py`
  - `services/api/app/routes/designs.py`
  - `services/api/app/routes/settings.py`
  - `services/api/app/routes/setup.py`
  - `services/api/app/main.py`
- **Tests first**:
  - `services/api/tests/test_settings_api.py`
  - `services/api/tests/test_presets_api.py`
  - `services/api/tests/test_designs_api.py`
- **Steps**:
  1. `GET /columns`: return pool items with V1 filter flag.
  2. `GET /presets`, `POST /presets`, `PUT /presets/{id}`: validate preset columns against BP 3.4 rules.
  3. `GET /designs`: return available designs (`design1`) with sample preview URLs; `GET /designs/{id}/sample` serves thumbnail PNG rendered via S01 renderer.
  4. `GET /settings`, `PUT /settings`: fetch and update business profile, PIN, and voice toggle.
  5. `POST /setup`: atomic first-run setup endpoint (profile, design, columns, PIN) that sets auth session cookie.
  6. Register routers in `services/api/app/main.py`.
- **Done check**: API test suite passes with full status code coverage (200, 400 validation error, 401 unauthorized).
- **Stop point**: No.

### T4: Frontend Contracts & Client Codegen
- **Goal**: Export OpenAPI specification and regenerate TypeScript types and client helper for new endpoints.
- **Files**:
  - `contracts/openapi.json`
  - `apps/web/src/api/generated/schema.ts`
  - `apps/web/src/features/presets/columns.ts` (shared TS validation matching server rules)
- **Tests first**:
  - `apps/web/src/features/presets/__tests__/columns.test.ts` (TS rule validation tests matching Python tests).
- **Steps**:
  1. Re-export `contracts/openapi.json` from FastAPI app.
  2. Run `npm run codegen` in `apps/web`.
  3. Implement client-side column validation in `columns.ts` mirroring `contracts/columns.py`.
- **Done check**: Vitest passes TS column validation tests; `tsc --noEmit` clean.
- **Stop point**: No.

### T5: DesignPicker & ColumnPicker Components
- **Goal**: Implement `DesignPicker` with sample thumbnail cards and `ColumnPicker` with pool toggles, inline error messages, and live table header preview.
- **Files**:
  - `apps/web/src/features/presets/DesignPicker.tsx`
  - `apps/web/src/features/presets/ColumnPicker.tsx`
  - `apps/web/src/features/presets/TableHeaderPreview.tsx`
  - `apps/web/src/features/presets/PresetChips.tsx`
- **Tests first**:
  - `apps/web/src/features/presets/__tests__/DesignPicker.test.tsx`
  - `apps/web/src/features/presets/__tests__/ColumnPicker.test.tsx`
- **Steps**:
  1. Build `DesignPicker` showing design cards with thumbnail image and selection state.
  2. Build `ColumnPicker` with toggle controls for visible pool columns (No, Item, Qty, Rate, Amount).
  3. Display inline error callout whenever toggles violate preset rules (e.g. "Amount requires Qty and Rate").
  4. Render live `TableHeaderPreview` showing columns in registry order.
  5. Build `PresetChips` displaying "Using Design X" [Change] and "Columns: ..." [Change].
- **Done check**: Component tests pass; keyboard navigation and 44 px targets verified.
- **Stop point**: Yes (Owner visual check of DesignPicker and ColumnPicker interactions).

### T6: First-Run Setup Wizard
- **Goal**: Build `/setup` multi-step wizard (Profile -> Design -> Columns -> PIN) with 90-day voice disclosure copy.
- **Files**:
  - `apps/web/src/features/setup/SetupWizard.tsx`
  - `apps/web/src/pages/SetupPage.tsx`
  - `apps/web/src/router.tsx`
- **Tests first**:
  - `apps/web/src/pages/__tests__/SetupPage.test.tsx`
- **Steps**:
  1. Create step indicator and containers for Profile, Design, Columns, and PIN steps.
  2. Implement Step 1: Business name (required), address lines (max 4), phones (max 3), footer.
  3. Implement Step 2: Design selection using `DesignPicker`.
  4. Implement Step 3: Column selection using `ColumnPicker` with preselected defaults.
  5. Implement Step 4: PIN setup with confirmation, voice toggle, and 90-day disclosure copy.
  6. Submit to `/setup` and redirect to Home on success.
- **Done check**: Vitest integration test completes full 4-step wizard and triggers redirect.
- **Stop point**: No.

### T7: Home Screen Adaptation & Change Flows
- **Goal**: Adapt Home screen with remembered preset chips, settings gear, and wire "Create invoice" and Change flows.
- **Files**:
  - `apps/web/src/pages/HomePage.tsx`
  - `apps/web/src/pages/NewDesignPage.tsx`
  - `apps/web/src/pages/NewColumnsPage.tsx`
  - `apps/web/src/router.tsx`
- **Tests first**:
  - `apps/web/src/pages/__tests__/HomePage.test.tsx` (updated for chips and navigation).
  - `apps/web/src/pages/__tests__/NewPresetPages.test.tsx`
- **Steps**:
  1. Update `HomePage.tsx` to fetch settings and active preset.
  2. Render header with business name and settings gear icon linking to `/settings`.
  3. Render preset chips: "Using Design 1" [Change] and "Columns: No., Item, Qty, Rate, Amount" [Change].
  4. Tapping "Change" navigates to `/new/design` or `/new/columns` to update the preset.
  5. "Create invoice" button navigates forward to create-draft stub route (`/new/draft-stub`).
- **Done check**: Tests verify Home renders chips, change links route correctly, and empty state invites first invoice.
- **Stop point**: No.

### T8: Settings Screen
- **Goal**: Build `/settings` page for managing business profile, PIN, voice retention, and sign out.
- **Files**:
  - `apps/web/src/pages/SettingsPage.tsx`
  - `apps/web/src/router.tsx`
- **Tests first**:
  - `apps/web/src/pages/__tests__/SettingsPage.test.tsx`
- **Steps**:
  1. Load existing business profile into editable form.
  2. Allow updating business details (name, address lines, phones, footer, currency, date format).
  3. Allow PIN change with current/new verification.
  4. Provide toggle for "Help improve voice" with disclosure copy.
  5. Display current preset chips with Change links.
  6. Sign out button triggering logout and redirect to `/login`.
- **Done check**: Settings page test verifies profile updates, validation, and sign out.
- **Stop point**: No.

### T9: Accessibility, Responsive Polish & Verification
- **Goal**: Verify responsive layout at 360, 768, 1280 px, enforce 44 px touch targets, and run complete demo script.
- **Files**:
  - `apps/web/src/index.css`
  - Minor layout adjustments in `apps/web/src/pages/`
- **Tests first**:
  - Verify all acceptance criteria in `tests.md` pass.
- **Steps**:
  1. Audit touch targets (>= 44 px) and screen reader labels across all S03 pages.
  2. Verify phone (360px), tablet (768px), and desktop (1280px) viewport rendering.
  3. Execute automated test suite across backend and frontend.
  4. Walk through demo script from `tests.md`.
- **Done check**: Lint, typecheck, and all test suites green; demo script executes cleanly.
- **Stop point**: No.

## Completion Checklist
- [ ] Database migration runs cleanly on SQLite.
- [ ] Backend API endpoints pass unit and integration tests.
- [ ] Client validation mirrors backend rules exactly.
- [ ] DesignPicker and ColumnPicker tested for all rule combinations.
- [ ] First-run wizard takes user from clean slate to Home in < 3 minutes.
- [ ] Home displays remembered chips with functioning Change workflows.
- [ ] Settings page updates profile, voice toggle, and PIN.
- [ ] Touch targets >= 44 px, ARIA labels present, tested at 360/768/1280 px.
- [ ] No files modified outside Owns list.

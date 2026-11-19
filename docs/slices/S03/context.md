# S03: Starting UI — Context

## Goal
The owner opens the app, completes first-run setup (business profile, design, columns, PIN) and reaches Home, where "Create invoice" leads through remembered Design and Columns pickers with live validation.

## Blueprint References
- BP 3.1: Number, money, text, date and display rules
- BP 3.2: Entities (BusinessProfile, Preset)
- BP 3.3: Column registry pool and attributes
- BP 3.4: Preset rules (server and client validation)
- BP 4.1: Home screen (empty state, Create invoice, settings gear, remembered preset chips)
- BP 4.2: Design screen (sample thumbnails from renderer, one-tap pick, Change chip)
- BP 4.3: Columns screen (pool toggles, inline rule messages, live header preview, Change chip)
- BP 4.8: Settings screen (profile, design & columns, PIN change, voice retention toggle, sign out)
- BP 4.9: First run setup (/setup wizard: Profile, Design, Columns, PIN, 90-day voice copy)
- BP 8.1: API routes (/settings, /designs, /columns, /presets)
- BP 8.2 & 8.4: Error conventions, Decimal formatting, JSON, auth cookie security
- BP 9.1 to 9.6: Frontend structure, key components, responsive layout, copy conventions
- BP 15: S03 catalog specification

## Distilled Requirements
- **BusinessProfile** (BP 3.2):
  - Fields: `name` (string, required, max 200), `address_lines` (list of strings, max 4 lines), `phones` (list of strings, max 3), `footer` (string, optional), `currency` (string, default "₹"), `date_format` (string, default "DD MMMM YYYY"), `default_preset_id` (string uuid, optional FK to Preset), `pin_hash` (string), `help_improve_voice` (bool, default true).
- **Preset** (BP 3.2, 3.4):
  - Fields: `id` (string uuid), `name` (string, default "Default"), `design_id` (string, default "design1"), `columns` (ordered list of column IDs), `labels` (dict overrides for billed_to, date, total), `archived` (bool, default false).
- **Column Registry** (BP 3.3):
  - 8 columns: `no` (No., serial, auto, fixed narrow, center, on), `item` (Item, text, voice, flexible wraps, left, on), `qty` (Qty, number, voice default 1, fixed, right, on), `unit` (Unit, text, voice/default, fixed, left, off), `rate` (Rate, money, voice, fixed, right, on), `discount` (Disc %, percent, voice, fixed, right, off), `tax` (Tax %, percent, voice, fixed, right, off), `amount` (Amount, money, computed, fixed, right, on).
  - V1 off columns (`unit`, `discount`, `tax`) are hidden in the picker.
- **Preset Rules** (BP 3.4):
  1. `item` and `rate` are required.
  2. `qty` and `amount` come together: `amount` requires `qty` and `rate`, and `qty` requires `amount`.
  3. Total column is `amount` if present, otherwise `rate`.
  4. At most 6 columns. Order follows the registry strictly (users toggle, never reorder).
  5. Off columns stay hidden in version 1.
- **First Run Setup** (BP 4.9):
  - Wizard steps: 1. Business Profile, 2. Design, 3. Columns, 4. PIN, then redirect to Home (`/`).
  - Required disclosure copy: "Voice clips are kept for 90 days to improve recognition and can be switched off."
- **Home Screen** (BP 4.1):
  - Empty state when no invoices exist: "No invoices yet", "Create your first invoice to get started."
  - Primary button: "Create invoice".
  - If preset exists, display chips: "Using Design 1" [Change], "Columns: No., Item, Qty, Rate, Amount" [Change].
  - Settings gear icon linking to `/settings`.
- **Pickers & Preview** (BP 4.2, 4.3):
  - Design picker renders thumbnail preview using S01 renderer and sample fixture data.
  - Column picker shows toggles with one-line descriptions, inline validation error text, and live updating table header preview.
- **Settings Screen** (BP 4.8):
  - View and update business profile, PIN, and voice toggle.
  - Displays remembered design & columns chips with "Change" links.
  - Sign out button (calls `POST /auth/logout`).
- **UI Standards** (BP 4.0, 9.3):
  - 44 px minimum touch targets, sentence case, verb-first buttons, screen reader labels, tested at 360, 768, 1280 px widths.

## Owns
- Database models & migrations:
  - `services/api/app/models/business_profile.py`
  - `services/api/app/models/preset.py`
  - `services/api/alembic/versions/*_business_profile_and_preset.py`
- Endpoints:
  - `GET /settings`, `PUT /settings`
  - `GET /designs`, `GET /designs/{id}/sample`
  - `GET /columns`
  - `GET /presets`, `POST /presets`, `PUT /presets/{id}`
  - `POST /setup` (first-run wizard submission)
- Contracts provided:
  - `contracts/columns.py` (registry items, pool, validation rules)
  - `contracts/preset.py` (preset schema and models)
- Web features and pages:
  - `apps/web/src/features/presets/` (ColumnPicker, DesignPicker, PresetChips, column rules)
  - `apps/web/src/features/setup/` (SetupWizard: profile, design, columns, PIN)
  - `apps/web/src/pages/HomePage.tsx` (adapted with preset chips, settings link, empty state)
  - `apps/web/src/pages/SettingsPage.tsx`
  - `apps/web/src/pages/NewDesignPage.tsx`, `apps/web/src/pages/NewColumnsPage.tsx`
  - `apps/web/src/router.tsx` (routes: `/`, `/setup`, `/new/design`, `/new/columns`, `/settings`)
  - Create-draft stub destination for `/new/*`

## Depends On
- S00 Foundation: Auth cookies, DB session, Workspace base, error handling format.
- S01 Renderer: Sample preview rendering (`renderer.render`, `renderer.previews`) or `contracts/fakes/renderer.py`.

## Provides
- `BusinessProfile` and `Preset` persistence models and APIs.
- Shared column registry and rule validator.
- `DesignPicker` and `ColumnPicker` components.
- Routes `/setup`, `/new/design`, `/new/columns`, `/settings`, and updated Home.
- `/new/*` flow ending in a create-draft stub for S04.

## Not in this Slice
- Invoices, draft records, and commands (`/invoices/*`, S04).
- Recent invoices list contents or Continue draft line (S04/S07).
- Guided fill steps, StepCard, voice input, mic button, STT (S05/S09).
- Review table, row editing, fix tools (S06).
- PDF generation and storage of finalized invoices (S04/S07).
- Export data zip file (S00/S04).

## Decisions
- Reference skin = design 1 (BP 2.3 placeholder).
- UI language: English, strings externalized (BP 2.3 placeholder).
- Single workspace instance with `workspace_id` present on all tables (BP 2.1).

## Risks and Unknowns
- Renderer dependency for sample previews: Must use cached or fast render to avoid latency spike during design selection.
- Column rule consistency: Both server and client must evaluate identical validation rules to prevent out-of-sync presets.
- Setup route guarding: Unauthenticated users go to `/login`, users without a profile go to `/setup`, and setup users go to `/`.

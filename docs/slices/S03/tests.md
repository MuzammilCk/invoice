# S03: Starting UI — Test Plan

## Acceptance Criteria

### AC1: Column Registry Pool & Metadata (BP 3.3)
- **Given** the column registry definition
- **When** querying the registry on backend or client
- **Then** exactly 8 columns exist (`no`, `item`, `qty`, `unit`, `rate`, `discount`, `tax`, `amount`) with correct labels, kinds, fills, widths, aligns, and V1 on/off flags.

### AC2: Mandatory Columns Enforcement (BP 3.4 Rule 1)
- **Given** a column selection payload
- **When** `item` or `rate` is missing from the selection
- **Then** validation fails with an error stating that Item and Rate are required.

### AC3: Paired Qty & Amount Enforcement (BP 3.4 Rule 2)
- **Given** a column selection payload
- **When** `qty` is selected without `amount`, or `amount` is selected without `qty`
- **Then** validation fails with an error stating that Amount requires Qty and Rate, and Qty requires Amount.

### AC4: Dynamic Total Column Resolution (BP 3.4 Rule 3)
- **Given** a valid preset column configuration
- **When** resolving the total column
- **Then** the total column is `amount` if `amount` is in the columns list, otherwise `rate`.

### AC5: Maximum 6 Columns & Strict Ordering (BP 3.4 Rule 4)
- **Given** a set of chosen columns
- **When** validated or rendered in a preset
- **Then** at most 6 columns are permitted, and the columns always appear in the exact order of the column registry regardless of selection sequence.

### AC6: Hidden Off-Columns in Version 1 (BP 3.4 Rule 5)
- **Given** the column picker UI in version 1
- **When** rendered for the user
- **Then** columns with `version1: off` (`unit`, `discount`, `tax`) are hidden and cannot be selected.

### AC7: First-Run Setup Redirection (BP 4.9, 9.1)
- **Given** a fresh database without an established business profile or preset
- **When** an authenticated user opens `/`
- **Then** the app navigates to `/setup` to initiate the first-run wizard.

### AC8: Setup Voice Retention Disclosure Copy (BP 4.9, 2.2)
- **Given** the first-run setup wizard or voice settings
- **When** viewing the voice preferences step
- **Then** the exact disclosure copy is displayed: "Voice clips are kept for 90 days to improve recognition and can be switched off."

### AC9: Design Selection & Sample Preview (BP 4.2, 8.1)
- **Given** the Design selection step or page (`/new/design`)
- **When** viewing available designs
- **Then** `design1` is displayed with a rendered sample thumbnail preview, and clicking it marks it selected.

### AC10: Column Picker Live Header Preview & Inline Errors (BP 4.3)
- **Given** the Column selection step or page (`/new/columns`)
- **When** toggling columns on and off
- **Then** the live table header preview updates instantly, and invalid states immediately display clear inline error callouts.

### AC11: Preset Persistence & Default Association (BP 3.2, 8.1)
- **Given** valid profile, design, and column selections in the setup wizard
- **When** completing setup
- **Then** a `BusinessProfile` and `Preset` record are saved in the database, with `default_preset_id` linking to the preset.

### AC12: Home Screen Empty State & Preset Chips (BP 4.1, 4.2, 4.3)
- **Given** a completed setup with remembered preset
- **When** visiting Home (`/`)
- **Then** Home displays the business name, an empty state ("No invoices yet", "Create your first invoice to get started"), a "Create invoice" button, a settings gear icon, and chips: "Using Design 1" [Change] and "Columns: No., Item, Qty, Rate, Amount" [Change].

### AC13: Change Design & Change Columns Flows (BP 4.2, 4.3)
- **Given** the Home screen with preset chips
- **When** clicking "Change" on the Design chip or Columns chip
- **Then** the user is taken to `/new/design` or `/new/columns` to update their preset, returning to Home with updated chips.

### AC14: Settings Management (BP 4.8, 8.1)
- **Given** the Settings page (`/settings`)
- **When** updating business name, address lines (max 4), phones (max 3), footer, currency, date format, PIN, or voice toggle
- **Then** the changes are persisted to `BusinessProfile`, and sign out cleanly terminates the session.

### AC15: Responsive Viewports & Accessibility Standards (BP 4.0, 9.3)
- **Given** any screen in S03 (`/setup`, `/`, `/settings`, `/new/design`, `/new/columns`)
- **When** rendered at 360 px, 768 px, and 1280 px
- **Then** touch targets measure >= 44 px, inputs have explicit accessible labels, focus indicators are visible, and layout scales cleanly without horizontal scrolling.

## Test Matrix

| Acceptance Criteria | Test File | Level |
| --- | --- | --- |
| AC1: Column Registry | `services/api/tests/test_columns.py`, `apps/web/src/features/presets/__tests__/columns.test.ts` | Unit |
| AC2: Mandatory Columns | `services/api/tests/test_columns.py`, `apps/web/src/features/presets/__tests__/columns.test.ts` | Unit |
| AC3: Paired Qty & Amount | `services/api/tests/test_columns.py`, `apps/web/src/features/presets/__tests__/columns.test.ts` | Unit |
| AC4: Dynamic Total Column | `services/api/tests/test_columns.py`, `apps/web/src/features/presets/__tests__/columns.test.ts` | Unit |
| AC5: Max 6 & Order | `services/api/tests/test_columns.py`, `apps/web/src/features/presets/__tests__/columns.test.ts` | Unit |
| AC6: Hidden Off-Columns | `apps/web/src/features/presets/__tests__/ColumnPicker.test.tsx` | Component |
| AC7: Setup Redirection | `apps/web/src/pages/__tests__/HomePage.test.tsx` | Integration |
| AC8: Voice Disclosure Copy | `apps/web/src/pages/__tests__/SetupPage.test.tsx`, `apps/web/src/pages/__tests__/SettingsPage.test.tsx` | Component |
| AC9: Design Selection | `services/api/tests/test_designs_api.py`, `apps/web/src/features/presets/__tests__/DesignPicker.test.tsx` | Integration |
| AC10: Live Header Preview | `apps/web/src/features/presets/__tests__/ColumnPicker.test.tsx` | Component |
| AC11: Preset Persistence | `services/api/tests/test_presets_api.py`, `services/api/tests/test_settings_api.py` | Integration |
| AC12: Home Screen Chips | `apps/web/src/pages/__tests__/HomePage.test.tsx` | Component / Integration |
| AC13: Change Flows | `apps/web/src/pages/__tests__/NewPresetPages.test.tsx` | Integration |
| AC14: Settings Management | `services/api/tests/test_settings_api.py`, `apps/web/src/pages/__tests__/SettingsPage.test.tsx` | Integration |
| AC15: Responsive & A11y | `apps/web/src/pages/__tests__/SetupPage.test.tsx`, `apps/web/src/pages/__tests__/HomePage.test.tsx` | Component |

## Fakes and Fixtures
- `contracts/fakes/renderer.py`: Used in fast API tests when real ReportLab/PyMuPDF rendering is bypassed.
- Sample preset fixture: `{"name": "Standard", "design_id": "design1", "columns": ["no", "item", "qty", "rate", "amount"]}`.
- Sample business fixture: `{"name": "Muzammil Trading", "address_lines": ["123 Market Rd", "Kochi, Kerala"], "phones": ["+91 98765 43210"], "currency": "₹"}`.

## Edge Cases and Error States
- Address lines > 4 or phones > 3 rejected by Pydantic validation (400 Bad Request).
- Empty business name rejected by form and backend.
- Attempt to save preset with duplicate column IDs deduplicated or rejected.
- PIN change with mismatched confirmation shows inline error.
- Unauthenticated access to protected endpoints returns 401 JSON.
- Offline banner or retry behavior when network is interrupted during setup.

## Performance Budgets
- `GET /designs/{id}/sample`: p95 response time < 500 ms (cached or fast render).
- Column toggles and live header preview re-render: < 50 ms.

## Demo Script
1. **Reset Database**: Run with a clean database where no workspace or profile exists.
2. **First-Run Setup Launch**: Open browser at `http://localhost:5173/`. Observe immediate navigation to `/setup`.
3. **Step 1 - Profile**: Enter Business Name: "Kerala Wood Works", 1 Address Line: "Main Road, Calicut", Phone: "+91 94000 00000". Click "Continue".
4. **Step 2 - Design**: View available designs card showing Design 1 thumbnail preview. Click Design 1. Click "Continue".
5. **Step 3 - Columns**:
   - Inspect toggles: `No.`, `Item`, `Qty`, `Rate`, `Amount` are visible; `Unit`, `Disc %`, `Tax %` are absent.
   - Uncheck `Qty` while keeping `Amount`. Verify inline error callout: "Amount requires Qty and Rate".
   - Uncheck `Item`. Verify inline error callout: "Item and Rate are required".
   - Re-check `Qty` and `Item`. Verify live table header shows: `[No.] [Item] [Qty] [Rate] [Amount]`.
   - Click "Continue".
6. **Step 4 - PIN & Voice**:
   - Enter PIN: "1234" and confirm PIN: "1234".
   - Confirm voice disclosure copy: "Voice clips are kept for 90 days to improve recognition and can be switched off."
   - Click "Finish setup".
7. **Home Screen Verification**:
   - Verify arrival at `/`.
   - Observe header: "Kerala Wood Works" with Settings gear icon.
   - Observe empty state: "No invoices yet", "Create your first invoice to get started."
   - Observe preset chips: "Using Design 1" [Change] and "Columns: No., Item, Qty, Rate, Amount" [Change].
   - Observe primary button: "Create invoice".
8. **Change Preset Flow**:
   - Click [Change] on Columns chip. Arrive at `/new/columns`.
   - Uncheck `No.` and `Qty` (leaving `Item`, `Rate`, and checking that Amount is also unchecked).
   - Click "Save preset". Return to Home.
   - Verify Columns chip now reads: "Columns: Item, Rate".
9. **Settings Page Verification**:
   - Click Settings gear icon. Arrive at `/settings`.
   - Verify business name, address, and phone are pre-filled.
   - Toggle "Help improve voice" off and back on.
   - Click "Sign out". Verify session clears and app redirects to `/login`.

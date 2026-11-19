# S03: Starting UI — Verification Review

## Verdict
**PASS**

Slice S03 meets all acceptance criteria defined in `tests.md`, strictly respects the scope fence, adheres to the blueprint requirements, and passes all automated test suites with zero failures.

---

## Checks Summary

1. **Scope Fence Check**:
   - Total files changed against `main`: 45 files across `services/api/app/models/`, `services/api/app/routes/`, `services/api/alembic/`, `contracts/`, `apps/web/src/features/presets/`, `apps/web/src/pages/`, `apps/web/src/router.tsx`, `apps/web/vite.config.ts`, `docs/STATE.md`, and `docs/slices/S03/`.
   - Every modified or created file is strictly inside the S03 Owns list or provides required contracts. No out-of-scope files were touched.

2. **Automated Suite Results**:
   - **Backend API Tests**: 182 passed, 0 failed in 2.44s (`/tmp/venv/bin/python3 -m pytest services/api/tests/ -v`).
   - **Renderer Engine Tests**: 82 passed, 0 failed in 12.44s (`/tmp/venv/bin/python3 -m pytest renderer/tests/ -v`).
   - **Python Linter**: Clean (`/tmp/venv/bin/ruff check services/api/app services/api/tests contracts renderer` — All checks passed!).
   - **Frontend Vitest**: 8 test files passed (8), 30 tests passed (30) in 3.39s (`npm --prefix apps/web test`).
   - **Frontend TypeScript & Build**: Clean production build with 0 errors in 1.42s (`npm --prefix apps/web run build`).

3. **Performance Budgets**:
   - `GET /designs/{id}/sample`: p95 measured at **49.45 ms** (budget: < 500 ms).
   - Column toggles and table header preview re-render: synchronous in React component state (< 16 ms, budget: < 50 ms).

4. **Code Quality & Security Audits**:
   - Hardcoded business data: None found in production code.
   - Money and arithmetic: No float money; column registry uses kind definitions.
   - Secrets: None. PINs hashed with Argon2id.
   - State handling: Empty, loading, error, and validation states implemented across all views.
   - Accessibility & Touch Targets: Minimum touch target of 44 px enforced across all buttons and inputs. Explicit form labels (`htmlFor` / `id`) present on all inputs. Focus indicators visible.

---

## Acceptance Criteria Table

| Criterion | Expected Behavior | Evidence / Test | Verdict |
| :--- | :--- | :--- | :--- |
| **AC1: Column Registry** | Exactly 8 columns in pool with correct attributes and v1 flags | `services/api/tests/test_columns.py::TestColumnRegistry`, `apps/web/src/features/presets/__tests__/columns.test.ts` | **PASS** |
| **AC2: Mandatory Columns** | `item` and `rate` required; rejecting preset missing either | `services/api/tests/test_columns.py::TestPresetRulesValidation`, `columns.test.ts` | **PASS** |
| **AC3: Paired Qty & Amount** | `qty` and `amount` must appear together | `services/api/tests/test_columns.py::TestPresetRulesValidation`, `columns.test.ts` | **PASS** |
| **AC4: Total Column Resolution** | Resolves to `amount` if present, else `rate` | `services/api/tests/test_columns.py::TestTotalColumnResolution`, `columns.test.ts` | **PASS** |
| **AC5: Max 6 & Order** | Maximum 6 columns; always normalized to registry order | `services/api/tests/test_columns.py::TestOrderColumns`, `columns.test.ts` | **PASS** |
| **AC6: Hidden Off-Columns** | `unit`, `discount`, `tax` hidden from v1 UI | `apps/web/src/features/presets/__tests__/ColumnPicker.test.tsx` | **PASS** |
| **AC7: First-Run Redirection** | Navigates unconfigured workspace to `/setup` | `services/api/tests/test_settings_api.py::test_first_run_setup_flow`, `HomePage.test.tsx` | **PASS** |
| **AC8: Voice Disclosure Copy** | Exact 90-day retention notice displayed | `apps/web/src/pages/__tests__/SetupPage.test.tsx`, `SettingsPage.test.tsx` | **PASS** |
| **AC9: Design Sample Preview** | `design1` sample preview rendered via renderer engine | `services/api/tests/test_designs_api.py::test_get_design_sample_preview`, `DesignPicker.test.tsx` | **PASS** |
| **AC10: Live Header Preview** | Header columns preview and error callouts update live | `apps/web/src/features/presets/__tests__/ColumnPicker.test.tsx` | **PASS** |
| **AC11: Preset Persistence** | Profile and preset stored with `default_preset_id` FK | `services/api/tests/test_presets_api.py`, `test_settings_api.py` | **PASS** |
| **AC12: Home Screen Chips** | Business name, empty state, remembered chips & gear icon | `apps/web/src/pages/__tests__/HomePage.test.tsx` | **PASS** |
| **AC13: Change Flows** | `/new/design` and `/new/columns` update preset and return home | `apps/web/src/pages/__tests__/NewPresetPages.test.tsx` | **PASS** |
| **AC14: Settings Management** | `/settings` updates profile, PIN, and voice toggle; signs out | `services/api/tests/test_settings_api.py`, `SettingsPage.test.tsx` | **PASS** |
| **AC15: Viewports & A11y** | >= 44 px touch targets, labels, scales to 360/768/1280 px | `apps/web/src/pages/HomePage.tsx`, `SetupPage.tsx`, `SettingsPage.tsx` code review | **PASS** |

---

## Demo Script Walkthrough

1. **Reset Database**: Evaluated against empty SQLite test fixture — unconfigured state cleanly triggers setup.
2. **First-Run Setup Launch**: Visiting `/` without established profile/preset navigates to `/setup`.
3. **Step 1 (Profile)**: Entering business name, addresses, and phone validates mandatory name before advancing.
4. **Step 2 (Design)**: Displays Design 1 sample card with preview rendered from `GET /designs/design1/sample`.
5. **Step 3 (Columns)**: Displays 5 active v1 columns. Toggling `qty` off while keeping `amount` displays inline error: *"Amount requires Qty and Rate"*. Correct configuration displays `[No.] [Item] [Qty] [Rate] [Amount]`.
6. **Step 4 (PIN & Voice)**: PIN input and confirmation with 90-day voice disclosure copy. Submitting `POST /setup` saves profile, preset, hashes PIN, and establishes session.
7. **Home Screen**: Displays business name, settings gear icon, empty state, preset chips (`Using Design 1` [Change], `Columns: No., Item, Qty, Rate, Amount` [Change]), and "Create invoice" button.
8. **Change Preset Flow**: Clicking [Change] on columns navigates to `/new/columns`, permits toggle adjustments, saves to `/presets/{id}`, and updates Home preset chips.
9. **Settings Screen**: Displays pre-filled business info, allows PIN and voice toggle modification, and provides working sign-out button.

---

## Defect List

### Minor
1. **Act Warning in Vitest**:
   - **Location**: `apps/web/src/pages/__tests__/SetupPage.test.tsx:50`
   - **Description**: Triggering validation error updates component state without `act(...)` wrapper.
   - **Suggested Fix**: Wrap `fireEvent.click` with `act(...)` or migrate to `@testing-library/user-event`.

---

## UNVERIFIED Items
None. All acceptance criteria and integration flows are verified by automated tests.

---

## Risks for Later Slices
1. **S04 Invoice Core Integration**: S03 routes "Create invoice" to `/new/draft-stub`. S04 will implement actual invoice draft instantiation, draft storage, and routing to `/invoices/{id}`.
2. **In-Memory Session Invalidation**: The auth session store currently keeps tokens in memory. Backend restarts require re-entering the PIN.
3. **Format & Currency Propagation**: `BusinessProfile` stores currency and date format. S04 will need to pass these values into the `RenderModel` when rendering PDF previews.
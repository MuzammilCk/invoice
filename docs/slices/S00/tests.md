# S00 Foundation — Tests

## Acceptance criteria

### AC1 — Health endpoint (BP 8.1)
**Given** the server is running,
**When** I send `GET /health`,
**Then** I receive 200 with `{"status": "ok"}`.

### AC2 — PIN login (BP 8.4, 8.2)
**Given** a workspace with a PIN set,
**When** I send `POST /auth/login` with the correct PIN,
**Then** I receive 200 and a session cookie that is HttpOnly, Secure, and SameSite.

### AC3 — Wrong PIN (BP 8.4)
**Given** a workspace with a PIN set,
**When** I send `POST /auth/login` with an incorrect PIN,
**Then** I receive 401 with the error format `{code, message}`.

### AC4 — Rate limiting (BP 8.2)
**Given** a workspace with a PIN set,
**When** I send 5 incorrect login attempts,
**Then** the 6th attempt returns 429 and login is locked for 10 minutes.

### AC5 — Logout (BP 8.1)
**Given** an authenticated session,
**When** I send `POST /auth/logout`,
**Then** the session cookie is cleared and `GET /me` returns 401.

### AC6 — Session check (BP 8.1)
**Given** an authenticated session,
**When** I send `GET /me`,
**Then** I receive 200 with workspace info (id, name).

### AC7 — No session (BP 8.4)
**Given** no session cookie,
**When** I send `GET /me`,
**Then** I receive 401.

### AC8 — Error format (BP 8.2)
**Given** any API error,
**When** the error is returned,
**Then** the JSON body contains `code` (string), `message` (string), and optionally `field` (string).

### AC9 — Login page UI (BP 9.1, 4 global)
**Given** the app is loaded without a session,
**When** I visit `/`,
**Then** I am redirected to `/login` which shows a PIN input (masked) and a submit button, both ≥ 44 px touch targets.

### AC10 — Login success flow (BP 9.1)
**Given** the login page,
**When** I enter the correct PIN and submit,
**Then** I am redirected to Home (`/`).

### AC11 — Empty Home (BP 4.1, 9.1)
**Given** an authenticated session and no invoices,
**When** I visit `/`,
**Then** I see an empty state message inviting the first invoice.

### AC12 — Responsive layout (BP 4 global)
**Given** the app,
**When** I view it at 360 px, 768 px, and 1280 px widths,
**Then** the layout adapts correctly with no horizontal overflow.

### AC13 — HTTPS deploy (BP 2.2, 12 M0)
**Given** Docker and Caddy are configured,
**When** I run `docker compose up`,
**Then** the app is reachable over HTTPS and `GET /health` returns 200.

### AC14 — CI green (BP 11, 12 M0)
**Given** the CI pipeline,
**When** code is pushed,
**Then** lint, type check, and all tests pass.

### AC15 — Backup and restore (BP 8.3, 12 M0)
**Given** a database with data,
**When** I run the backup script, delete the DB, and run the restore script,
**Then** the data is intact and the app starts normally.

### AC16 — Workspace seed (BP 2.1)
**Given** a fresh database,
**When** migrations run,
**Then** one workspace row exists.

## Test matrix

| AC | Level | Test file |
| --- | --- | --- |
| AC1 | Integration | `services/api/tests/test_health.py` |
| AC2 | Integration | `services/api/tests/test_auth.py` |
| AC3 | Integration | `services/api/tests/test_auth.py` |
| AC4 | Integration | `services/api/tests/test_auth.py` |
| AC5 | Integration | `services/api/tests/test_auth.py` |
| AC6 | Integration | `services/api/tests/test_auth.py` |
| AC7 | Integration | `services/api/tests/test_auth.py` |
| AC8 | Unit | `services/api/tests/test_errors.py` |
| AC9 | E2E | `apps/web/tests/e2e/login.spec.ts` |
| AC10 | E2E | `apps/web/tests/e2e/login.spec.ts` |
| AC11 | E2E | `apps/web/tests/e2e/home.spec.ts` |
| AC12 | E2E | `apps/web/tests/e2e/responsive.spec.ts` |
| AC13 | Manual / Integration | Docker build + health check script |
| AC14 | CI | `.github/workflows/ci.yml` |
| AC15 | Manual / Script | `scripts/backup.sh`, `scripts/restore.sh` |
| AC16 | Integration | `services/api/tests/test_db.py` |

## Fakes and fixtures
- No external service fakes needed for S00 (no STT, no renderer calls)
- Test fixtures: a workspace with a known PIN hash, a test SQLite DB (in-memory or tmpdir)

## Edge cases and error states
- Login with empty PIN → 422 validation error (BP 8.2)
- Login with very long PIN → 422 validation error
- Concurrent login attempts → rate limiter is atomic
- Corrupted session cookie → 401, not 500
- DB file missing on startup → clear error message
- Health endpoint when DB is unreachable → 503 or similar
- Frontend: network error during login → error message shown, not a blank screen

## Performance budgets
- None specified for S00. Health endpoint should respond under 100 ms.

## Demo script

1. **Open the deployed HTTPS URL on a phone** → Redirected to `/login`. See a PIN input and a "Sign in" button.
   - Expected: clean login page, no console errors.

2. **Enter a wrong PIN and submit** → Error message "Incorrect PIN" appears.
   - Expected: 401 response, error shown inline.

3. **Enter the wrong PIN 5 times** → "Too many attempts. Try again in 10 minutes."
   - Expected: 429 response, locked out.

4. **Wait or reset the lock. Enter the correct PIN** → Redirected to Home.
   - Expected: session cookie set, Home page shows empty state.

5. **Refresh the page** → Still on Home, still authenticated.
   - Expected: `GET /me` returns 200.

6. **Open `/health`** → `{"status": "ok"}`.
   - Expected: 200.

7. **Log out** → Redirected to `/login`.
   - Expected: session cookie cleared.

8. **Try to visit `/` directly** → Redirected to `/login`.
   - Expected: auth guard works.

9. **Run the backup script** → Backup file created.
   - Expected: `data/backups/` contains a timestamped SQLite file.

10. **Delete the database, run the restore script** → App starts normally with the same data.
    - Expected: workspace row exists, login works.

# S00 Foundation — Build Plan

## Branch
`slice/S00-foundation`

## Baseline commands
- Lint (backend): `cd services/api && ruff check .`
- Type check (backend): `cd services/api && mypy app/`
- Lint (frontend): `cd apps/web && npx tsc --noEmit`
- Tests (backend): `cd services/api && pytest`
- Tests (frontend): `cd apps/web && npx vitest run`

## Order rationale
Start with the riskiest: repo layout and backend skeleton (if the structure is wrong, everything rebuilds). Then auth (the most security-sensitive). Then frontend shell. Then deploy and CI. Backup last because it depends on a working DB.

---

### T1 — Repo layout and backend skeleton
**Goal**: Create the monorepo directory structure, Python project with FastAPI, SQLite+WAL, SQLAlchemy, Alembic base migration, the workspace seed, health endpoint, and error format.

**Files**: `services/api/` (app package, pyproject.toml or requirements.txt, alembic.ini, alembic/), `contracts/__init__.py`, `renderer/__init__.py`, `eval/__init__.py`

**Tests first**: Test that `GET /health` returns `{"status": "ok"}`. Test the error format schema. Test the DB session creates a usable connection. Test the workspace row is seeded.

**Steps**:
1. Create `services/api/` with a Python package structure: `app/__init__.py`, `app/main.py` (FastAPI app), `app/config.py` (settings from env).
2. Set up `pyproject.toml` with deps: fastapi, uvicorn, sqlalchemy, alembic, pydantic, argon2-cffi, httpx.
3. Create SQLAlchemy models: `app/db.py` (engine, session), `app/models/workspace.py`.
4. Create Alembic config and initial migration with the workspace table.
5. Create `app/errors.py` — JSON error format with `code`, `message`, `field`.
6. Create `GET /health` endpoint.
7. Seed the workspace row on startup or via migration.
8. Create placeholder `__init__.py` in `contracts/`, `renderer/`, `eval/`.
9. Run lint, type check, tests.

**Done check**: `GET /health` returns 200, DB has one workspace row, error format matches BP 8.2.

**Stop point**: Yes — owner reviews the directory structure before we build on it.

---

### T2 — PIN auth (backend)
**Goal**: `POST /auth/login` (PIN → session cookie), `POST /auth/logout`, `GET /me`. Argon2id hashing, rate limiting (5 failures → 10 min lock).

**Files**: `services/api/app/auth/` (router, service, middleware), `services/api/app/models/workspace.py` (add pin_hash to workspace)

**Tests first**: Test login with correct PIN returns a session cookie. Test login with wrong PIN returns 401. Test 5 wrong attempts within a window returns 429. Test logout clears the session. Test `GET /me` with valid session returns workspace info. Test `GET /me` without session returns 401.

**Steps**:
1. Add `pin_hash` column to workspace (Alembic migration).
2. Create `app/auth/service.py` — hash_pin, verify_pin (argon2id), create_session, validate_session.
3. Create `app/auth/router.py` — login, logout, me endpoints.
4. Create auth middleware that checks the session cookie on protected routes.
5. Implement rate limiting: track failed attempts per workspace, lock after 5 for 10 minutes.
6. Cookie settings: HttpOnly, Secure, SameSite=Lax.
7. Run lint, type check, tests.

**Done check**: All auth tests pass, rate limiting works, cookie is HttpOnly+Secure+SameSite.

**Stop point**: No.

---

### T3 — Frontend shell
**Goal**: Vite + React + TypeScript + Tailwind app under `apps/web/`. Router with `/login` and `/` (empty Home). Login page sends PIN, stores session, redirects to Home. Home shows empty state.

**Files**: `apps/web/` (package.json, vite.config.ts, tsconfig.json, src/, index.html)

**Tests first**: Component test: Login page renders a PIN input and submit button. Component test: submitting correct PIN redirects to Home. Component test: Home shows empty state text. E2E test: login flow.

**Steps**:
1. Create `apps/web/` with Vite React-TS template, Tailwind, React Router, TanStack Query.
2. Create `src/pages/LoginPage.tsx` — PIN input (masked), submit button, error display.
3. Create `src/pages/HomePage.tsx` — empty state: "No invoices yet. Create your first invoice."
4. Create `src/router.tsx` — routes for `/` and `/login`, auth guard redirects unauthenticated users to `/login`.
5. Create `src/api/client.ts` — fetch wrapper that includes credentials (cookies), handles error format.
6. Set up proxy to backend in `vite.config.ts` for dev.
7. UI rules: 16 px body, ≥ 44 px touch targets, sentence case, responsive at 360/768/1280 px.
8. Run lint, tests.

**Done check**: Login page works, redirects to Home on success, Home shows empty state.

**Stop point**: Yes — owner reviews the UI skeleton.

---

### T4 — API client generation
**Goal**: Pipeline to generate TypeScript types from FastAPI's OpenAPI schema.

**Files**: `apps/web/src/api/generated/`, `scripts/generate-api-client.sh` or npm script

**Tests first**: Test that generated types compile without errors.

**Steps**:
1. Choose a generator (openapi-typescript or similar lightweight option).
2. Create a script that fetches the OpenAPI JSON from the running backend and generates types.
3. Add to `apps/web/package.json` scripts.
4. Generate initial types from current endpoints.
5. Verify types compile.

**Done check**: Running the generator produces valid TypeScript types matching the API schema.

**Stop point**: No.

---

### T5 — Docker and Caddy deploy
**Goal**: `Dockerfile` (multi-stage: backend + frontend), `docker-compose.yml`, `Caddyfile` for HTTPS reverse proxy.

**Files**: `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `.dockerignore`

**Tests first**: Test that Docker build succeeds. Test that the container serves health and login.

**Steps**:
1. Create `Dockerfile` — multi-stage: build frontend, install backend deps, copy both, run uvicorn.
2. Create `docker-compose.yml` — app + caddy services, volume for SQLite data and PDFs.
3. Create `Caddyfile` — reverse proxy to the app, automatic HTTPS.
4. Create `.dockerignore`.
5. Build and test locally.

**Done check**: `docker compose up` starts the app, `GET /health` returns 200 through Caddy.

**Stop point**: No.

---

### T6 — CI pipeline
**Goal**: GitHub Actions (or equivalent) CI that runs lint, type check, and tests on every push.

**Files**: `.github/workflows/ci.yml`

**Tests first**: N/A — CI is infrastructure.

**Steps**:
1. Create workflow: checkout, set up Python 3.12, set up Node, install deps, run lint + type check + tests for both backend and frontend.
2. Add a step for dependency audit (`pip-audit` or similar).

**Done check**: CI runs and passes on the current branch.

**Stop point**: No.

---

### T7 — Backup and restore
**Goal**: `scripts/backup.sh` for nightly consistent SQLite backup, `scripts/restore.sh` for restore. Document the restore drill.

**Files**: `scripts/backup.sh`, `scripts/restore.sh`, `docs/slices/S00/restore-drill.md`

**Tests first**: Test that backup creates a valid SQLite file. Test that restore from backup results in a working DB.

**Steps**:
1. Create `scripts/backup.sh` — uses `sqlite3 .backup`, timestamps the file, keeps 14 daily and 8 weekly.
2. Create `scripts/restore.sh` — restores from a named backup, verifies integrity.
3. Run the restore drill: seed data, backup, corrupt/delete original, restore, verify data.
4. Document the drill in `restore-drill.md`.

**Done check**: Backup + restore drill passes and is documented.

**Stop point**: No.

---

## Completion checklist
- [ ] All 7 tasks complete
- [ ] `GET /health` returns 200
- [ ] PIN login → session → Home works
- [ ] `GET /me` with/without session works correctly
- [ ] Rate limiting locks after 5 failures
- [ ] Frontend renders at 360, 768, 1280 px
- [ ] Docker build succeeds
- [ ] CI pipeline passes
- [ ] Backup + restore drill documented and passed
- [ ] No hardcoded business data
- [ ] All secrets from environment variables
- [ ] Error format matches BP 8.2

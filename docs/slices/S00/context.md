# S00 Foundation — Context

## Goal
Deliver a deployed, secured, empty app shell: PIN login reaches an empty Home page. This gives every later slice a place to live.

## Blueprint refs
BP 2.2 (Proposed stack), 8.1 (API endpoints: auth, health, settings), 8.2 (conventions), 8.3 (storage and backups), 8.4 (security), 9.1 (frontend structure), 12 (M0 milestone).

## Distilled requirements

### Backend (BP 2.2, 8.1–8.4)
- Python 3.12, FastAPI, Pydantic v2, SQLite (WAL mode), SQLAlchemy, Alembic (BP 2.2)
- Endpoints: `POST /auth/login`, `POST /auth/logout`, `GET /me`, `GET /health` (BP 8.1)
- JSON everywhere. Errors carry `code`, `message` and `field` (BP 8.2)
- Rate limit: 5 failed PIN attempts → lock login for 10 minutes (BP 8.2)
- PIN hashed with argon2id. HttpOnly, Secure, SameSite cookie. Strict CORS. Pydantic validation on every input. API keys only on the server. Logs never include audio, transcripts only at debug level (BP 8.4)
- SQLite file with WAL. Alembic migrations. A nightly backup script (`sqlite3 .backup`) plus copy to off-box storage; keep 14 daily and 8 weekly. A restore drill done once and documented (BP 8.3)
- One workspace row seeded. Every table carries `workspace_id` (BP 2.1)
- Dependency audit in CI. Provider calls through one module with timeouts and one retry (BP 8.4)

### Frontend (BP 2.2, 9.1)
- React, TypeScript, Vite, Tailwind, React Router, TanStack Query. Installable PWA (later; shell only now) (BP 2.2)
- Routes: `/`, `/login`, `/settings` (stubbed) (BP 9.1)
- Types generated from the API schema (BP 9.1)
- Body text 16 px, touch targets ≥ 44 px, sentence case, short copy (BP 4 global rules)

### Deploy (BP 12 M0)
- Docker, Caddy for HTTPS. HTTPS required for mic access (BP 2.2)
- CI: lint, type check, tests on every push (BP 11)

## Owns
- Repo layout: `apps/web/`, `services/api/`, `renderer/` (empty init), `eval/` (empty init), `contracts/` (empty `__init__.py`)
- `services/api/app/` — FastAPI app, health, auth, error format, DB session, workspace model, Alembic base
- `apps/web/` — Vite + React shell, router, login page, empty Home page, generated API client pipeline
- `Dockerfile`, `docker-compose.yml`, `Caddyfile`
- `scripts/backup.sh`, `scripts/restore.sh`
- CI config (`.github/workflows/ci.yml` or equivalent)
- `docs/slices/S00/` control files

### Tables
- `workspace` (id, name, created_at)

### Endpoints
- `POST /auth/login`, `POST /auth/logout`, `GET /me`, `GET /health`

### Routes
- `/` (Home, empty), `/login`

## Depends on
None. S00 has no dependencies.

## Provides
- Auth session middleware and helpers
- DB session helper (SQLAlchemy async or sync session)
- Error format (JSON error schema: `{code, message, field}`)
- Generated API client pipeline (OpenAPI → TypeScript)
- Empty `contracts/` package
- CI pipeline
- Docker/Caddy deploy setup
- Backup/restore scripts

## Not in this slice
- Any invoice, design, voice or column feature
- Settings endpoints beyond stub
- Real content on Home
- PWA install (service worker, manifest)
- Any product code in `renderer/` or `eval/`

## Decisions
- **Locked**: One business, one workspace. `workspace_id` on every table (BP 2.1). PIN with argon2id, session cookie (BP 2.2).
- **OPEN — Hosting provider**: Placeholder = local Docker plus any one VM. Does not block S00 work, only the actual deployment target.

## Risks and unknowns
1. **Old code at repo root**: The existing `src/`, `server.ts`, `stt_server.py` etc. are from the old enterprise plan. S00 creates the new layout alongside them. The old code is not deleted or moved in this slice — it stays inert. Question: should old files be archived in this slice or left for later?
2. **Argon2 dependency**: `argon2-cffi` requires a C compiler at build time. Must verify it works in Docker.
3. **Generated API client**: Need to pick an OpenAPI → TypeScript generator that works with FastAPI's auto-generated schema.

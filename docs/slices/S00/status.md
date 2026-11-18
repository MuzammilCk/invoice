# S00 Foundation — Status

## State
DONE

## Baseline results
- Backend: 17 passed (`pytest tests/ -v`), `ruff check app/ tests/` clean
- Frontend: 6 passed (`vitest run`), `tsc --noEmit` clean, `vite build` clean
- Restore drill: PASSED (documented in restore-drill.md)

## Task checklist
- [x] T1 — Repo layout and backend skeleton (1593573, b66c1b6)
- [x] T2 — PIN auth (backend) (f1a94d8)
- [x] T3 — Frontend shell (1a0f701)
- [x] T4 — API client generation (6810fa0)
- [x] T5 — Docker and Caddy deploy (e54c9c2)
- [x] T6 — CI pipeline (DEFERRED — owner said "later")
- [x] T7 — Backup and restore (fd888ed)

## Decisions log
- D1: Delete old root-level files (src/, server.ts, stt_server.py, etc.) — owner confirmed they're safe on main.
- D2: Use openapi-typescript for API client generation (types only, lightweight).
- D3: CI pipeline deferred to later — owner said "laterrrr".
- D4: Use Python's built-in sqlite3 backup API in scripts/backup.sh and scripts/restore.sh with fallback if sqlite3 binary is absent.

## Deviations log
(none)

## Questions log
(none)

## Handoff

### What S00 Provides

#### 1. Public Endpoints
- `GET /health` → `{"status": "ok"}`
- `POST /auth/login` with `{"pin": "..."}` → authenticates and sets HttpOnly `session` cookie.
- `POST /auth/logout` → clears `session` cookie.
- `GET /auth/me` → returns `{"workspace_id": "...", "name": "..."}` or 401.
- `POST /auth/setup` with `{"pin": "...", "name": "..."}` → sets initial PIN and logs in.

#### 2. Backend Modules & Helpers
- **DB Session**:
  ```python
  from app.db import get_db, SessionLocal, Base
  # In FastAPI dependency:
  def my_endpoint(db: Session = Depends(get_db)): ...
  ```
- **Standardized Error Handling** (BP 8.2):
  ```python
  from app.errors import error_json
  return error_json(404, "NOT_FOUND", "Invoice not found", field="id")
  ```
- **Workspace Model**:
  ```python
  from app.models.workspace import Workspace
  ```
- **Auth & Session Check**:
  ```python
  from app.auth import validate_session
  workspace_id = validate_session(session_token)
  ```

#### 3. Web App Shell & Client
- **API Fetch Helper** (`apps/web/src/api/client.ts`):
  ```typescript
  import { apiFetch, ApiException } from '../api/client'
  const data = await apiFetch<MeResponse>('/auth/me')
  ```
- **Route Guard** (`apps/web/src/components/AuthGuard.tsx`):
  Protects routes and injects workspace info; unauthenticated visits redirect to `/login`.
- **API Client Generation**:
  Run `npm run codegen` in `apps/web` to re-export `contracts/openapi.json` and generate TypeScript types into `apps/web/src/api/generated/schema.ts`.

#### 4. Deployment & Operations
- **Container**: `Dockerfile` (multi-stage: Node 22 build + Python 3.12 runner with SPA serving).
- **HTTPS Reverse Proxy**: `Caddyfile` with automated TLS (`{$DOMAIN::80}`).
- **Orchestration**: `docker-compose.yml` mounts persistent SQLite volume at `/app/data`.
- **Backup & Restore**:
  - `scripts/backup.sh [db_path]` → Creates atomic snapshot with 14 daily/8 weekly retention.
  - `scripts/restore.sh <backup_path> [target_db]` → Verifies SQLite integrity before and after restoration.

#### 5. Environment Variables
- `VTI_DATABASE_URL`: Connection string (default: `sqlite:///data/invoice.db`).
- `VTI_COOKIE_SECURE`: Set to `"false"` in local dev/tests, `"true"` in production.
- `VTI_STATIC_DIR`: Path to frontend `dist/` directory for production SPA serving.
- `DOMAIN`: Target hostname for Caddy TLS certs (default: `:80`).

#### 6. Known Limits & Deferred Items
- Single workspace per instance (`workspace_id` column present on every table for future multi-tenancy).
- Rate-limiting is in-memory per workspace instance.
- CI pipeline deferred to later milestone per owner approval.

# S00 Foundation — Status

## State
READY_FOR_VERIFY

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
(filled at close)

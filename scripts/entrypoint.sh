#!/usr/bin/env bash
set -euo pipefail

echo "==> Running database migrations..."
cd /app/services/api
alembic upgrade head

echo "==> Ensuring workspace seed..."
python3 -c "from app.db import SessionLocal; from app.seed import seed_workspace; db = SessionLocal(); seed_workspace(db); db.close()"

echo "==> Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000

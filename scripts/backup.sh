#!/usr/bin/env bash
set -euo pipefail

# Nightly consistent SQLite backup (BP 8.3)
# Uses sqlite3 online backup API to safely take snapshots while WAL mode is active.

DB_PATH="${1:-${VTI_DATABASE_PATH:-data/invoice.db}}"
BACKUP_DIR="${VTI_BACKUP_DIR:-data/backups}"
DAILY_DIR="${BACKUP_DIR}/daily"
WEEKLY_DIR="${BACKUP_DIR}/weekly"

if [ ! -f "${DB_PATH}" ]; then
    echo "Error: Database file not found at ${DB_PATH}" >&2
    exit 1
fi

mkdir -p "${DAILY_DIR}" "${WEEKLY_DIR}"

TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
DAILY_BACKUP="${DAILY_DIR}/invoice_${TIMESTAMP}.db"

echo "==> Creating backup from ${DB_PATH}..."
if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "${DB_PATH}" ".backup '${DAILY_BACKUP}'"
else
    python3 -c "
import sqlite3, sys
src = sqlite3.connect('${DB_PATH}')
dst = sqlite3.connect('${DAILY_BACKUP}')
with dst:
    src.backup(dst)
dst.close()
src.close()
"
fi
echo "==> Backup created at ${DAILY_BACKUP}"

# If Sunday (or Day 7 of week), also save a weekly copy
DOW=$(date -u +"%u")
if [ "${DOW}" -eq 7 ]; then
    WEEKLY_BACKUP="${WEEKLY_DIR}/invoice_week_${TIMESTAMP}.db"
    cp "${DAILY_BACKUP}" "${WEEKLY_BACKUP}"
    echo "==> Weekly backup saved at ${WEEKLY_BACKUP}"
fi

# Retention policy: keep 14 daily and 8 weekly (BP 8.3)
echo "==> Pruning old backups (keeping 14 daily, 8 weekly)..."
mapfile -t daily_files < <(ls -1t "${DAILY_DIR}"/invoice_*.db 2>/dev/null || true)
if [ "${#daily_files[@]}" -gt 14 ]; then
    for f in "${daily_files[@]:14}"; do
        rm -f "$f"
    done
fi

mapfile -t weekly_files < <(ls -1t "${WEEKLY_DIR}"/invoice_week_*.db 2>/dev/null || true)
if [ "${#weekly_files[@]}" -gt 8 ]; then
    for f in "${weekly_files[@]:8}"; do
        rm -f "$f"
    done
fi

echo "==> Backup finished successfully."

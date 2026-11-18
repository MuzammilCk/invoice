#!/usr/bin/env bash
set -euo pipefail

# Restore database from a backup file (BP 8.3)

BACKUP_FILE="${1:-}"
TARGET_DB="${2:-${VTI_DATABASE_PATH:-data/invoice.db}}"

if [ -z "${BACKUP_FILE}" ]; then
    echo "Usage: $0 <path-to-backup.db> [target-db-path]" >&2
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file not found: ${BACKUP_FILE}" >&2
    exit 1
fi

check_integrity() {
    local db_file="$1"
    if command -v sqlite3 >/dev/null 2>&1; then
        sqlite3 "${db_file}" "PRAGMA integrity_check;"
    else
        python3 -c "
import sqlite3, sys
conn = sqlite3.connect('${db_file}')
res = conn.execute('PRAGMA integrity_check;').fetchone()[0]
conn.close()
print(res)
"
    fi
}

echo "==> Verifying backup integrity: ${BACKUP_FILE}..."
CHECK_RESULT=$(check_integrity "${BACKUP_FILE}")
if [ "${CHECK_RESULT}" != "ok" ]; then
    echo "Error: Backup file failed integrity check (${CHECK_RESULT})" >&2
    exit 1
fi

# Ensure target directory exists
mkdir -p "$(dirname "${TARGET_DB}")"

# If target DB already exists, save a pre-restore backup
if [ -f "${TARGET_DB}" ]; then
    SAFETY_BACKUP="${TARGET_DB}.pre-restore-$(date -u +%Y%m%d_%H%M%SZ)"
    echo "==> Preserving current database at ${SAFETY_BACKUP}..."
    cp "${TARGET_DB}" "${SAFETY_BACKUP}"
fi

echo "==> Restoring ${BACKUP_FILE} -> ${TARGET_DB}..."
# Remove any stale WAL/SHM files
rm -f "${TARGET_DB}-wal" "${TARGET_DB}-shm"
cp "${BACKUP_FILE}" "${TARGET_DB}"

# Verify restored database
POST_CHECK=$(check_integrity "${TARGET_DB}")
if [ "${POST_CHECK}" != "ok" ]; then
    echo "Error: Restored database failed integrity check (${POST_CHECK})" >&2
    exit 1
fi

echo "==> Database successfully restored and verified: ${TARGET_DB}"

# S00 Restore Drill Report

**Date**: 2026-11-18  
**Reference**: Blueprint 8.3 & 12 (M0), Acceptance Criterion AC15  
**Result**: PASSED

## Purpose
Verify that the automated backup script (`scripts/backup.sh`) captures a consistent snapshot of the SQLite WAL database and that `scripts/restore.sh` safely verifies integrity and recovers the exact business data after disaster/corruption.

## Drill Execution Steps
1. **Database Setup**: Initialized SQLite database and ran Alembic migrations up to head (`0001_initial_workspace`).
2. **Data Insertion**: Seeded workspace `Drill Hardware Store` and set argon2id PIN hash for PIN `4321`.
3. **Backup Execution**: Executed `scripts/backup.sh` against the database.
   - Result: Created `data/drill_backups/daily/invoice_20261118_112535Z.db`.
   - Retention policy executed (retaining 14 daily, 8 weekly).
4. **Disaster Simulation**: Simulated total loss of original database by deleting `drill.db`, `drill.db-wal`, and `drill.db-shm`.
5. **Restore Execution**: Executed `scripts/restore.sh` pointing to the snapshot.
   - Verified backup integrity with `PRAGMA integrity_check;` -> `ok`.
   - Restored database file and cleared stale WAL/SHM handles.
   - Verified restored database integrity -> `ok`.
6. **Data Verification**:
   - Query verified workspace record exists.
   - Workspace name matched exactly: `Drill Hardware Store`.
   - Argon2id PIN verification for `4321` succeeded.

## Conclusion
The backup and restore procedure is verified, atomic, and safe under WAL mode.

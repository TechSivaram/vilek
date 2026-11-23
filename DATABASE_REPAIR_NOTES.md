# ViLek database repair patch

## Changes

- Corrected `crewBankAccountEvidence.uploadedAt` to map to SQLite `uploaded_at`.
- Added migration `0010_repair_currency_resolution_audit_fk.sql`. It preserves the orphaned audit event and its original missing resolution ID in `details_json.orphanedResolutionId`, then links the event to the current resolution for the same claim. It does not delete audit rows or disable foreign-key enforcement.

## Apply

1. Back up the SQLite database file configured by `DATABASE_URL` before running migrations.
2. Merge this source patch into the current project, preserving `.env` and the database.
3. Run `npm run db:migrate`, then `npm run typecheck` and `npm run build`.
4. Verify with `PRAGMA foreign_key_check;` (expected: no rows).

The migration is data-preserving but normalizes the orphaned audit event's `resolution_id` to the current resolution for that claim. The original orphaned ID remains in the event's JSON details.

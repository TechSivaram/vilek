# ViLek Flight Operations — Schema Foundation (Migration 0003)

## Included

This additive migration adds the initial physical-schema foundation for Flight Operations:

- `Flight.status` with the agreed controlled status values; existing flights default to `SCHEDULED`.
- Crew-member/designation eligibility records.
- Qualification types, individual qualification records, and designation qualification requirements.
- Central designation crew-complement defaults and flight-specific crew requirements.
- Key/value Flight Operations settings.
- Durable assignment audit event storage with identity snapshots.
- Qualification alert deduplication/state records.
- Bulk-request idempotency records.
- Audit export and retention policy/action records.

## Preservation guarantees

- Existing `Flight_Crew` rows are not rewritten.
- Existing `Flight_Crew` primary keys are unchanged.
- The current `flight_crew_flight_member_uq` unique index remains unchanged.
- Existing `Expense.flight_crew_id` and `Claim.flight_crew_id` foreign keys are untouched.
- Existing Admin pages and APIs are untouched.
- The migration is additive apart from adding the `Flight.status` column with a default.

## Important scope boundary

This is a **schema foundation**, not the complete Flight Operations behavior implementation. The current assignment API still uses its pre-existing create/remove behavior. This migration does not yet:

- write `Flight_Crew_Audit_Event` from assignment operations;
- convert hard deletion to lifecycle-aware removal;
- enforce crew designation eligibility/qualification/duty-period rules in assignment APIs;
- implement settings UI, complement warnings, bulk assignment, alert delivery, audit UI/export, or retention jobs;
- change the existing unique assignment index to permit historical assignment episodes.

Those behaviors must be implemented in separate, tested steps. In particular, do not remove the current unique index or change assignment deletion semantics until expense/claim and API consumers have been migrated and regression-tested.

## Migration procedure

1. Back up the target SQLite database.
2. Verify the database is on migrations `0000` through `0002`.
3. Apply with the existing command: `npm run db:migrate`.
4. Verify `PRAGMA foreign_key_check;` returns no rows.
5. Verify all pre-existing `Flight_Crew`, `Expense`, and `Claim` row counts and IDs are unchanged.
6. Verify legacy flights receive `status = 'SCHEDULED'`.

The migration has been executed against an in-memory SQLite database using SQLite 3.46.1 after applying migrations `0000` through `0002`; all statements completed and `PRAGMA foreign_key_check` returned no violations. A TypeScript typecheck could not be completed in this environment because the dependency installation was incomplete (missing type definition packages); do not treat typecheck/build as passed.

## Operational configuration

No production rest, turnaround, reporting/release buffer, qualification alert interval, or audit retention values are seeded. These require explicit operational approval and regulatory review.

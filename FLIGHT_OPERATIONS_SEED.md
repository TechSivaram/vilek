# Flight Operations migration and demo seed

The Flight Operations schema is introduced by `drizzle/0003_flight_operations_foundation.sql`. The migration is included in this source bundle but is **not automatically assumed to have been applied**.

## Apply the migration

From the project root, after confirming `DATABASE_URL` points at the intended database:

```bash
npm run db:migrate
```

The migration runner applies any unapplied migrations in order, including `0003_flight_operations_foundation`.

## Seed demo data

```bash
npm run db:seed
```

The existing seed script still handles the original ViLek demo data and its TSCloak SCIM identity provisioning. After that work, it adds the Flight Operations demo reference data if migration `0003` is present. If the migration is not present in the database, it logs a clear skip message rather than failing with missing-table errors.

The Flight Operations additions are idempotent: they look up stable business keys before inserting rows, do not overwrite existing configuration or operational data, and do not create fake assignment audit events. Sample policy values are illustrative only and are not regulatory guidance.

## Included Flight Operations examples

- Active crew-to-designation mappings, including one crew member with multiple designations.
- Qualification types and examples of current, expiring-soon, date-expired, suspended, and revoked qualifications.
- Designation qualification requirements.
- Default crew complement settings and per-flight complement overrides.
- Reporting/release buffers, illustrative rest/turnaround values, and expiry-alert intervals.
- Demo flights in `SCHEDULED`, `BOARDING`, `DEPARTED`, `COMPLETED`, and `CANCELLED` states.
- A small number of safe assignments to demonstrate complement readiness, plus deduplicated expiry-alert examples.

The seed uses existing fictional demo identities; it does not create additional TSCloak identities or assign passwords.

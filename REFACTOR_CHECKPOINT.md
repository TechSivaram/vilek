# ViLek Refactor Checkpoint 3 — Explicit Flight Operations repositories

## Changes in this checkpoint

- Replaced generic resource configuration in Airlines, Airports, and Crew Designations repositories with direct Drizzle table references.
- Replaced dynamic table-column lookup for sorting with explicit `switch` cases and feature-specific searchable columns.
- Replaced generic CRUD-factory writes in Airlines, Airports, Crew Designations, Crew Members, and Flights with direct Drizzle insert/update/deactivate operations.
- Removed the now-unused Flight Operations `resources.ts` and `features/repository-crud.ts`.
- Removed raw SQL string concatenation from Crew Members search/name projection. Name display is now composed in JavaScript after the database query.
- Kept the shared `db` instance and existing feature repository export names.

## Verification performed

- ZIP contents extracted and rewritten successfully.
- Static reference scan: no `resourceConfigs` references remain in Flight Operations source.
- Static reference scan: no `makeCrudRepository` references remain in Flight Operations source.
- Static reference scan: no remaining `OperationsField`, `OperationsResourceConfig`, or `FieldKind` imports/references outside the removed Operations configuration.
- Full TypeScript check and Next.js production build were not run because this archive does not include `node_modules`.

## Remaining work

- Admin still uses generic `resourceConfigs` and `makeCrudRepository` patterns; this checkpoint intentionally does not change Admin.
- Review and test feature DTO typing, validation, API behavior, authorization, and persistence with dependencies installed before deployment.

# DTO / Service / Repository Refactor Status

## This checkpoint

- Added `src/lib/operations/maintenance-resource.repository.ts` as the shared SQLite persistence boundary for the remaining standard maintenance-resource handlers. It owns the database connection lifecycle, projection SQL, insert statements, and update statements.
- Added `src/lib/operations/maintenance-resource.service.ts` as the service-facing entry point.
- Migrated collection GET/POST handlers for audit exports, audit retention actions, audit retention policy, batch requests, designation qualification requirements, flight crew audit, and flight operations settings to call the service instead of opening SQLite connections or issuing SQL in the route.
- Migrated the flight-operations-settings detail PATCH handler to the service.
- Kept the existing route guards, input schemas, HTTP response structures, and error statuses in place.

## Still outstanding

- Migrated `src/app/api/operations/flight-crew-requirements/route.ts` collection GET/POST persistence into `flight-crew-requirements/repository.impl.ts` and its service. The route now handles guard, input validation, and HTTP mapping only.
- Static scan of `src/app/api/**/route.ts` found no remaining `getMaintenanceDb()` or `.prepare()` usage in route handlers. This confirms the scanned direct-SQL pattern is gone, but does not prove every route has a complete feature-specific repository boundary.
- Replace the shared generic maintenance service/repository boundary with resource-specific interfaces and implementations where required by the architecture contract.
- Complete DTO coverage and response mapping across all API endpoints.
- Complete DTO coverage and response mapping across all API endpoints.
- Install dependencies and run `npm run typecheck`, `npm run build`, and endpoint regression tests. This checkpoint has not been build-verified.

# ViLek — Flight Operations Phase 1

## Feature isolation

Flight Operations has its own page and API paths. Existing `/admin/*` pages and `/api/admin/*` endpoints are intentionally unchanged.

## Pages

- `/operations` — Flight Operations overview
- `/operations/flights` — flight records
- `/operations/crew-members` — crew records
- `/operations/crew-designations` — crew designation reference data
- `/operations/airlines` — airline reference data
- `/operations/airports` — airport reference data

All pages under `/operations` are protected by the `FLIGHT_OPERATIONS_MANAGER` role at the Operations layout boundary.

## Dedicated APIs

- `/api/operations/flights`
- `/api/operations/flights/options`
- `/api/operations/crew-members`
- `/api/operations/crew-designations`
- `/api/operations/airlines`
- `/api/operations/airports`

The collection endpoints support the same validated list/create operations as their corresponding existing resource services; resource item endpoints support update/deactivation. Every Operations endpoint independently requires `FLIGHT_OPERATIONS_MANAGER`.

## Shared infrastructure

The Operations feature reuses the existing database schema, authentication/RBAC guard, resource validation schemas, and domain service/repository implementations. It does not call `/api/admin/*`. This avoids duplicating data/business logic while keeping feature pages, navigation, API routes, and route authorization separate.

## Boundary

Do not modify `/admin/*`, `/api/admin/*`, or Admin feature components when continuing Flight Operations work unless a separately agreed cross-cutting change is required.

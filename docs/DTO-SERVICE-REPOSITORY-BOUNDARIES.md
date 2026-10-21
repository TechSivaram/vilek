# DTO → Service → Repository boundaries

## Contract

1. `dto.ts` is the source of truth for API input/output contracts.
2. `schema.ts` defines Zod schemas explicitly checked against the corresponding DTO types.
3. Route handlers authenticate/authorize, validate untrusted route/query/body inputs, and pass the parsed DTO to a service. Services must not accept raw `Request` objects or unvalidated JSON.
4. Services own business rules and orchestration. They accept DTO/domain input types, not `Record<string, unknown>`.
5. Repositories expose persistence operations and do not depend on HTTP request/response types.
6. Add a `mapper.ts` when API DTO and domain/persistence representations differ (renamed fields, nested values, enum conversion, computed response fields, or sensitive persistence fields). Do not add no-op mappers where the representations are identical.
7. Return explicit response DTOs for public API contracts; do not expose persistence rows wholesale when they contain internal fields.

## Changes in this update

For existing feature modules that already define create/update DTOs, service `create` and `update` method inputs now use those DTO types rather than `Record<string, unknown>`. This moves compile-time contract checking to the service boundary without duplicating the repository implementation or changing database behavior.

This is an incremental refactor, not a claim that every route/module is fully migrated. Modules without complete request/response DTOs, response validation, mapping, or a route-to-service path audit still require review. Keep authentication/authorization and record-level authorization separate from input validation.

# ViLek API Security and Architecture Audit

**Scope:** Source tree supplied as `src.zip`; static first-pass audit of the 61 `src/app/api/**/route.ts` files. This is an inventory, not a claim that every business rule or query has been manually verified. Run build/typecheck/tests after any fixes.

## Architecture target

For protected business APIs, use:

`Client -> API route (session/token verification, role/permission authorization, Zod request validation, DTO response mapping) -> service (business rules) -> repository (database access)`

Services may call other services. Repositories own persistence. Routes should not issue SQL or call database drivers directly. Define explicit, documented exceptions for OIDC login/callback/logout and other protocol endpoints.

## Authentication / authorization

- `withRouteGuard` is used by the business/admin routes found in this scan. It authenticates via `getAuthorizationContext`, checks requested ViLek roles/permissions, and includes Origin checks for cookie-authenticated mutations.
- Admin routes generally require `ADMIN`; flight operations routes generally require `FLIGHT_OPERATIONS_MANAGER`.
- Four `/api/auth/*` endpoints do not use `withRouteGuard`, which is expected for login/callback/logout and the identity endpoint, but each must retain its flow-specific protections.
- Four `/api/profile/mfa/*` endpoints do not use `withRouteGuard`; inspection of `src/lib/auth/mfa-proxy.ts` confirms the proxy validates the ViLek access token and local authenticated user, checks Origin for mutating requests, bounds POST bodies, forwards the user's own access token to TSCloak, uses `no-store`, and has a timeout. This is a specialized authenticated flow rather than an unguarded route.
- Record-level access and ownership checks still need manual verification per operation; a role guard alone does not establish resource-level authorization.

## Static findings

### Request validation gaps

These guarded routes did not contain an obvious Zod schema / parse call in the route source during the scan. Confirm whether validation is provided by a called service before adding schemas; otherwise add Zod validation for query params, path params, and request bodies.

- `/api/admin/audit-log`
- `/api/admin/file-types`
- `/api/admin/file-types/[id]`
- `/api/admin/identity-provider`
- `/api/admin/operations`
- `/api/admin/system-settings`
- `/api/operations/audit-exports`
- `/api/operations/audit-retention-actions`
- `/api/operations/audit-retention-policy`
- `/api/operations/audit-retention-policy/[id]`
- `/api/operations/batch-requests`
- `/api/operations/crew-complement-defaults`
- `/api/operations/crew-complement-defaults/[id]`
- `/api/operations/crew-designation-assignments`
- `/api/operations/crew-designation-assignments/[id]`
- `/api/operations/crew-qualifications`
- `/api/operations/crew-qualifications/[id]`
- `/api/operations/designation-qualification-requirements`
- `/api/operations/designation-qualification-requirements/[id]`
- `/api/operations/flight-crew/options`
- `/api/operations/flight-crew-audit`
- `/api/operations/flight-crew-requirements`
- `/api/operations/flight-crew-requirements/[id]`
- `/api/operations/flights/options`
- `/api/operations/qualification-alerts`
- `/api/operations/qualification-alerts/[id]`
- `/api/operations/qualification-types`
- `/api/operations/qualification-types/[id]`

This is a lexical scan: a route can perform manual validation without Zod, so this list identifies review targets, not confirmed exploitable vulnerabilities.

### Persistence / layering violations

The following route files appear to access the database or SQLite maintenance connection directly and should be reviewed for extraction into repositories and services:

- `/api/admin/currencies/[id]`
- `/api/admin/expense-categories/[id]`
- `/api/admin/roles/[id]`
- `/api/admin/users/[id]`
- `/api/operations/airlines/[id]`
- `/api/operations/airports/[id]`
- `/api/operations/audit-exports`
- `/api/operations/audit-retention-actions`
- `/api/operations/audit-retention-policy`
- `/api/operations/audit-retention-policy/[id]`
- `/api/operations/batch-requests`
- `/api/operations/crew-complement-defaults`
- `/api/operations/crew-complement-defaults/[id]`
- `/api/operations/crew-designation-assignments`
- `/api/operations/crew-designation-assignments/[id]`
- `/api/operations/crew-designations/[id]`
- `/api/operations/crew-members/[id]`
- `/api/operations/crew-qualifications`
- `/api/operations/crew-qualifications/[id]`
- `/api/operations/designation-qualification-requirements`
- `/api/operations/designation-qualification-requirements/[id]`
- `/api/operations/flight-crew-audit`
- `/api/operations/flight-crew-requirements`
- `/api/operations/flight-crew-requirements/[id]`
- `/api/operations/flight-operations-settings`
- `/api/operations/flight-operations-settings/[id]`
- `/api/operations/flights/[id]`
- `/api/operations/qualification-alerts`
- `/api/operations/qualification-alerts/[id]`
- `/api/operations/qualification-types`
- `/api/operations/qualification-types/[id]`

### DTOs

The source has relatively few files named as DTOs. Review request and response contracts for explicit DTO types/schemas, especially at the API/service boundary. Do not blindly duplicate types when Zod `z.infer` can be the single source of truth.

## Recommended implementation order

1. Add/centralize tests for `withRouteGuard`, role-denied responses, expired/invalid token handling, cookie mutation Origin checks, and the MFA proxy.
2. Fix any confirmed authorization or input-validation defects before refactoring architecture.
3. Create reusable Zod request/response schemas and DTOs for endpoints that lack them.
4. Move inline SQL / SQLite maintenance operations from route handlers into repositories; put orchestration/business rules in services.
5. Ensure response DTOs avoid leaking internal fields or upstream TSCloak responses unintentionally.
6. Run `npm run typecheck`, `npm run lint`, and `npm run build`; exercise auth and role-specific endpoint tests before deployment.

## Status

Static inventory and MFA proxy review completed. This file does not certify the application as secure. No application source files were changed as part of this inventory-only pass.

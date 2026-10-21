# ViLek API Security and Architecture Refactor — Status

## Current source scope

This bundle contains the latest provided ViLek source plus the feature-layer updates documented below. It does not add placeholder APIs for `/api/approver/**`, `/api/crew/**`, or `/api/finance/**`; those routes require agreed product workflows and data contracts.

## Confirmed static checks

- 61 API route files: 17 Admin, 36 Operations, 4 Auth, and 4 Profile/MFA.
- All 17 Admin and 36 Operations route handlers reference `withRouteGuard`.
- Static scan found no direct `getMaintenanceDb()`, `.prepare()`, Prisma, or Drizzle references in API route handlers.
- No API route imports the legacy generic `maintenanceService` or `maintenanceResourceService`.
- TypeScript parser-only syntax validation passed for all 44 files changed in the latest pass.

These checks do not prove correct business authorization, DTO mapping, or data isolation.

## Architecture updates

- Added dedicated service/repository/interface/DTO contracts and response mappers for Audit Retention Policy, Designation Qualification Requirements, Flight Operations Settings, Batch Requests, Flight Crew Audit, Audit Retention Actions, and Audit Exports.
- Added repository/service update operations for Crew Complement Defaults, Flight Crew Requirements, Qualification Alerts, and Crew Qualifications, then routed the corresponding handlers through those feature services.
- History resources remain read-only and return HTTP 405 for POST.
- Existing request validation schemas and route guards were preserved.

## Remaining before a production-ready claim

1. Review every Admin and Operations method to ensure request DTOs are directly inferred from the operation-specific Zod schemas and response DTO mappers are actually used on every applicable success response.
2. Remove compatibility casts where they mask a mismatch between Zod output and service DTO input.
3. Test role-based permissions, record-level permissions, and cross-user/cross-record access for every protected operation.
4. Complete clean dependency installation and run `npm run typecheck`, `npm run lint`, and `npm run build`.
5. Exercise login/OIDC callback/logout and all MFA actions against the configured identity provider.

## Verification limitation

A project typecheck was attempted but could not proceed because the working environment has an incomplete dependency/type installation (missing definitions for `better-sqlite3`, `estree`, `json-schema`, `json5`, `node`, `react`, and `react-dom`). The parser-only syntax pass succeeded, but no passing semantic typecheck, lint, build, or integration test is claimed.

## Target architecture

`Client → API route (authentication, authorization, Zod validation, request/response DTO mapping) → Service (business rules) → Repository interface → Repository implementation (database access)`

Authentication exceptions remain intentional: login/OIDC callback are protected by protocol state/nonce checks; logout and `/me` require authenticated identity without a business role; MFA actions are limited to the current user's account.

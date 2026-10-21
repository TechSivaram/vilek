# ViLek API role and validation audit — preliminary

Audit baseline: extracted `/mnt/data/src.zip`, static source inspection. This report is a triage aid, not a completed penetration test. Route-level guard findings should be checked with integration tests.

## Role-specific workspace routes

| Role                      | Route         | Enforcement                                                                                   |
| ------------------------- | ------------- | --------------------------------------------------------------------------------------------- |
| Admin                     | `/admin`      | `src/app/admin/layout.tsx` uses `requireRole("ADMIN")`                                        |
| Flight Operations Manager | `/operations` | `src/app/operations/layout.tsx` uses `requireRole("FLIGHT_OPERATIONS_MANAGER", "/dashboard")` |
| Approver                  | `/approver`   | page uses `requireRole("APPROVER", "/dashboard")`                                             |
| Crew                      | `/crew`       | page uses `requireRole("CREW", "/dashboard")`                                                 |
| Finance                   | `/finance`    | page uses `requireRole("FINANCE", "/dashboard")`                                              |
| Workspace picker          | `/dashboard`  | uses `requireAuthenticatedUser()` and filters options by assigned roles                       |

Admin and Operations checks in layouts protect nested pages; they need not be duplicated in each page component.

## Shared MFA

MFA is shared across roles under `/profile/security` and `/api/profile/mfa/*`. `src/lib/auth/mfa-proxy.ts` uses `getValidatedAccessToken()` and `getLocalAuthenticatedUser()` before proxying with the user's own access token. Mutations also check request origin and require JSON with a body-size limit. MFA should not be restricted to one business role; ensure ownership remains user-scoped.

## API inventory snapshot

- Total API route files: **61**
- Admin routes: **17**
- Auth routes: **4** (specialized login/callback/logout/me flows; not expected to all use the generic route guard)
- Operations routes: **36**
- MFA routes: **4** (specialized shared proxy flow)

## Review items flagged by static scan

The scan flags routes that have no obvious Zod parse/safeParse in the route file, and routes that directly import maintenance DB access. Some routes may validate in a called service or use fixed/no-input operations, so a flag is not by itself proof of a vulnerability.

- **Input validation review:** `src/app/api/admin/audit-log/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/admin/file-types/[id]/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/admin/file-types/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/admin/identity-provider/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/admin/operations/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/admin/system-settings/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/audit-exports/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/audit-retention-actions/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/audit-retention-policy/[id]/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/audit-retention-policy/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/batch-requests/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/crew-complement-defaults/[id]/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/crew-complement-defaults/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/crew-designation-assignments/[id]/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/crew-designation-assignments/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/crew-qualifications/[id]/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/crew-qualifications/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/designation-qualification-requirements/[id]/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/designation-qualification-requirements/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/flight-crew/options/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/flight-crew-audit/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/flight-crew-requirements/[id]/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/flight-crew-requirements/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/flights/options/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/qualification-alerts/[id]/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/qualification-alerts/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/qualification-types/[id]/route.ts` has no obvious Zod parse/safeParse in the route file.
- **Input validation review:** `src/app/api/operations/qualification-types/route.ts` has no obvious Zod parse/safeParse in the route file.

## Next implementation order

1. Verify every API handler's guard and intended role against its business function.
2. Review resource/record-level authorization, especially ID-based read/update/delete endpoints.
3. Standardize request DTOs and Zod schemas for body, query, and route parameters.
4. Move route-level SQL and generic maintenance-table access into repositories/services.
5. Add negative authorization tests (missing token, wrong role, inactive role, cross-user MFA) and run typecheck/lint/build.

## Scope limitation

This is static inspection of the provided source ZIP. It does not establish runtime behavior, validate every service/repository call, or replace deployment testing.

## Change applied in this pass

- `src/app/api/auth/logout/route.ts` now calls `getLocalAuthenticatedUser()` before proceeding. Unauthenticated or invalid sessions receive HTTP 401. No business role is required, so logout remains available to every authenticated role. The existing same-origin check and TSCloak RP-initiated logout flow are retained.
- No other application code has been changed in this pass. Dedicated Approver, Crew, and Finance API namespaces still require endpoint-by-endpoint mapping and implementation; they should not be created as empty or duplicate wrappers without mapping the underlying business capabilities and updating clients.
- Typecheck/build could not be run in this extracted workspace because `node_modules` is not present.

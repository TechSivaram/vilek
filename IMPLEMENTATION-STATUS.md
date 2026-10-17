# ViLek consolidated admin update — implementation status

## Implemented in this bundle

- Dedicated feature endpoints for airlines, airports, crew members, crew designations, currencies, expense categories, flights, roles, users, user-role assignments, audit log, operations, system settings, allowed file types, and TSCloak/SCIM user sync.
- Removed the generic `/api/admin/[resource]` route handlers and removed feature route delegation to those handlers.
- Ordinary CRUD API routes are thin: admin route guard, request parsing, metadata-backed validation, service call, and HTTP response. Drizzle access for these CRUD operations lives in feature repository modules through a low-level repository helper.
- Dedicated feature service/repository boundaries now own list, create, update, deactivate, settings, file-type, audit/outbox, operations, user-role, and SCIM identity-link database operations.
- Server-side list search/filtering, allowlisted column sorting, `LIMIT`/`OFFSET`, and total counts for ordinary paginated admin resources.
- React Hook Form, Zod client validation, TanStack Query list fetching/mutations/invalidation, responsive list/card styling, and pagination controls are retained.
- Safeguards prevent self-deactivation and removal/deactivation of the last active administrator or its only active ADMIN role.
- Package-lock entries were added for the three UI packages missing from the previous lockfile. `npm ls --package-lock-only --depth=0` passes.
- Existing TSCloak OIDC, local ViLek RBAC, SCIM provisioning behavior, and SQLite schema were retained; no migration or destructive database change was added.

## Validation performed

- Static import-path audit: no missing local TypeScript import paths found.
- `npm ls --package-lock-only --depth=0`: passes with the package manifest dependencies represented in the lockfile.
- ZIP integrity will be checked after packaging.

## Validation limitations

- `npm ci` did not complete in the execution environment (network/dependency installation timed out). Consequently a real dependency-backed `tsc --noEmit`, ESLint run, and Next.js production build could not be completed here. Do not treat this as a verified production build.
- The lockfile package entries added for the UI dependencies have resolved tarball URLs but no integrity hashes because the registry metadata could not be fetched in this environment. Running `npm install` in a network-enabled environment will refresh authoritative integrity metadata.
- Some special read-only screens intentionally return operational/audit summaries rather than general CRUD lists; their current UI-specific contracts are preserved.

## Flight form validation update (2026-10-17)

- Added client-side field validation for required airline/airport selections, positive integer foreign keys, flight number format, valid date/time values, and scheduled/actual arrival-after-departure ordering.
- Added cross-field validation that origin and destination airports must differ.
- Added visible inline error messages, invalid-field styling, a form-level error summary, blur/change revalidation, and focus on the first invalid field after submit.
- Added matching server-side validation for flight IDs, flight number format, distinct origin/destination airports, valid timestamps, and chronological ordering.
- Full `npm run typecheck` and `npm run build` remain unverified in this environment because dependencies are not installed; only source inspection and TypeScript syntax-level invocation were attempted.

## ViLek user provisioning workflow (2026-10-17)

- The Users screen now offers **Add user** with required email, first name, and last name validation.
- The dedicated `POST /api/admin/users` handler creates the identity in TSCloak through the documented `POST /scim/v2/Users` endpoint, then creates the local ViLek user record.
- After provisioning, the handler calls the documented `POST /api/account/forgot-password` endpoint with the configured TSCloak client ID and email. It reports password-setup request status separately so a mail-flow failure does not conceal that the account was provisioned.
- No password is collected, generated in the browser, or stored by ViLek.
- The local identity starts with a `scim-pending:` subject marker because the SCIM resource ID is not guaranteed by the API contract to be identical to the OIDC `sub`. The existing identity-sync/reconciliation path must establish the correct subject before relying on OIDC login for that user.
- External TSCloak operations cannot be transactionally rolled back with SQLite. If TSCloak creates the user but the local write fails, the API reports the SCIM ID for manual reconciliation rather than encouraging a duplicate retry.
- The password-reset endpoint is documented as bearer-protected. The implementation attempts it using the server-side SCIM client-credentials token; whether that token is authorized for this endpoint depends on the deployed TSCloak policy. A non-2xx response is reported to the administrator and should be checked against TSCloak permissions/logs.

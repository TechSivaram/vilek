# ViLek Admin implementation handoff — 2026-10-16

This update replaces the admin placeholder pages with data-backed management interfaces and protected admin APIs. It reuses the existing `withRouteGuard` and local `ADMIN` role instead of adding a second guard system. No database schema or migration change is required.

## Implemented

- Shared CRUD manager for users (read-only identity fields, active state), predefined roles, crew members, airlines, airports, flights, crew designations, currencies, and expense categories.
- Local user-role assignment creation/removal with a safeguard against removing the final active administrator assignment.
- Guarded identity provider SCIM reconciliation action. It only reconciles existing local accounts by email and only replaces placeholder OIDC subjects; it does not create accounts or change roles.
- System settings for default currency and upload-size ceiling.
- Allowed file extension management.
- Read-only identity-provider configuration summary without secrets.
- Audit outbox view and read-only outbox operations status.
- Responsive data tables/forms and feedback states.

## Safety and scope

- Master-data deletion is implemented as deactivation to preserve historical references.
- The final active administrator cannot be deactivated, and the ADMIN role cannot be deactivated while it is the only active administrator role.
- Role permissions remain code-defined in `src/lib/auth/permissions.ts`; this interface does not edit a role-permission matrix.
- SCIM resource `id` is only mapped to `oidcSubject` for local placeholder subjects. Confirm SCIM id equals OIDC `sub` for the configured identity provider client before depending on this mapping.
- File-type configuration must be enforced by the server-side upload endpoint when one is implemented. This bundle does not add an upload endpoint.
- `Audit_Outbox` is not a comprehensive audit trail, and this implementation does not claim to log every admin mutation.
- Operations status is based on outbox records; no background worker or retry operation is invented.

## Validation

- ZIP archive integrity verified.
- Full TypeScript/lint/build checks could not be completed in this environment because dependency installation did not complete. Run `npm ci`, then `npm run typecheck`, `npm run lint`, and `npm run build` in the project environment before deploying.

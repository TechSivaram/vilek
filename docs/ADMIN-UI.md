# ViLek administrator UI

## Layout and navigation

The shared admin shell uses a desktop sidebar with collapse-to-icon-rail support, a responsive mobile/tablet drawer, common header/breadcrumbs, content area, and footer. Styles live in `src/app/admin/admin.css`.

## Implemented routes

- `/admin` — live database counts and navigation.
- `/admin/users` — list/search local users, inspect OIDC linkage, activate/deactivate accounts, and request safe TSCloak SCIM reconciliation.
- `/admin/roles` — update the predefined local role descriptions/names and active state. Role codes and permission grants are not editable in the UI; permission grants remain defined in `src/lib/auth/permissions.ts`.
- `/admin/user-roles` — assign/remove local roles. The API prevents removal/deactivation of the last active administrator.
- `/admin/identity-provider` — read-only safe configuration metadata; no secrets are returned and no live health is inferred.
- `/admin/crew-members` — create/update/deactivate crew records linked to existing ViLek users.
- `/admin/crew-designations` — create/update/deactivate designation reference data.
- `/admin/airlines` — create/update/deactivate airline reference data.
- `/admin/airports` — create/update/deactivate airport reference data.
- `/admin/flights` — create/update/deactivate scheduled flight records.
- `/admin/expense-categories` — create/update/deactivate expense categories.
- `/admin/currencies` — create/update/deactivate currencies and minor units.
- `/admin/settings` — save default currency and maximum upload size.
- `/admin/file-types` — add/remove allowed file extensions.
- `/admin/audit-log` — display the most recent `Audit_Outbox` records.
- `/admin/operations` — display outbox pending/error counts and recent delivery records; read-only.

## API protection

Admin data APIs live under `src/app/api/admin/`. Each handler uses `withRouteGuard({ roles: ["ADMIN"] }, ...)`; mutating cookie-authenticated requests are subject to the existing same-origin Origin check. Inputs are restricted to fields in the server-side resource allowlist and database constraints remain in force. Deactivation is preferred over hard deletion for master records with historical references.

## Important scope and limitations

- TSCloak sync uses client-credentials SCIM access on the server. It matches provider users to existing local users by email and only replaces explicitly marked placeholder `oidcSubject` values. It does not create local users or change local roles. Confirm the provider's SCIM resource ID equals the OIDC `sub` before relying on automated relinking.
- Role permissions are still code-defined; this UI does not edit the permission matrix or create arbitrary permission-bearing roles.
- File extensions are stored as policy configuration. Any future upload handler must enforce both the configured extension allowlist and upload size on the server; this repository bundle does not implement an expense-document upload endpoint.
- `Audit_Outbox` is an outbox, not a comprehensive audit history. The audit page does not claim otherwise, and this implementation does not add audit events for every admin mutation.
- Operations are read-only because a background worker/retry mechanism is not implemented here.
- Settings require at least one active currency. Upload policy must be consumed by the upload endpoint when implemented.
- Role management and assignments are protected by the admin API, not merely by hidden UI controls.

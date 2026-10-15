# ViLek administrator UI foundation

## Layout and navigation

- `/admin` is the live-count administration dashboard.
- A shared sidebar groups navigation into Identity & Access, Crew & Operations, Finance & Expenses, and System.
- Desktop uses a fixed sidebar with a collapse-to-icon-rail option.
- Tablet and mobile use a slide-in drawer, backdrop dismissal, and Escape-key dismissal.
- The common header, breadcrumbs, page content region, and footer are shared by all admin routes.
- Styles are separated into `src/app/admin/admin.css`; login presentation is in `src/app/login/login.css`. The existing crew expense workspace continues to use `src/app/globals.css`.

## Routes

- `/admin/users`
- `/admin/roles`
- `/admin/user-roles`
- `/admin/identity-provider`
- `/admin/crew-members`
- `/admin/crew-designations`
- `/admin/airlines`
- `/admin/airports`
- `/admin/flights`
- `/admin/expense-categories`
- `/admin/currencies`
- `/admin/settings`
- `/admin/file-types`
- `/admin/audit-log`
- `/admin/operations`

Except for the dashboard, these routes are honest placeholders. They show intended capabilities but do not claim those operations are implemented. In particular, the Users page does not yet invoke SCIM.

## Access control

The `/admin` layout requires a valid ViLek login and an active local `ADMIN` role assignment. The workspace only displays the Administration navigation link for that role, but the server-side layout is the actual page gate. Any future mutating API must perform its own server-side authorization; layout checks do not secure APIs.

## Next implementation steps

1. Build User Management and the SCIM sync endpoint, verify SCIM `id` against OIDC `sub`, and preserve local roles.
2. Implement role management and role assignments with explicit permission checks and audit events.
3. Implement reference-data CRUD screens.
4. Implement system settings, file-type policy enforcement, and an actual audit pipeline.
5. Add integration health checks only after server-side checks are defined.

# ViLek authentication and route authorization

ViLek uses TSCloak to authenticate identity. Application authorization is based only on active local ViLek `User_Role` assignments and active `Role` records. Do not trust role claims supplied by TSCloak for ViLek access decisions.

## Shared helpers

- `getAuthorizationContext()` validates the current access token and resolves the active local user and their active local role codes.
- `requireAuthenticatedUser()` is a Server Component/page guard. It redirects unauthenticated visitors to `/login`.
- `requireRole("ADMIN")` is a page guard. By default, an authenticated user lacking the required role is redirected to `/`.
- `requirePermission("USER_MANAGE")` is a page guard backed by the local role-to-permission mapping.
- `withRouteGuard({ roles: ["ADMIN"] }, handler)` protects a Route Handler and returns JSON `401` or `403` responses.

## Protect every API endpoint independently

A layout guard does not secure API routes. Every sensitive API endpoint must use a route guard (or perform equivalent server-side authorization) even if it is only called by a protected page.

Example:

```ts
import { withRouteGuard } from "@/lib/auth/route-protection";

export const GET = withRouteGuard(
  { permissions: ["USER_READ"] },
  async (_request, _context, auth) => {
    // Use auth.user.id as the local user ID. Query and return data here.
    return Response.json({ userId: auth.user.id });
  },
);
```

For mutations, the wrapper requires a same-origin `Origin` header when authentication comes from the ViLek access-token cookie. Explicit Bearer-token callers are treated as API clients and do not use the browser Origin check. Mutation handlers must still validate input and enforce any resource-specific access rules.

## Role and permission semantics

- `roles: ["ADMIN", "AUDITOR"]` means the user must have **at least one** listed active local role.
- `permissions: ["USER_READ", "AUDIT_READ"]` means the user must have **all** listed permissions.
- If both `roles` and `permissions` are supplied, both conditions must pass.
- The initial mapping in `src/lib/auth/permissions.ts` is deliberately local and conservative. Review the business meaning before using a permission for a new workflow.

## Current role mapping

- `ADMIN`: all permissions declared in `VILEK_PERMISSIONS`.
- `CREW`: `CLAIM_READ`, `CLAIM_CREATE`.
- `APPROVER`: `CLAIM_READ`, `CLAIM_REVIEW`.
- `FINANCE`: `CLAIM_READ`, `FINANCE_PROCESS`.
- `FLIGHT_OPERATIONS_MANAGER`: crew, designation, airline, airport, and flight operations permissions only; it does not grant user administration or claim approval.

The administrator section currently requires the local `ADMIN` role. The existing `/api/auth/*` endpoints are authentication endpoints and keep their purpose-specific behavior; do not wrap the login, callback, or logout handlers with an administrator guard.

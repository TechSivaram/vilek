# ViLek API Security and Architecture Refactor — Status

## Included in this bundle

- The latest provided source tree, with the targeted authenticated-logout change in `src/app/api/auth/logout/route.ts`.
- The existing API role audit in `ViLek_API_Role_Audit.md`.
- This status note documenting confirmed scope and verification limits.

## Verified from static inspection

- There are 61 API route handlers: 17 under `/api/admin`, 36 under `/api/operations`, 4 under `/api/auth`, and 4 under `/api/profile/mfa`.
- All 17 `/api/admin` route handlers reference `withRouteGuard`.
- All 36 `/api/operations` route handlers reference `withRouteGuard`.
- Auth routes use dedicated authentication-flow logic rather than business-role guards. This is appropriate for login and OIDC callback; logout is now intended to require an authenticated user without a business-role restriction; `/me` requires a validated authenticated identity.
- MFA routes use the dedicated MFA proxy and are not business-role-specific.

## Important incomplete work

This is **not yet a fully completed architecture migration**. In particular:

1. The source currently has no `/api/approver/**`, `/api/crew/**`, or `/api/finance/**` route handlers. Creating meaningful endpoints requires mapping existing product workflows and data contracts; placeholder APIs would not be a safe substitute.
2. Route guard presence does not prove record-level authorization or correct business permissions. These require handler/service-level review and tests.
3. Some handlers call database helpers directly. Service/repository boundaries are not yet consistently enforced across all features.
4. Zod validation and DTO coverage are incomplete in some feature areas. Each request shape and response contract needs feature-by-feature review; a text scan alone cannot prove validation coverage.
5. No full typecheck/build/test pass has been completed in this environment. The available `node_modules` tree is incomplete/inconsistent for TypeScript type definitions (`@types/node`, React, `better-sqlite3`, and several transitive type packages fail to resolve). Do not treat this bundle as build-verified.

## Logout behavior

`POST /api/auth/logout` now checks for a locally authenticated user via `getLocalAuthenticatedUser()` and returns HTTP 401 when none is present. It does not require a business role. It preserves the same-origin check, clears local auth cookies, and redirects through the configured identity-provider logout URL.

## Required verification before deployment

Run from a clean install of the project's lockfile on a supported Node.js version:

```sh
npm ci
npm run typecheck
npm run lint
npm run build
```

Then test all protected endpoints with: (a) no token, (b) invalid/expired token, (c) valid token with wrong role, (d) valid token with correct role, and (e) cross-user record IDs. Test the OIDC login/callback/logout flows and each MFA action against the configured identity provider.

## Architecture target

`Client → API route (authentication, authorization, Zod, DTO mapping) → Service (business rules) → Repository (database access)`

Role namespaces: `/api/admin/**`, `/api/operations/**`, `/api/approver/**`, `/api/crew/**`, `/api/finance/**`.

Role-independent authenticated routes include `/api/auth/logout`, `/api/auth/me`, and `/api/profile/**` (with profile/MFA actions limited to the current user's own account). Login initiation and OIDC callback remain public entry points with their own state/nonce and protocol validation.

## MFA UI restoration (2026-10-21)

Restored `src/app/profile/security/page.tsx` and `src/components/profile/security-mfa-panel.tsx` from the previously working `vilek-security-mfa-ui-refined.zip` so the Security & MFA page design and behavior are preserved. The authenticated, role-independent logout change remains in place. This restoration itself has not been independently build-verified.

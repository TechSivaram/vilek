# ViLek Security and API Architecture Inspection

**Baseline:** `vilek-final-bundle-mfa-restored.zip` source tree  
**Inspection date:** 2026-10-21  
**Method:** static inspection of route handlers, shared auth utilities, workspace routes, MFA proxy, service layout, and package scripts. This is not a penetration test.

## Executive summary

The source has 61 API route handlers: 17 Admin, 36 Flight Operations, 4 authentication, and 4 MFA. All Admin and Operations route handlers reference `withRouteGuard`; MFA handlers use a dedicated proxy; authentication endpoints use specialized flow logic. This is a useful baseline, but it does not prove that every business permission and record relationship is correct.

**Status: inspection is not a fully completed security sign-off.** A complete automated build/test run could not be performed in this environment because dependency installation did not complete and TypeScript reports missing type packages. Do not deploy this artifact as if it had passed a clean CI run.

## Findings and actions

### Confirmed from static source

1. **Role workspaces exist:** `/admin`, `/operations`, `/approver`, `/crew`, and `/finance` have role-aware page protection. Workspace picker uses the authenticated user's roles.
2. **API namespaces currently present:** `/api/admin/**`, `/api/operations/**`, `/api/auth/**`, and `/api/profile/mfa/**`. There are no `/api/approver/**`, `/api/crew/**`, or `/api/finance/**` namespaces in this source snapshot.
3. **Shared guard coverage:** all 17 Admin and all 36 Operations route files reference `withRouteGuard`. The route-by-route role and record-authorization intent still requires integration tests.
4. **Shared MFA design:** MFA routes use a dedicated proxy, not a business-role guard. This is appropriate for all roles when actions are constrained to the current authenticated user's identity.
5. **Validation coverage is uneven:** some routes use Zod `safeParse`; other routes perform manual checks or no obvious schema parsing. Lack of `safeParse` in a route is a review signal, not automatically a vulnerability.
6. **Database architecture is mixed:** feature services exist under `src/lib/admin/features` and `src/lib/operations/features`, but some Operations maintenance handlers directly construct SQL statements in route handlers.
7. **Logout behavior:** `POST /api/auth/logout` requires a locally authenticated user without requiring a business role, retains an origin check, clears local auth cookies, and redirects to the configured identity-provider logout URL.
8. **Security & MFA UI:** the working refined `src/app/profile/security/page.tsx` and `src/components/profile/security-mfa-panel.tsx` are retained in this bundle.

### Follow-up risks to verify before production

- Test every API with no session, invalid/expired session, wrong role, correct role, and a valid role attempting an unauthorized record ID.
- Check that all write operations validate both the route ID and JSON body; reject malformed JSON, unexpected keys, oversized payloads, invalid types, and out-of-range values.
- Verify record-level constraints and ownership/relationship checks in the service/repository layer, particularly for user-role assignments, users, crew members, flight crew, qualifications, retention policies, and audit/maintenance endpoints.
- Verify every route's required permission against a written role-to-capability matrix. Guard presence alone is insufficient.
- Review OAuth/OIDC login initiation and callback state, nonce, PKCE (if configured), issuer, audience, redirect URI, and error handling against the identity provider configuration.
- Verify MFA status/enroll/verify/disable calls against a real TSCloak test realm, including that one user cannot operate on another user's account.
- Add the missing Approver/Crew/Finance API namespaces only after mapping actual screens, workflows, DTOs, and underlying capabilities. Do not create placeholder or duplicate endpoints merely to satisfy namespace naming.
- Continue migrating direct route-level SQL into repositories and services where this improves testability; do not make a blind bulk rewrite of the dynamic maintenance handlers.

## Build verification attempted

Commands:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
```

`npm ci` did not complete in the available execution window. `npm run typecheck` failed before checking project source because TypeScript could not find installed type definitions for `better-sqlite3`, `estree`, `json-schema`, `json5`, `node`, `react`, and `react-dom`. Therefore build, lint, and tests remain **unverified**. Re-run from a clean environment with network/package registry access:

```sh
npm ci
npm run typecheck
npm run lint
npm run build
```

## Architecture target

`Client → API route (authn/authz + Zod input schema + DTO mapping) → service (business rules) → repository (DB access)`

Authentication entry points and role-independent profile/MFA flows remain specialized. Login initiation and OIDC callback use protocol protections rather than a business-role guard; logout and `/me` require a valid authenticated identity but no business role. MFA actions must remain scoped to the caller's own account.

## Change scope

This inspection pass did not apply broad application-code changes because runtime verification was unavailable and unverified rewrites risk changing existing behavior. The prior authenticated-logout change and restored Security & MFA UI are retained. The items above are explicit follow-up work, not claims of completed fixes.

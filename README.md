# ViLek

ViLek is a crew expense and reimbursement application built with Next.js, TypeScript, Drizzle ORM, and SQLite.

## Current foundation

- **Domain schema:** `CrewMember`, `Flight`, `FlightCrew`, `Expense`, `Receipt`, `Claim`, and `ClaimExpense`.
- **ORM:** Drizzle ORM with inferred TypeScript types.
- **Local database:** SQLite, created automatically at `data/vilek.db`.
- **Architecture:** App Router UI → server-side data access → Drizzle schema/database adapter.
- **UI:** Branded dashboard with live database counts, recent expenses, and claims.

## Requirements

- Node.js 20+
- npm

## Start locally

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed   # optional sample data
npm run dev
```

Open <http://localhost:3001>.

The seed script inserts clearly identifiable demo data and should only be used in development. It skips seeding if a crew member already exists.

## TSCloak authentication

ViLek uses OIDC Authorization Code flow with PKCE (`S256`) and a **stateless access-token cookie**. There is no ViLek session store, session ID, or refresh-token storage.

- `GET /api/auth/login` starts the OIDC redirect.
- `GET /api/auth/callback/tscloak` validates state, exchanges the code, validates the ID token (including nonce), validates the access token, then stores **only the access token** in `vilek_access_token`.
- `GET /api/auth/me` returns the locally provisioned active user; otherwise it returns `401`.
- `POST /api/auth/logout` clears the local auth cookies, then redirects the browser to TSCloak `/session/end` so the identity-provider session is ended before returning to the registered ViLek login URL.
- The dashboard redirects to `/login` unless the access token is valid and its `sub` matches an active local `User.oidcSubject`.

The access-token cookie is `HttpOnly`, `SameSite=Lax`, `Secure` in production, and expires no later than the access token. The code rejects access tokens larger than 3,500 bytes rather than splitting/truncating them. The ID token and refresh token are not persisted. Since refresh tokens are not stored, users must sign in again after access-token expiry.

Configure the variables in `.env.example`. `TSCLOAK_REDIRECT_URI` must exactly match the callback URI registered in TSCloak. `TSCLOAK_POST_LOGOUT_REDIRECT_URI` must also be registered as an allowed post-logout redirect URI; logout redirects through TSCloak `/session/end` using `client_id` and `post_logout_redirect_uri`. `TSCLOAK_TOKEN_AUTH_METHOD` must match the client registration (`client_secret_post` or `client_secret_basic`). `TSCLOAK_ACCESS_TOKEN_AUDIENCE` defaults to `TSCLOAK_CLIENT_ID`; confirm the actual ViLek access token's `aud` claim and set an override only if TSCloak intentionally issues a different audience. The implementation expects RS256 JWT access tokens and validates signature against the provider JWKS, issuer, audience, expiry, and `nbf` when present.

**Provisioning prerequisite:** OIDC authentication alone does not grant ViLek access. Provision the user in the local `User` table with `oidcSubject` equal to the validated access token's `sub` and set `isActive=true`. ViLek permissions must come from local `Role` / `User_Role` records, never from TSCloak role claims.

**Local demo-user shortcut:** to map the seeded Ananya demo account to your own TSCloak identity, copy the `sub` claim from a fresh access token into `VILEK_SEED_OIDC_SUBJECT` in `.env`, then run `npm run db:seed` again. The seed updates the subject only if the existing value is still the synthetic `demo|ananya.sharma.demo@vilek.test`; it refuses to overwrite an already-provisioned non-demo identity. This is for local development only, not production provisioning.

Cookie authentication requires CSRF defenses for state-changing endpoints. The logout endpoint checks the request origin; continue to apply same-origin checks/CSRF tokens to future mutating cookie-authenticated API routes. Do not use this cookie approach for cross-site API consumers; external clients should send a Bearer access token in the `Authorization` header.

## Database commands

```bash
npm run db:generate # generate migrations from src/lib/db/schema.ts
npm run db:migrate  # apply generated migrations
npm run db:studio   # open Drizzle Studio
npm run db:seed     # add local sample records
npm run typecheck
npm run lint
npm run build
```

## Domain relationships

```text
CrewMember 1 ─── N FlightCrew N ─── 1 Flight
                    │
                    ├── 1 ─── N Expense 1 ─── N Receipt
                    │
                    └── 1 ─── N Claim 1 ─── N ClaimExpense N ─── 1 Expense
```

Business rules represented in the schema include unique crew badge numbers, unique flight/member assignments, unique claim numbers, one claim per expense, valid domain enum values, and assignment-owned expenses and claims. A remaining hardening item before production is to add composite foreign keys/triggers so `ClaimExpense.flightCrewId` must match both its claim and expense assignment; SQLite's standard foreign keys currently validate each referenced ID individually.

## Database portability

The active adapter is SQLite to keep local development and a simple Render deployment easy. Domain table definitions are kept in `src/lib/db/schema.ts` and app data access uses Drizzle. When moving to PostgreSQL, add the PostgreSQL Drizzle schema/adapter and generate/test a separate migration set; SQLite migrations and its integer-minor-unit money representation should not be blindly reused as PostgreSQL DDL.

For production on Render, ensure the SQLite database file is stored on a persistent disk. An ephemeral filesystem can be wiped on redeploy. PostgreSQL is the recommended choice if multiple instances or durable shared storage are required.

## Folder map

```text
src/
  app/                 Next.js pages and global styles
  lib/db/schema.ts     Typed domain schema
  lib/db/index.ts      SQLite connection and Drizzle instance
  lib/db/migrate.ts    Migration runner
  lib/db/seed.ts       Optional local demo data
drizzle/               Generated migrations
```

## Database scripts on Windows

Run these commands from the project root in PowerShell:

```powershell
npm install
Copy-Item .env.example .env  # only if .env does not already exist
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The shared database connection lives in `src/lib/db/client.ts`. Next.js server code imports it through `src/lib/db/index.ts`, which applies the `server-only` guard. Standalone Node.js scripts such as migration and seed import `./client` directly so they do not trigger the Next.js guard.

This project uses Drizzle ORM and SQLite. Prisma is not used.

## Finalized database schema (Drizzle + SQLite)

The schema in `src/lib/db/schema.ts` follows the supplied complete ViLek ER diagram and defines **22 entities**:

- People and authorization: `Gender`, `User`, `Role`, `User_Role`, `Crew_Member`
- Flight operations: `Airline`, `Flight`, `Airport`, `Crew_Designation`, `Flight_Crew`
- Expenses and claims: `Currency`, `Expense_Category`, `Expense`, `Expense_Document`, `Claim`, `Claim_Comment`, `Claim_Expense`
- System configuration: `Deployment_Setup`, `System_Setting`, `Allowed_File_Type`
- Notifications: `Notification`
- Audit and integration: `Audit_Outbox`

The schema is defined in Drizzle; no Prisma package or configuration is used. To create migrations for this schema, run `npm run db:generate`, then `npm run db:migrate`. If you have an existing database from the earlier seven-table prototype, back it up before migrating. Drizzle's generated migration creates the newly defined tables; it does not automatically migrate legacy data into the new model.

`npm run db:seed` inserts local demo/reference data. It is intended for a fresh development database only. The claim/expense same-assignment rule must also be validated in the service layer because the provided ER diagram's `Claim_Expense` table does not include a `flight_crew_id` column for a composite foreign key.

## TSCloak SCIM demo users

See [SCIM-SEEDING.md](./SCIM-SEEDING.md) for configuring and running the SCIM-backed demo seed. The seed provisions fictional TSCloak users before seeding local ViLek data. SCIM provisioning does not necessarily create passwords; configure credentials using TSCloak's supported admin workflow.

### Logout behavior

ViLek logout is a same-origin `POST /api/auth/logout`. The dashboard uses a POST form (not a GET link), and the handler clears the HttpOnly access-token cookie plus any in-progress OIDC transaction cookie before redirecting to `/login?loggedOut=1`. This is a **ViLek-local logout**: because this design deliberately discards the ID token, it does not claim to terminate the TSCloak SSO session. If TSCloak keeps its own browser session, signing in again may not prompt for credentials.

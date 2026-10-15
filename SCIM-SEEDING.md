# ViLek demo seed with TSCloak SCIM provisioning

`npm run db:seed` provisions the six fictional demo identities in TSCloak through SCIM first, then seeds ViLek's local demo data and local RBAC assignments. It is safe to re-run: existing users are matched by email and are not duplicated.

## Configure `.env`

For local TSCloak, use `TSCLOAK_ISSUER=http://localhost:3000`. For hosted TSCloak, use `https://tscloak.onrender.com`. The issuer must exactly match the `iss` claim in tokens used for ViLek login.

```dotenv
TSCLOAK_ISSUER=http://localhost:3000
TSCLOAK_CLIENT_ID=your-vilek-client-id
TSCLOAK_SCIM_ENABLED=true
TSCLOAK_SCIM_CLIENT_ID=your-vilek-client-id
TSCLOAK_SCIM_CLIENT_SECRET=your-scim-enabled-client-secret
TSCLOAK_SCIM_TOKEN_AUTH_METHOD=client_secret_post
```

The TSCloak client must allow the Client Credentials grant and `scim` scope. The token endpoint authentication method must match the registered client. The script supports `client_secret_post` and `client_secret_basic`. The SCIM client ID must equal the ViLek OIDC client ID because this TSCloak deployment scopes provisioned users to the client associated with the SCIM token.

## Run

Back up the SQLite database, then run:

```powershell
npm run typecheck
npm run db:seed
```

The script requests a client-credentials token from `/token`, lists `/scim/v2/Users`, creates missing demo identities, then writes the SCIM resource IDs to ViLek `User.oidcSubject`. This mapping is appropriate only when this TSCloak deployment uses the SCIM user `id` as the OIDC `sub`. Verify that the `id` returned by SCIM matches the `sub` in an access token. If they differ, do not manually relink by unverified email; the identity-provider integration needs an explicit, verified subject-mapping mechanism.

## Passwords and login

SCIM provisioning creates identity/profile records; it does not guarantee that a password or login credential is created. The script intentionally does not invent or expose passwords and does not attempt to send passwords to SCIM. After provisioning, use TSCloak's supported administrator or credential-management workflow to set credentials for the demo users. If TSCloak has no supported password-setting flow, the SCIM script alone cannot make password login possible; a provider-side admin/credential API or UI is needed.

The six accounts use the reserved `.test` email domain and are fictional. They may not receive email, so do not depend on email-based password reset for these accounts. SCIM does not assign ViLek roles. All application roles remain in ViLek's local `Role` and `User_Role` tables.

## Safety

- Use only a development/test TSCloak client.
- Never commit `.env` or print client secrets/tokens.
- The script refuses to silently reactivate an existing inactive SCIM user.
- Existing non-demo `oidcSubject` mappings are not overwritten.
- The script stops before local DB seeding if SCIM authentication/provisioning fails.


**OpenAPI alignment:** The supplied TSCloak OpenAPI defines `POST /scim/v2/Users` with content type `application/scim+json` and a `ScimUserDto` whose only required field is `userName`; supported optional fields are `name.givenName`, `name.familyName`, `displayName`, `emails[].value`, `emails[].type`, `emails[].primary`, and `active`. The script sends only those fields and deliberately omits `schemas`, because this TSCloak endpoint rejects it. The script uses `GET /scim/v2/Users` to find existing resources and `POST /scim/v2/Users` to create missing ones. The supplied OpenAPI does not define the response schema in detail, so the script requires the list response to contain `Resources` and the create response to contain an `id` before mapping identities.

**Credential limitation from the supplied API contract:** `ScimUserDto` has no `password` property. SCIM seeding can create the identity/profile but cannot set a password through this endpoint. The OpenAPI also documents `POST /api/client/users` with required `username`, `email`, and `password`, but that is a separate client-user API—not a SCIM endpoint. This bundle continues to use SCIM as requested and does not silently switch APIs or invent passwords.


### Logout behavior

ViLek logout is a same-origin `POST /api/auth/logout`. The dashboard uses a POST form (not a GET link), and the handler clears the HttpOnly access-token cookie plus any in-progress OIDC transaction cookie before redirecting to `/login?loggedOut=1`. This is a **ViLek-local logout**: because this design deliberately discards the ID token, it does not claim to terminate the TSCloak SSO session. If TSCloak keeps its own browser session, signing in again may not prompt for credentials.

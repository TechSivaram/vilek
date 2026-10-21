# ViLek Identity Provider Integration

ViLek integrates with an external identity provider through OIDC for sign-in and
SCIM 2.0 for provisioning/synchronization. Provider-specific optional APIs such
as MFA administration and password setup are configured separately; neither is
standardized by OIDC or SCIM.

## OIDC configuration

Configure these environment variables in local development and Render:

- `IDP_ISSUER`: exact issuer value published by the provider's OIDC discovery document.
- `IDP_CLIENT_ID`: ViLek's OIDC client identifier.
- `IDP_CLIENT_SECRET`: required for confidential clients and omitted for public PKCE clients.
- `IDP_ACCESS_TOKEN_AUDIENCE`: audience expected in the access token; defaults to `IDP_CLIENT_ID`.
- `IDP_REDIRECT_URI`: registered callback URI, defaulting locally to `/api/auth/callback/oidc`.
- `IDP_POST_LOGOUT_REDIRECT_URI`: registered post-logout URI.
- `IDP_SCOPES`: defaults to `openid profile email`.
- `IDP_TOKEN_AUTH_METHOD`: `client_secret_post`, `client_secret_basic`, or `none` for a public PKCE client.

ViLek uses authorization-code flow with PKCE, state and nonce validation, OIDC
discovery, JWKS signature verification, issuer/audience/time checks, and subject
validation. RP-initiated logout uses `end_session_endpoint` from discovery when
the provider publishes it; otherwise ViLek returns to its configured local
post-logout URL.

## SCIM configuration

- `IDP_SCIM_ENABLED`: set to `true` to enable SCIM provisioning/sync.
- `IDP_SCIM_BASE_URL`: SCIM 2.0 base URL, e.g. `https://idp.example/scim/v2`.
  If omitted, ViLek uses `<IDP_ISSUER>/scim/v2`.
- `IDP_SCIM_CLIENT_ID` and `IDP_SCIM_CLIENT_SECRET`: independent SCIM service-client credentials.
- `IDP_SCIM_TOKEN_URL`: optional OAuth token endpoint for the SCIM client. If omitted,
  ViLek uses `<IDP_ISSUER>/token`.
- `IDP_SCIM_SCOPE`: defaults to `scim`.
- `IDP_SCIM_TOKEN_AUTH_METHOD`: `client_secret_post` or `client_secret_basic`.

SCIM client credentials do **not** need to equal the OIDC client credentials.
SCIM token acquisition and SCIM base URL resolution are centralized in
`src/lib/identity-provider/scim.ts`.

## Single-column identity model

The `User` table retains only `oidc_subject`; there is no `scim_id` column.
New SCIM-provisioned accounts initially store the SCIM resource ID in
`oidc_subject`. At first successful OIDC sign-in, ViLek links an account by
email only if the ID token contains `email_verified: true`, then stores the OIDC
subject in `oidc_subject`.

Because a single column cannot retain both remote identifiers at once, SCIM
updates/deactivation resolve the remote SCIM resource by the user's email
instead of assuming `oidc_subject` is still the SCIM resource ID. Keep email
addresses unique and stable in the identity provider. Provider SCIM endpoints
must support SCIM filtering for `userName` or `emails.value` for these
operations to work.

The email-based first-login link is only performed for a verified email claim.
If the provider does not emit a verified email claim, the account must be
reconciled administratively rather than being linked based on an unverified
address.

## Optional provider capabilities

- `IDP_PASSWORD_SETUP_URL`: optional provider-specific password setup endpoint.
  This is not part of OIDC or SCIM. The endpoint must accept the request format
  currently used by ViLek (`clientId` and `email` JSON fields).
- `IDP_MFA_BASE_URL`: optional base URL for the provider's user-scoped MFA API.
  MFA endpoint paths and request/response formats are provider-specific. Do not
  set this unless the provider exposes compatible endpoints or an adapter has
  been implemented.

If a provider uses different request formats for these optional capabilities,
implement an adapter rather than embedding that provider's API assumptions in
general OIDC/SCIM code.

## Admin UI and authorization

The identity-provider administration endpoint returns configuration presence
and non-secret metadata only. Local ViLek roles and permissions remain managed
by ViLek; SCIM synchronization does not assign application roles.

## Deployment checklist

1. Set the OIDC issuer, client ID, secret/auth method, and access-token audience.
2. Register `/api/auth/callback/oidc` as an allowed redirect URI.
3. Register the configured post-logout URI if the provider supports RP-initiated logout.
4. Configure SCIM base/token URLs and separate SCIM credentials if provisioning is enabled.
5. Set optional MFA/password-setup capability URLs only when the provider supports compatible APIs.
6. Run `npm ci`, `npm run typecheck`, and `npm run build` before deployment.

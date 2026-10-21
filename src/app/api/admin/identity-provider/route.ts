import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
export const GET = withRouteGuard({ roles: ["ADMIN"] }, async () =>
  NextResponse.json({
    issuerConfigured: Boolean(process.env.IDP_ISSUER),
    clientConfigured: Boolean(process.env.IDP_CLIENT_ID),
    scimEnabled: process.env.IDP_SCIM_ENABLED === "true",
    scimCredentialsConfigured: Boolean(
      process.env.IDP_SCIM_CLIENT_ID && process.env.IDP_SCIM_CLIENT_SECRET,
    ),
    issuer: process.env.IDP_ISSUER ?? null,
    clientId: process.env.IDP_CLIENT_ID ?? null,
    scimBaseUrl: process.env.IDP_SCIM_BASE_URL ?? null,
    scimTokenUrl: process.env.IDP_SCIM_TOKEN_URL ?? null,
    passwordSetupConfigured: Boolean(process.env.IDP_PASSWORD_SETUP_URL),
    mfaConfigured: Boolean(process.env.IDP_MFA_BASE_URL),
  }),
);

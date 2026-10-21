import { NextResponse } from "next/server";
import { z } from "zod";

import { withRouteGuard } from "@/lib/auth/route-protection";
import { usersService } from "@/lib/admin/features/users/service";

export const dynamic = "force-dynamic";
type ScimUser = {
  id?: string;
  userName?: string;
  active?: boolean;
  name?: { givenName?: string; familyName?: string };
  displayName?: string;
  emails?: { value: string; primary?: boolean }[];
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}
async function getScimToken(issuer: string) {
  const clientId = requiredEnv("TSCLOAK_SCIM_CLIENT_ID");
  const clientSecret = requiredEnv("TSCLOAK_SCIM_CLIENT_SECRET");

  if (clientId !== requiredEnv("TSCLOAK_CLIENT_ID")) {
    throw new Error("TSCLOAK_SCIM_CLIENT_ID must match TSCLOAK_CLIENT_ID for this deployment.");
  }

  const method = (process.env.TSCLOAK_SCIM_TOKEN_AUTH_METHOD ?? "client_secret_post").toLowerCase();
  const form = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "scim",
  });
  const headers = new Headers({
    "content-type": "application/x-www-form-urlencoded",
    accept: "application/json",
  });

  if (method === "client_secret_post") {
    form.set("client_id", clientId);
    form.set("client_secret", clientSecret);
  } else if (method === "client_secret_basic") {
    headers.set(
      "authorization",
      `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    );
  } else {
    throw new Error(
      "TSCLOAK_SCIM_TOKEN_AUTH_METHOD must be client_secret_post or client_secret_basic.",
    );
  }

  const response = await fetch(`${issuer}/token`, {
    method: "POST",
    headers,
    body: form,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const body: unknown = await response.json().catch(() => ({}));
  const tokenResult = z
    .object({
      access_token: z.string().optional(),
      scope: z.string().optional(),
      error_description: z.string().optional(),
      error: z.string().optional(),
    })
    .safeParse(body);

  if (!response.ok || !tokenResult.success || !tokenResult.data.access_token) {
    const detail = tokenResult.success
      ? (tokenResult.data.error_description ?? tokenResult.data.error ?? "no access token returned")
      : "identity provider returned an invalid token response";
    throw new Error(`TSCloak token request failed (HTTP ${response.status}): ${detail}`);
  }

  if (tokenResult.data.scope && !tokenResult.data.scope.split(/\s+/).includes("scim")) {
    throw new Error("TSCloak returned a token without the scim scope.");
  }

  return tokenResult.data.access_token;
}

async function listScimUsers(issuer: string, token: string): Promise<ScimUser[]> {
  const users: ScimUser[] = [];
  const pageSize = 100;
  let startIndex = 1;

  // SCIM list endpoints may paginate; read all pages so local accounts are not
  // silently skipped once the provider has more than one page of identities.
  for (let page = 0; page < 100; page += 1) {
    const url = new URL(`${issuer}/scim/v2/Users`);
    url.searchParams.set("startIndex", String(startIndex));
    url.searchParams.set("count", String(pageSize));

    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/scim+json, application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const payload: unknown = await response.json().catch(() => ({}));
    const parsed = z
      .object({
        Resources: z
          .array(
            z.object({
              id: z.string().optional(),
              userName: z.string().optional(),
              active: z.boolean().optional(),
              name: z
                .object({
                  givenName: z.string().optional(),
                  familyName: z.string().optional(),
                })
                .optional(),
              displayName: z.string().optional(),
              emails: z
                .array(
                  z.object({
                    value: z.string(),
                    primary: z.boolean().optional(),
                  }),
                )
                .optional(),
            }),
          )
          .optional(),
        totalResults: z.number().int().nonnegative().optional(),
        itemsPerPage: z.number().int().nonnegative().optional(),
        startIndex: z.number().int().positive().optional(),
        detail: z.string().optional(),
        message: z.string().optional(),
      })
      .safeParse(payload);

    if (!response.ok || !parsed.success || !Array.isArray(parsed.data.Resources)) {
      const detail = parsed.success
        ? (parsed.data.detail ?? parsed.data.message ?? "expected a SCIM Resources list")
        : "identity provider returned an invalid SCIM list response";
      throw new Error(`TSCloak SCIM list failed (HTTP ${response.status}): ${detail}`);
    }

    const pageUsers = parsed.data.Resources;
    users.push(...pageUsers);

    const totalResults = parsed.data.totalResults;
    if (totalResults === undefined || users.length >= totalResults || pageUsers.length === 0) {
      return users;
    }

    startIndex += pageUsers.length;
  }

  throw new Error("TSCloak SCIM list exceeded the 100-page safety limit.");
}

export const POST = withRouteGuard({ roles: ["ADMIN"] }, async () => {
  try {
    if (process.env.TSCLOAK_SCIM_ENABLED !== "true") {
      return NextResponse.json(
        {
          error: "SCIM sync is disabled. Set TSCLOAK_SCIM_ENABLED=true to enable it.",
        },
        { status: 503 },
      );
    }

    const issuer = requiredEnv("TSCLOAK_ISSUER").replace(/\/$/, "");
    const token = await getScimToken(issuer);
    const providerUsers = await listScimUsers(issuer, token);
    let created = 0;
    let matched = 0;
    let alreadyImported = 0;
    let inactiveAtProvider = 0;
    let unmatched = 0;

    for (const identity of providerUsers) {
      const email =
        identity.emails?.find((entry) => entry.primary)?.value ??
        identity.emails?.[0]?.value ??
        (identity.userName?.includes("@") ? identity.userName : undefined);

      if (!email || !identity.id) {
        unmatched += 1;
        continue;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const givenName = identity.name?.givenName?.trim();
      const familyName = identity.name?.familyName?.trim();
      const displayParts = (identity.displayName ?? "").trim().split(/\s+/).filter(Boolean);
      const firstName = givenName || displayParts[0] || identity.userName || normalizedEmail;
      const lastName = familyName || displayParts.slice(1).join(" ") || "Unknown";

      if (identity.active === false) inactiveAtProvider += 1;

      const local = await usersService.findByEmail(normalizedEmail);
      if (local) {
        matched += 1;
        if (local.oidcSubject === identity.id) alreadyImported += 1;
        continue;
      }

      try {
        const result = usersService.importFromScim({
          email: normalizedEmail,
          firstName,
          lastName,
          scimId: identity.id,
          isActive: identity.active !== false,
        });

        if (result.created) created += 1;
        else {
          matched += 1;
          if (result.user.oidcSubject === identity.id) alreadyImported += 1;
        }
      } catch (error) {
        // Keep processing the other provider users; the response reports partial failures.
        unmatched += 1;
        console.error("Failed to import SCIM user into ViLek", {
          scimId: identity.id,
          email: normalizedEmail,
          error: error instanceof Error ? error.message : "Unknown database error",
        });
      }
    }

    const message =
      `SCIM sync completed. ${created} new provider users imported into ViLek; ` +
      `${matched} already-existing local accounts matched; ${alreadyImported} were already imported from SCIM; ` +
      `${unmatched} provider identities could not be imported` +
      (inactiveAtProvider ? `; ${inactiveAtProvider} provider accounts are inactive` : "") +
      ". Local ViLek role assignments were preserved. Newly imported accounts store the provider resource ID verbatim in oidc_subject without a synthetic prefix.";

    return NextResponse.json({
      ok: true,
      message,
      created,
      matched,
      alreadyImported,
      unmatched,
      inactiveAtProvider,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TSCloak sync failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
});

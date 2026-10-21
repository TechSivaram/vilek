import { NextResponse } from "next/server";
import { z } from "zod";

import { withRouteGuard } from "@/lib/auth/route-protection";
import { usersService } from "@/lib/admin/features/users/service";

import { getScimAccessToken, getScimBaseUrl } from "@/lib/identity-provider/scim";
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

async function listScimUsers(issuer: string, token: string): Promise<ScimUser[]> {
  const scimBaseUrl = getScimBaseUrl(issuer);
  const users: ScimUser[] = [];
  const pageSize = 100;
  let startIndex = 1;

  // SCIM list endpoints may paginate; read all pages so local accounts are not
  // silently skipped once the provider has more than one page of identities.
  for (let page = 0; page < 100; page += 1) {
    const url = new URL(`${scimBaseUrl}/Users`);
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
      throw new Error(`identity provider SCIM list failed (HTTP ${response.status}): ${detail}`);
    }

    const pageUsers = parsed.data.Resources;
    users.push(...pageUsers);

    const totalResults = parsed.data.totalResults;
    if (totalResults === undefined || users.length >= totalResults || pageUsers.length === 0) {
      return users;
    }

    startIndex += pageUsers.length;
  }

  throw new Error("identity provider SCIM list exceeded the 100-page safety limit.");
}

export const POST = withRouteGuard({ roles: ["ADMIN"] }, async () => {
  try {
    if (process.env.IDP_SCIM_ENABLED !== "true") {
      return NextResponse.json(
        {
          error: "SCIM sync is disabled. Set IDP_SCIM_ENABLED=true to enable it.",
        },
        { status: 503 },
      );
    }

    const issuer = requiredEnv("IDP_ISSUER").replace(/\/$/, "");
    const scimBaseUrl = getScimBaseUrl(issuer);
    const token = await getScimAccessToken(issuer);
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
    const message = error instanceof Error ? error.message : "Identity provider sync failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
});

import "server-only";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

/** Acquire a SCIM bearer token independently from the OIDC login client. */
export async function getScimAccessToken(issuer: string): Promise<string> {
  const clientId = requiredEnv("IDP_SCIM_CLIENT_ID");
  const clientSecret = requiredEnv("IDP_SCIM_CLIENT_SECRET");
  const method = (process.env.IDP_SCIM_TOKEN_AUTH_METHOD ?? "client_secret_post").toLowerCase();
  const form = new URLSearchParams({
    grant_type: "client_credentials",
    scope: process.env.IDP_SCIM_SCOPE?.trim() || "scim",
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
      "IDP_SCIM_TOKEN_AUTH_METHOD must be client_secret_post or client_secret_basic.",
    );
  }

  const tokenUrl = process.env.IDP_SCIM_TOKEN_URL?.trim() || `${issuer.replace(/\/$/, "")}/token`;
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers,
    body: form,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const body: unknown = await response.json().catch(() => ({}));
  const result = body as {
    access_token?: unknown;
    error_description?: unknown;
    error?: unknown;
  };
  if (!response.ok || typeof result.access_token !== "string" || !result.access_token) {
    const detail =
      (typeof result.error_description === "string" && result.error_description) ||
      (typeof result.error === "string" && result.error) ||
      "no access token returned";
    throw new Error(
      `Identity provider SCIM token request failed (HTTP ${response.status}): ${detail}`,
    );
  }
  return result.access_token;
}

export function getScimBaseUrl(issuer: string): string {
  return (process.env.IDP_SCIM_BASE_URL?.trim() || `${issuer.replace(/\/$/, "")}/scim/v2`).replace(
    /\/$/,
    "",
  );
}

type ScimUserSummary = {
  id?: string;
  userName?: string;
  emails?: Array<{ value?: string; primary?: boolean }>;
};
type ScimListResponse = { Resources?: ScimUserSummary[] };

/** Resolve a remote SCIM resource ID without assuming it equals the OIDC sub. */
export async function findScimResourceIdByEmail(
  baseUrl: string,
  token: string,
  email: string,
): Promise<string | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const filters = [
    `userName eq "${normalizedEmail.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
    `emails.value eq "${normalizedEmail.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
  ];

  for (const filter of filters) {
    const url = new URL(`${baseUrl.replace(/\/$/, "")}/Users`);
    url.searchParams.set("filter", filter);
    url.searchParams.set("count", "100");
    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/scim+json, application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) continue;
    const payload = (await response.json().catch(() => ({}))) as ScimListResponse;
    const match = (payload.Resources ?? []).find((user) => {
      const userName = user.userName?.trim().toLowerCase();
      const emails = (user.emails ?? []).map((item) => item.value?.trim().toLowerCase());
      return userName === normalizedEmail || emails.includes(normalizedEmail);
    });
    if (match?.id) return match.id;
  }
  return null;
}

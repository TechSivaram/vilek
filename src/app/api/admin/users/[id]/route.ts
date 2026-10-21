import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { updateInputSchema } from "@/lib/admin/features/users/schema";
import { usersService } from "@/lib/admin/features/users/service";
type Ctx = { params: Promise<{ id: string }> };
function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

async function getScimToken(issuer: string) {
  const clientId = requiredEnv("TSCLOAK_SCIM_CLIENT_ID");
  const clientSecret = requiredEnv("TSCLOAK_SCIM_CLIENT_SECRET");
  if (clientId !== requiredEnv("TSCLOAK_CLIENT_ID"))
    throw new Error("SCIM client ID must match the configured OIDC client ID.");
  const method = (
    process.env.TSCLOAK_SCIM_TOKEN_AUTH_METHOD ?? "client_secret_post"
  ).toLowerCase();
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
  } else if (method === "client_secret_basic")
    headers.set(
      "authorization",
      `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    );
  else
    throw new Error(
      "TSCLOAK_SCIM_TOKEN_AUTH_METHOD must be client_secret_post or client_secret_basic.",
    );
  const response = await fetch(`${issuer}/token`, {
    method: "POST",
    headers,
    body: form,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const body = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    error_description?: string;
    error?: string;
  };
  if (!response.ok || !body.access_token)
    throw new Error(
      `Identity provider token request failed (HTTP ${response.status}): ${body.error_description ?? body.error ?? "no access token returned"}`,
    );
  return body.access_token;
}

export const PATCH = withRouteGuard(
  { roles: ["ADMIN"] },
  async (request: Request, context: Ctx, auth) => {
    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }
    const parsed = updateInputSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );

    let current: Awaited<ReturnType<typeof usersService.findById>>;
    try {
      current = await usersService.findById(id);
    } catch {
      return NextResponse.json(
        { error: "Could not load the user before updating it." },
        { status: 500 },
      );
    }
    if (!current)
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    if (!current.oidcSubject || current.oidcSubject.startsWith("demo|")) {
      return NextResponse.json(
        {
          error:
            "This account is not linked to a verified identity-provider subject. Synchronize or reconcile the account before editing it.",
        },
        { status: 409 },
      );
    }
    if (process.env.TSCLOAK_SCIM_ENABLED !== "true")
      return NextResponse.json(
        {
          error:
            "Identity-provider synchronization is disabled; no local changes were saved.",
        },
        { status: 503 },
      );
    try {
      const issuer = requiredEnv("TSCLOAK_ISSUER").replace(/\/$/, "");
      const token = await getScimToken(issuer);
      const operations = Object.entries(parsed.data).flatMap(([key, value]) => {
        if (key === "isActive")
          return [{ op: "replace", path: "active", value }];
        if (key === "email")
          return [
            { op: "replace", path: 'emails[type eq "work"].value', value },
          ];
        if (key === "firstName")
          return [{ op: "replace", path: "name.givenName", value }];
        if (key === "lastName")
          return [{ op: "replace", path: "name.familyName", value }];
        return [];
      });
      if (!operations.length)
        return NextResponse.json(
          { error: "No supported identity-provider fields were supplied." },
          { status: 400 },
        );
      const response = await fetch(
        `${issuer}/scim/v2/Users/${encodeURIComponent(current.oidcSubject)}`,
        {
          method: "PATCH",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/scim+json",
            accept: "application/scim+json, application/json",
          },
          body: JSON.stringify({
            schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
            Operations: operations,
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        },
      );
      const responseBody = (await response.json().catch(() => ({}))) as {
        detail?: string;
        message?: string;
        status?: string;
      };
      if (!response.ok)
        return NextResponse.json(
          {
            error: `Identity provider rejected the update (HTTP ${response.status}): ${responseBody.detail ?? responseBody.message ?? "No local changes were saved."}`,
          },
          { status: 502 },
        );
      const values = { ...parsed.data, updatedAt: new Date().toISOString() };
      const result = await usersService.update(id, values);
      return result.changes
        ? NextResponse.json({
            ok: true,
            message:
              "User changes saved to ViLek and the configured identity provider.",
          })
        : NextResponse.json(
            {
              error:
                "Identity provider was updated, but the local record was not changed. Reconcile the local record.",
            },
            { status: 500 },
          );
    } catch (error) {
      const message =
        error instanceof Error && error.message === "LAST_ADMIN"
          ? "The last active administrator cannot be deactivated."
          : error instanceof Error && error.message === "LAST_ADMIN_ROLE"
            ? "The ADMIN role cannot be deactivated while it is the only active administrator role."
            : error instanceof Error
              ? error.message
              : "The identity-provider update failed; no local changes were saved.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  },
);
export const DELETE = withRouteGuard(
  { roles: ["ADMIN"] },
  async (_request: Request, context: Ctx, auth) => {
    const { id } = await context.params;
    if (id === auth.user.id)
      return NextResponse.json(
        { error: "You cannot deactivate your own administrator account." },
        { status: 409 },
      );
    try {
      const current = await usersService.findById(id);
      if (!current)
        return NextResponse.json(
          { error: "Record not found." },
          { status: 404 },
        );
      if (!current.isActive)
        return NextResponse.json({
          ok: true,
          message: "User is already inactive in ViLek.",
        });
      if (!current.oidcSubject || current.oidcSubject.startsWith("demo|")) {
        return NextResponse.json(
          {
            error:
              "This account is not linked to a verified identity-provider subject. It was not deactivated in ViLek or the identity provider.",
          },
          { status: 409 },
        );
      }
      if (process.env.TSCLOAK_SCIM_ENABLED !== "true")
        return NextResponse.json(
          {
            error:
              "Identity-provider synchronization is disabled; the user was not deactivated.",
          },
          { status: 503 },
        );
      const issuer = requiredEnv("TSCLOAK_ISSUER").replace(/\/$/, "");
      const token = await getScimToken(issuer);
      const response = await fetch(
        `${issuer}/scim/v2/Users/${encodeURIComponent(current.oidcSubject)}`,
        {
          method: "PATCH",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/scim+json",
            accept: "application/scim+json, application/json",
          },
          body: JSON.stringify({
            schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
            Operations: [{ op: "replace", path: "active", value: false }],
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        },
      );
      const responseBody = (await response.json().catch(() => ({}))) as {
        detail?: string;
        message?: string;
      };
      if (!response.ok)
        return NextResponse.json(
          {
            error: `The identity provider rejected deactivation (HTTP ${response.status}): ${responseBody.detail ?? responseBody.message ?? "The user remains unchanged in ViLek."}`,
          },
          { status: 502 },
        );
      const result = await usersService.deactivate(id);
      return result.changes
        ? NextResponse.json({
            ok: true,
            message:
              "User deactivated in ViLek and the configured identity provider.",
          })
        : NextResponse.json(
            {
              error:
                "The identity provider was updated, but ViLek was not. Reconcile the account before retrying.",
            },
            { status: 500 },
          );
    } catch (error) {
      const message =
        error instanceof Error && error.message === "LAST_ADMIN"
          ? "The last active administrator cannot be deactivated."
          : error instanceof Error && error.message === "LAST_ADMIN_ROLE"
            ? "The ADMIN role cannot be deactivated while it is the only active administrator role."
            : error instanceof Error
              ? error.message
              : "The identity-provider deactivation failed; the local record was not changed.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  },
);

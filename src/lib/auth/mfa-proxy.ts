import "server-only";

import { NextResponse } from "next/server";
import { getLocalAuthenticatedUser, getValidatedAccessToken } from "@/lib/auth/oidc";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Validates the ViLek session and proxies a user-scoped request to identity provider.
 * The user's own identity provider access token is used; client-credentials tokens are
 * deliberately never used for personal MFA operations. */
export async function proxyMfaRequest(
  request: Request,
  upstreamPath: string,
  method: "GET" | "POST",
) {
  const expectedOrigin = process.env.VILEK_BASE_URL
    ? new URL(process.env.VILEK_BASE_URL).origin
    : new URL(request.url).origin;
  if (MUTATING_METHODS.has(method)) {
    const origin = request.headers.get("origin");
    if (!origin || origin !== expectedOrigin) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
  }

  const validated = await getValidatedAccessToken();
  if (!validated || !(await getLocalAuthenticatedUser(validated.token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: string | undefined;
  if (method === "POST") {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json({ error: "Expected application/json" }, { status: 415 });
    }
    body = await request.text();
    if (body.length > 4096) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }
  }

  if (!process.env.IDP_MFA_BASE_URL?.trim()) {
    return NextResponse.json(
      { error: "The configured identity provider does not expose an MFA endpoint." },
      { status: 501 },
    );
  }

  let upstream: Response;
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  try {
    upstream = await fetch(
      `${(process.env.IDP_MFA_BASE_URL?.trim() || "").replace(/\/$/, "")}${upstreamPath}`,
      {
        method,
        headers: {
          authorization: `Bearer ${validated.token}`,
          accept: "application/json",
          ...(method === "POST" ? { "content-type": "application/json" } : {}),
          "x-correlation-id": requestId,
        },
        ...(body !== undefined ? { body } : {}),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch (cause) {
    const durationMs = Date.now() - startedAt;
    const timedOut =
      cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError");

    // Never log request bodies, TOTP values, recovery codes, or bearer tokens.
    console.error("[MFA proxy] Upstream request failed", {
      requestId,
      upstreamPath,
      method,
      durationMs,
      failure: timedOut ? "timeout" : "connection",
    });

    return NextResponse.json(
      {
        error: timedOut
          ? "The identity provider MFA request timed out. Please try again."
          : "Unable to connect to the identity provider MFA service. Please try again.",
        requestId,
      },
      {
        status: timedOut ? 504 : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
  const responseText = await upstream.text();
  let responseBody: unknown = null;
  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = { error: "identity provider returned an invalid response" };
    }
  }
  return NextResponse.json(responseBody, {
    status: upstream.status,
    headers: { "Cache-Control": "no-store" },
  });
}

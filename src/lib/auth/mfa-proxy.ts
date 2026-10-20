import "server-only";

import { NextResponse } from "next/server";
import {
  getLocalAuthenticatedUser,
  getValidatedAccessToken,
  getIssuer,
} from "@/lib/auth/tscloak";

const MFA_PATH = "/api/mfa";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Validates the ViLek session and proxies a user-scoped request to TSCloak.
 * The user's own TSCloak access token is used; client-credentials tokens are
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
      return NextResponse.json(
        { error: "Expected application/json" },
        { status: 415 },
      );
    }
    body = await request.text();
    if (body.length > 4096) {
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 },
      );
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${getIssuer()}${MFA_PATH}${upstreamPath}`, {
      method,
      headers: {
        authorization: `Bearer ${validated.token}`,
        accept: "application/json",
        ...(method === "POST" ? { "content-type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body } : {}),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach TSCloak MFA service. Please try again." },
      { status: 502 },
    );
  }

  const responseText = await upstream.text();
  let responseBody: unknown = null;
  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = { error: "TSCloak returned an invalid response" };
    }
  }
  return NextResponse.json(responseBody, {
    status: upstream.status,
    headers: { "Cache-Control": "no-store" },
  });
}

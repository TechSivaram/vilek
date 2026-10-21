import { NextResponse } from "next/server";
import { proxyMfaRequest } from "@/lib/auth/mfa-proxy";
import { mfaEnrollRequestSchema } from "@/lib/profile/mfa.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const validated = mfaEnrollRequestSchema.safeParse(parsed.body);
  if (!validated.success)
    return NextResponse.json(
      {
        error: "Invalid enrollment request.",
        details: validated.error.flatten(),
      },
      { status: 400 },
    );
  return proxyMfaRequest(
    new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(validated.data),
    }),
    "/enroll",
    "POST",
  );
}

async function parseJsonBody(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json"))
    return {
      ok: false,
      response: NextResponse.json({ error: "Expected application/json" }, { status: 415 }),
    };
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }),
    };
  }
}

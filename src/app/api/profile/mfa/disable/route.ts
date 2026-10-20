import { NextResponse } from "next/server";
import { proxyMfaRequest } from "@/lib/auth/mfa-proxy";
import { mfaCodeRequestSchema } from "@/lib/profile/mfa.schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json"))
    return NextResponse.json(
      { error: "Expected application/json" },
      { status: 415 },
    );
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = mfaCodeRequestSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      {
        error: "Enter the current six-digit authenticator code.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  return proxyMfaRequest(
    new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(parsed.data),
    }),
    "/disable",
    "POST",
  );
}

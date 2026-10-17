import { NextRequest, NextResponse } from "next/server";
import { completeLogin } from "@/lib/auth/tscloak";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const providerError = request.nextUrl.searchParams.get("error");
  if (providerError || !code || !state) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(providerError ?? "Missing authorization code or state")}`,
        request.url,
      ),
    );
  }
  try {
    await completeLogin(code, state);
    return NextResponse.redirect(new URL("https://vilek.onrender.com"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign-in failed";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}

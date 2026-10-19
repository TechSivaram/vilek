import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, createLogoutRedirectUrl } from "@/lib/auth/tscloak";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Logout changes authentication state, so accept only same-origin form posts.
  const origin = request.headers.get("origin");

  if (!origin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const expectedOrigin = process.env.VILEK_BASE_URL
    ? new URL(process.env.VILEK_BASE_URL).origin
    : request.nextUrl.origin;

  if (origin !== expectedOrigin) {
    return NextResponse.json({ error: "Invalid expected origin" }, { status: 403 });
  }

  // Remove the local credential before leaving ViLek, then terminate the TSCloak
  // browser session through its RP-initiated session-end endpoint.
  await clearAuthCookies();
  return NextResponse.redirect(createLogoutRedirectUrl(), 303);
}

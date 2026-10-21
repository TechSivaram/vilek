import { NextRequest, NextResponse } from "next/server";
import {
  clearAuthCookies,
  createLogoutRedirectUrl,
  getLocalAuthenticatedUser,
} from "@/lib/auth/tscloak";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Logout is available to every business role, but only to an authenticated
  // ViLek user. This intentionally does not check ADMIN/CREW/etc. roles.
  const authenticatedUser = await getLocalAuthenticatedUser();
  if (!authenticatedUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

import { NextResponse } from "next/server";
import { createLoginRedirect } from "@/lib/auth/oidc";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.redirect(await createLoginRedirect());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start sign-in";
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(message)}`,
        process.env.VILEK_BASE_URL ?? "http://localhost:3001",
      ),
    );
  }
}

import { NextResponse } from "next/server";
import { getLocalAuthenticatedUser } from "@/lib/auth/oidc";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const result = await getLocalAuthenticatedUser(bearer);
  if (!result)
    return NextResponse.json(
      { error: "Unauthorized or not provisioned in ViLek" },
      { status: 401 },
    );
  return NextResponse.json({
    id: result.user.id,
    email: result.user.email,
    firstName: result.user.firstName,
    lastName: result.user.lastName,
  });
}

import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { userRolesService } from "@/lib/admin/features/user_roles/service";
export const GET = withRouteGuard({ roles: ["ADMIN"] }, async () =>
  NextResponse.json(userRolesService.list()),
);
export const POST = withRouteGuard({ roles: ["ADMIN"] }, async (request) => {
  const body = (await request.json().catch(() => null)) as {
    userId?: unknown;
    roleId?: unknown;
  } | null;
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  const roleId = Number(body?.roleId);
  if (!userId || !Number.isSafeInteger(roleId) || roleId < 1)
    return NextResponse.json(
      { error: "Choose a user and role." },
      { status: 400 },
    );
  try {
    userRolesService.create(userId, roleId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error:
          "Assignment could not be created. Check that the user and role exist and the assignment is not duplicated.",
      },
      { status: 409 },
    );
  }
});

import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { userRolesService } from "@/lib/admin/features/user_roles/service";
type Ctx = { params: Promise<{ id: string }> };
export const DELETE = withRouteGuard(
  { roles: ["ADMIN"] },
  async (_request: Request, context: Ctx) => {
    const { id } = await context.params;
    const n = Number(id);
    if (!Number.isSafeInteger(n) || n < 1)
      return NextResponse.json(
        { error: "Invalid assignment ID." },
        { status: 400 },
      );
    const result = userRolesService.remove(n);
    if (result.status === "last-admin")
      return NextResponse.json(
        {
          error:
            "The last active administrator role assignment cannot be removed.",
        },
        { status: 409 },
      );
    return result.status === "ok"
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  },
);

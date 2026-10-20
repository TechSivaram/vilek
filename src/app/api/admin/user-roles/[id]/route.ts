import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { userRolesService } from "@/lib/admin/features/user_roles/service";
import { assignmentIdSchema } from "@/lib/admin/features/user_roles/schema";
type Ctx = { params: Promise<{ id: string }> };

export const DELETE = withRouteGuard(
  { roles: ["ADMIN"] },
  async (_request: Request, context: Ctx) => {
    const { id } = await context.params;
    const parsedId = assignmentIdSchema.safeParse(id);
    if (!parsedId.success)
      return NextResponse.json(
        { error: "Invalid assignment ID." },
        { status: 400 },
      );
    const result = userRolesService.remove(parsedId.data);
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

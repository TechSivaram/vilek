import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { userRolesService } from "@/lib/admin/features/user_roles/service";
import { createInputSchema, listResponseSchema } from "@/lib/admin/features/user_roles/schema";

export const GET = withRouteGuard({ roles: ["ADMIN"] }, async () => {
  const result = userRolesService.list();
  const validated = listResponseSchema.safeParse(result);
  if (!validated.success) {
    console.error("Invalid user-role list response", validated.error.flatten());
    return NextResponse.json({ error: "Unable to load role assignments." }, { status: 500 });
  }
  return NextResponse.json(validated.data);
});

export const POST = withRouteGuard({ roles: ["ADMIN"] }, async (request: Request) => {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const parsed = createInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a valid user and role.", details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    userRolesService.create(parsed.data.userId, parsed.data.roleId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Assignment could not be created. Check that the user and role exist and the assignment is not duplicated." }, { status: 409 });
  }
});

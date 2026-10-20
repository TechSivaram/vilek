import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { resourceConfigs } from "@/lib/admin/resources";
import { roleIdSchema, updateInputSchema } from "@/lib/admin/features/roles/schema";
import { rolesService } from "@/lib/admin/features/roles/service";
type Ctx = { params: Promise<{ id: string }> };
export const PATCH = withRouteGuard(
  { roles: ["ADMIN"] },
  async (request: Request, context: Ctx) => {
    const { id } = await context.params;
    const parsedId = roleIdSchema.safeParse(id);
    if (!parsedId.success) return NextResponse.json({ error: "Invalid role ID." }, { status: 400 });
    const config = resourceConfigs["roles"];
    if (!config?.canEdit)
      return NextResponse.json(
        { error: "Update is not available for this resource." },
        { status: 405 },
      );
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }
    const parsed = updateInputSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    const values = {
      ...parsed.data,
      ...(["users", "crew-members"].includes("roles")
        ? { updatedAt: new Date().toISOString() }
        : {}),
    };
    try {
      const result = await rolesService.update(parsedId.data, values);
      return result.changes
        ? NextResponse.json({ ok: true })
        : NextResponse.json({ error: "Record not found." }, { status: 404 });
    } catch (error) {
      const message =
        error instanceof Error && error.message === "LAST_ADMIN"
          ? "The last active administrator cannot be deactivated."
          : error instanceof Error && error.message === "LAST_ADMIN_ROLE"
            ? "The ADMIN role cannot be deactivated while it is the only active administrator role."
            : "The record could not be updated. Check uniqueness, validation, and linked records.";
      return NextResponse.json({ error: message }, { status: 409 });
    }
  },
);
export const DELETE = withRouteGuard(
  { roles: ["ADMIN"] },
  async (_request: Request, context: Ctx, auth) => {
    const { id } = await context.params;
    const parsedId = roleIdSchema.safeParse(id);
    if (!parsedId.success) return NextResponse.json({ error: "Invalid role ID." }, { status: 400 });
    const config = resourceConfigs["roles"];
    if (!config?.canDeactivate)
      return NextResponse.json(
        { error: "Delete/deactivation is not available for this resource." },
        { status: 405 },
      );

    try {
      const result = await rolesService.deactivate(parsedId.data);
      return result.changes
        ? NextResponse.json({ ok: true })
        : NextResponse.json({ error: "Record not found." }, { status: 404 });
    } catch (error) {
      const message =
        error instanceof Error && error.message === "LAST_ADMIN"
          ? "The last active administrator cannot be deactivated."
          : error instanceof Error && error.message === "LAST_ADMIN_ROLE"
            ? "The ADMIN role cannot be deactivated while it is the only active administrator role."
            : "The record could not be deactivated.";
      return NextResponse.json({ error: message }, { status: 409 });
    }
  },
);

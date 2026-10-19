import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { resourceConfigs } from "@/lib/admin/resources";
import { updateInputSchema } from "@/lib/admin/features/expense_categories/schema";
import { expense_categoriesService } from "@/lib/admin/features/expense_categories/service";
type Ctx = { params: Promise<{ id: string }> };
export const PATCH = withRouteGuard(
  { roles: ["ADMIN"] },
  async (request: Request, context: Ctx) => {
    const { id } = await context.params;
    const config = resourceConfigs["expense-categories"];
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
      ...(["users", "crew-members"].includes("expense-categories")
        ? { updatedAt: new Date().toISOString() }
        : {}),
    };
    try {
      const result = await expense_categoriesService.update(id, values);
      return result.changes
        ? NextResponse.json({ ok: true })
        : NextResponse.json({ error: "Record not found." }, { status: 404 });
    } catch {
      return NextResponse.json(
        {
          error:
            "The record could not be updated. Check uniqueness, validation, and linked records.",
        },
        { status: 409 },
      );
    }
  },
);
export const DELETE = withRouteGuard(
  { roles: ["ADMIN"] },
  async (_request: Request, context: Ctx, auth) => {
    const { id } = await context.params;
    const config = resourceConfigs["expense-categories"];
    if (!config?.canDeactivate)
      return NextResponse.json(
        { error: "Delete/deactivation is not available for this resource." },
        { status: 405 },
      );

    try {
      const result = await expense_categoriesService.deactivate(id);
      return result.changes
        ? NextResponse.json({ ok: true })
        : NextResponse.json({ error: "Record not found." }, { status: 404 });
    } catch {
      return NextResponse.json(
        { error: "The record could not be deactivated." },
        { status: 409 },
      );
    }
  },
);

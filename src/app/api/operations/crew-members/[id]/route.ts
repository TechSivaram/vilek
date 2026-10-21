import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { updateInputSchema } from "@/lib/operations/features/crew_members/schema";
import { crew_membersService } from "@/lib/operations/features/crew_members/service";
type Ctx = { params: Promise<{ id: string }> };
export const PATCH = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (request: Request, context: Ctx) => {
    const { id } = await context.params;
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
    const values = { ...parsed.data, updatedAt: new Date().toISOString() };
    try {
      const result = await crew_membersService.update(id, values);
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
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (_request: Request, context: Ctx, auth) => {
    const { id } = await context.params;
    try {
      const result = await crew_membersService.deactivate(id);
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

import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { flightsService } from "@/lib/admin/features/flights/service";
import { formSchema } from "@/lib/admin/features/flights/schema";
type Ctx = { params: Promise<{ id: string }> };
export const PATCH = withRouteGuard(
  { roles: ["ADMIN"] },
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
    const parsed = formSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid flight form data.", details: parsed.error.flatten() },
        { status: 400 },
      );
    try {
      const result = await flightsService.update(id, parsed.data);
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
  async (_request: Request, context: Ctx) => {
    const { id } = await context.params;
    try {
      const result = await flightsService.deactivate(id);
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

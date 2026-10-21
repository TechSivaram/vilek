import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { auditRetentionPolicyService } from "@/lib/operations/features/audit-retention-policy/service";
import { updateInputSchema } from "@/lib/operations/features/audit-retention-policy/schema";

export const dynamic = "force-dynamic";
export const PATCH = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id: routeId } = await context.params;
    const resource = auditRetentionPolicyService.config;

    if (!resource.writable)
      return NextResponse.json({ error: "This history table is read-only." }, { status: 405 });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const id = routeId;
    if (id === undefined || id === null || id === "")
      return NextResponse.json({ error: "Record id is required." }, { status: 400 });
    const parsedInput = updateInputSchema.safeParse(body);
    if (!parsedInput.success)
      return NextResponse.json(
        { error: "Invalid input.", details: parsedInput.error.flatten() },
        { status: 400 },
      );
    const values = parsedInput.data;
    try {
      const updated = auditRetentionPolicyService.update(id, values);
      return updated
        ? NextResponse.json({ ok: true })
        : NextResponse.json({ error: "Record not found." }, { status: 404 });
    } catch {
      return NextResponse.json(
        {
          error: "The record could not be updated. Check constraints and linked records.",
        },
        { status: 409 },
      );
    }
  },
);

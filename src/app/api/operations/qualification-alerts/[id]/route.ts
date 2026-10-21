import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import type { QualificationAlertsUpdateDto } from "@/lib/operations/features/qualification-alerts/dto";
import { QualificationAlertsService } from "@/lib/operations/features/qualification-alerts/service";
import {
  createInputSchema,
  updateInputSchema,
} from "@/lib/operations/features/qualification-alerts/schema";

export const dynamic = "force-dynamic";
const resourceConfig = {
  table: "Qualification_Alert",
  label: "Qualification alerts",
  id: "id",
  writable: true,
  required: ["crew_qualification_id", "alert_interval_days", "due_at"],
  columns: [
    "crew_qualification_id",
    "alert_interval_days",
    "due_at",
    "state",
    "generated_at",
    "resolved_at",
  ],
} as const;

export const PATCH = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id: routeId } = await context.params;
    const name = "qualification-alerts";
    const resource = resourceConfig;

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
    const values = parsedInput.data as Record<string, unknown>;
    try {
      const updated = QualificationAlertsService.update(
        id,
        values as unknown as QualificationAlertsUpdateDto,
      );
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

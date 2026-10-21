import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import type { QualificationAlertsCreateDto } from "@/lib/operations/features/qualification-alerts/dto";
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

export const GET = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (_request: Request) => {
    const name = "qualification-alerts";
    const resource = resourceConfig;

    try {
      const rows = QualificationAlertsService.listRows();
      const displayColumns = [
        "id",
        "crew_name",
        "qualification_name",
        "qualification_expiry",
        "alert_interval_days",
        "due_at",
        "state",
        "generated_at",
        "resolved_at",
      ];
      const options: Record<string, { value: string | number; label: string }[]> = {};

      for (const field of resource.columns) {
        const fieldOptions = QualificationAlertsService.getOptions(field);
        if (fieldOptions.length) options[field] = fieldOptions;
      }
      return NextResponse.json({
        resource: name,
        label: resource.label,
        writable: resource.writable,
        columns: resource.columns,
        displayColumns,
        rows,
        options,
      });
    } catch (error) {
      console.error("Operations maintenance query failed", error);
      return NextResponse.json(
        {
          error:
            "Could not load this resource. Confirm migrations have been applied and linked tables are available.",
        },
        { status: 500 },
      );
    }
  },
);

export const POST = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (request: Request) => {
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
    const parsedInput = createInputSchema.safeParse(body);
    if (!parsedInput.success)
      return NextResponse.json(
        { error: "Invalid input.", details: parsedInput.error.flatten() },
        { status: 400 },
      );
    const input = parsedInput.data as Record<string, unknown>;
    try {
      const insertValues: Record<string, unknown> = { ...input };
      if (!insertValues.id) insertValues.id = crypto.randomUUID();
      const result = QualificationAlertsService.create(
        insertValues as unknown as QualificationAlertsCreateDto,
      );
      return NextResponse.json({ ok: true, id: result }, { status: 201 });
    } catch (error) {
      const message =
        error instanceof Error && /UNIQUE|CHECK|FOREIGN KEY|NOT NULL/i.test(error.message)
          ? "The record conflicts with a unique, validation, or relationship constraint."
          : "The record could not be saved.";
      return NextResponse.json({ error: message }, { status: 409 });
    }
  },
);

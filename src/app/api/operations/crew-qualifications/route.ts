import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import type { CrewQualificationsCreateDto } from "@/lib/operations/features/crew-qualifications/dto";
import { CrewQualificationsService } from "@/lib/operations/features/crew-qualifications/service";
import { CrewQualificationsService } from "@/lib/operations/features/crew-qualifications/service";
import {
  createInputSchema,
  updateInputSchema,
} from "@/lib/operations/features/crew-qualifications/schema";

export const dynamic = "force-dynamic";
const resourceConfig = {
  table: "Crew_Qualification",
  label: "Crew qualifications",
  id: "id",
  writable: true,
  required: ["crew_member_id", "qualification_type_id", "valid_from"],
  columns: [
    "crew_member_id",
    "qualification_type_id",
    "valid_from",
    "valid_until",
    "status",
    "replaced_by_id",
    "notes",
  ],
} as const;

export const GET = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (_request: Request) => {
    const name = "crew-qualifications";
    const resource = resourceConfig;

    try {
      const rows = CrewQualificationsService.listRows();
      const displayColumns = [
        "id",
        "crew_display",
        "qualification_name",
        "valid_from",
        "valid_until",
        "status",
        "notes",
        "created_at",
      ];
      const options: Record<
        string,
        { value: string | number; label: string }[]
      > = {};

      for (const field of resource.columns) {
        const fieldOptions = CrewQualificationsService.getOptions(field);
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
    const name = "crew-qualifications";
    const resource = resourceConfig;

    if (!resource.writable)
      return NextResponse.json(
        { error: "This history table is read-only." },
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
      const result = CrewQualificationsService.create(
        insertValues as unknown as CrewQualificationsCreateDto,
      );
      return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
    } catch (error) {
      const message =
        error instanceof Error &&
        /UNIQUE|CHECK|FOREIGN KEY|NOT NULL/i.test(error.message)
          ? "The record conflicts with a unique, validation, or relationship constraint."
          : "The record could not be saved.";
      return NextResponse.json({ error: message }, { status: 409 });
    }
  },
);

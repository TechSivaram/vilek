import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import type { CrewQualificationsUpdateDto } from "@/lib/operations/features/crew-qualifications/dto";
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

export const PATCH = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id: routeId } = await context.params;
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
    const id = routeId;
    if (id === undefined || id === null || id === "")
      return NextResponse.json(
        { error: "Record id is required." },
        { status: 400 },
      );
    const parsedInput = updateInputSchema.safeParse(body);
    if (!parsedInput.success)
      return NextResponse.json(
        { error: "Invalid input.", details: parsedInput.error.flatten() },
        { status: 400 },
      );
    const values = parsedInput.data as Record<string, unknown>;
    try {
      const updated = CrewQualificationsService.update(
        id,
        values as unknown as CrewQualificationsUpdateDto,
      );
      return updated
        ? NextResponse.json({ ok: true })
        : NextResponse.json({ error: "Record not found." }, { status: 404 });
    } catch {
      return NextResponse.json(
        {
          error:
            "The record could not be updated. Check constraints and linked records.",
        },
        { status: 409 },
      );
    }
  },
);

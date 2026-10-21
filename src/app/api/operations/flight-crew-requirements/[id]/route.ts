import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import type { FlightCrewRequirementsUpdateDto } from "@/lib/operations/features/flight-crew-requirements/dto";
import { flightCrewRequirementsService } from "@/lib/operations/features/flight-crew-requirements/service";
import {
  createInputSchema,
  updateInputSchema,
} from "@/lib/operations/features/flight-crew-requirements/schema";

export const dynamic = "force-dynamic";
const resourceConfig = {
  table: "Flight_Crew_Requirement",
  label: "Flight-specific crew requirements",
  id: "id",
  writable: true,
  required: ["flight_id", "designation_id", "required_count"],
  columns: ["flight_id", "designation_id", "required_count", "reason"],
} as const;

export const PATCH = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id: routeId } = await context.params;
    const name = "flight-crew-requirements";
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
      const updated = flightCrewRequirementsService.update(
        id,
        values as unknown as FlightCrewRequirementsUpdateDto,
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

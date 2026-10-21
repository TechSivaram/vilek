import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import type { CrewComplementDefaultsUpdateDto } from "@/lib/operations/features/crew-complement-defaults/dto";
import { crewComplementDefaultsService } from "@/lib/operations/features/crew-complement-defaults/service";
import {
  createInputSchema,
  updateInputSchema,
} from "@/lib/operations/features/crew-complement-defaults/schema";

export const dynamic = "force-dynamic";
const resourceConfig = {
  table: "Flight_Crew_Complement_Default",
  label: "Default crew complement",
  id: "id",
  writable: true,
  required: ["designation_id", "required_count"],
  columns: ["designation_id", "required_count"],
} as const;

export const PATCH = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id: routeId } = await context.params;
    const name = "crew-complement-defaults";
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
      const updated = crewComplementDefaultsService.update(
        id,
        values as unknown as CrewComplementDefaultsUpdateDto,
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

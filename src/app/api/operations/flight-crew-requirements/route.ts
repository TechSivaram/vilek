import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { flightCrewRequirementsService } from "@/lib/operations/features/flight-crew-requirements/service";
import { createInputSchema } from "@/lib/operations/features/flight-crew-requirements/schema";

export const dynamic = "force-dynamic";
const resource = {
  name: "flight-crew-requirements",
  label: "Flight-specific crew requirements",
  writable: true,
  columns: ["flight_id", "designation_id", "required_count", "reason"],
  displayColumns: [
    "id",
    "airline_name",
    "flight_number",
    "flight_route",
    "scheduled_departure",
    "scheduled_arrival",
    "designation_name",
    "required_count",
    "reason",
    "created_at",
  ],
};

export const GET = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (request: Request) => {
    const query = new URL(request.url).searchParams;
    const flightId = query.get("flight_id");
    const search = (query.get("q") ?? "").trim();
    const isFlightList = query.get("view") === "flights" || (!flightId && query.has("q"));
    try {
      const result = isFlightList
        ? flightCrewRequirementsService.listFlights(search)
        : flightCrewRequirementsService.list(flightId);
      return NextResponse.json({
        resource: resource.name,
        label: resource.label,
        writable: resource.writable,
        columns: resource.columns,
        displayColumns: isFlightList
          ? [
              "airline_name",
              "flight_number",
              "flight_route",
              "scheduled_departure",
              "scheduled_arrival",
              "flight_id",
            ]
          : resource.displayColumns,
        rows: result.rows,
        options: result.options,
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = createInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    try {
      const id = flightCrewRequirementsService.create(parsed.data);
      return NextResponse.json({ ok: true, id }, { status: 201 });
    } catch (error) {
      const message =
        error instanceof Error && /UNIQUE|CHECK|FOREIGN KEY|NOT NULL/i.test(error.message)
          ? "The record conflicts with a unique, validation, or relationship constraint."
          : "The record could not be saved.";
      return NextResponse.json({ error: message }, { status: 409 });
    }
  },
);

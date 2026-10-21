import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { flightOperationsSettingsService } from "@/lib/operations/features/flight-operations-settings/service";
import { updateInputSchema } from "@/lib/operations/features/flight-operations-settings/schema";

export const dynamic = "force-dynamic";
export const PATCH = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { id: routeId } = await context.params;
    const resource = flightOperationsSettingsService.config;

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
    const values = parsedInput.data;
    const keys = Object.keys(values);
    if (values.value_json !== undefined) {
      try {
        JSON.parse(String(values.value_json));
      } catch {
        return NextResponse.json(
          { error: "value_json must contain valid JSON." },
          { status: 400 },
        );
      }
    }
    try {
      const updated = flightOperationsSettingsService.update(id, values);
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

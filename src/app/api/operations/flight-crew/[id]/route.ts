import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { flightCrewService } from "@/lib/operations/features/flight-crew/service";
import { removeFlightCrewSchema } from "@/lib/operations/features/flight-crew/schema";

type Context = { params: Promise<{ id: string }> };
export const DELETE = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (request: Request, context: Context, auth) => {
    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "A removal reason is required." },
        { status: 400 },
      );
    }
    const parsed = removeFlightCrewSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Enter a removal reason (at least 5 characters)." },
        { status: 400 },
      );
    try {
      const result = flightCrewService.remove(id, parsed.data, {
        id: auth.user.id,
        email: auth.user.email,
      });
      return result.changes
        ? NextResponse.json({ ok: true })
        : NextResponse.json(
            { error: "Assignment not found." },
            { status: 404 },
          );
    } catch {
      return NextResponse.json(
        { error: "The assignment could not be removed." },
        { status: 409 },
      );
    }
  },
);

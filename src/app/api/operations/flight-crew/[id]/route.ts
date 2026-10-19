import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { flightCrewRepository } from "@/lib/operations/flight-crew";

type Context = { params: Promise<{ id: string }> };
export const DELETE = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (_request: Request, context: Context) => {
    const { id } = await context.params;
    try {
      const result = flightCrewRepository.remove(id);
      return result.changes ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    } catch {
      return NextResponse.json({ error: "The assignment could not be removed." }, { status: 409 });
    }
  },
);

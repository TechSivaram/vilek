import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { flightCrewRepository } from "@/lib/operations/flight-crew";

export const dynamic = "force-dynamic";
export const GET = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async () => NextResponse.json({ options: flightCrewRepository.options() }),
);

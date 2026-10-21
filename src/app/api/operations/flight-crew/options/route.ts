import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { flightCrewService } from "@/lib/operations/features/flight-crew/service";

export const dynamic = "force-dynamic";
export const GET = withRouteGuard({ roles: ["FLIGHT_OPERATIONS_MANAGER"] }, async () =>
  NextResponse.json({ options: flightCrewService.options() }),
);

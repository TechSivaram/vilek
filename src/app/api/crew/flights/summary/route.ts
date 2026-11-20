import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { crewFlightsService } from "@/lib/crew/flights/service";

export const dynamic = "force-dynamic";

export const GET = withRouteGuard({ roles: ["CREW"] }, async (_request, _context, auth) => {
  return NextResponse.json(crewFlightsService.summaryForEmployee(auth.user.id));
});

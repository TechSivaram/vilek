import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { crewClaimsService } from "@/lib/crew/claims/service";

export const dynamic = "force-dynamic";

export const GET = withRouteGuard({ permissions: ["CLAIM_REVIEW"] }, async () => {
  return NextResponse.json({ dashboard: crewClaimsService.reviewDashboard() });
});

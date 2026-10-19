import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { flightsService } from "@/lib/admin/features/flights/service";

export const dynamic = "force-dynamic";

// Dropdown lookup data is fetched only when the create/edit form is opened,
// not on every paginated/search request for flight rows.
export const GET = withRouteGuard({ roles: ["ADMIN"] }, async () => {
  const options = await flightsService.options();
  return NextResponse.json({ options });
});

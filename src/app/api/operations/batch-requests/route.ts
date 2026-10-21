import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { batchrequestsService } from "@/lib/operations/features/batch-requests/service";

export const dynamic = "force-dynamic";
export const GET = withRouteGuard(
  { roles: ["FLIGHT_OPERATIONS_MANAGER"] },
  async (_request: Request) => {
    try {
      const result = batchrequestsService.list();
      return NextResponse.json(result);
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
  async (_request: Request) =>
    NextResponse.json(
      { error: "This history table is read-only." },
      { status: 405 },
    ),
);

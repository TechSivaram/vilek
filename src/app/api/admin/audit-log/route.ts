import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { audit_logService } from "@/lib/admin/features/audit_log/service";
export const GET = withRouteGuard({ roles: ["ADMIN"] }, async () =>
  NextResponse.json({
    rows: await audit_logService.list(),
    notice:
      "These are Audit_Outbox delivery records, not a complete audit history. Only events written by the current application are shown.",
  }),
);

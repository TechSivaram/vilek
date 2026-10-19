import { NextResponse } from "next/server";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { operationsService } from "@/lib/admin/features/operations/service";
export const GET = withRouteGuard({ roles: ["ADMIN"] }, async () => {
  const rows = await operationsService.list();
  const pending = rows.filter((r) => r.processedAt === null);
  const failed = rows.filter((r) => r.lastError !== null);
  return NextResponse.json({
    rows,
    pending: pending.length,
    failed: failed.length,
    notice:
      "Counts are derived from the Audit_Outbox table. No background worker or retry action is assumed to exist.",
  });
});

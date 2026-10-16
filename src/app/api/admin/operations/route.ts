import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { db } from "@/lib/db";
import { auditOutbox } from "@/lib/db/schema";
export const GET=withRouteGuard({roles:["ADMIN"]},async()=>{const rows=db.select().from(auditOutbox).orderBy(desc(auditOutbox.createdAt)).limit(200).all();const pending=rows.filter(r=>r.processedAt===null);const failed=rows.filter(r=>r.lastError!==null);return NextResponse.json({rows,pending:pending.length,failed:failed.length,notice:"Counts are derived from the Audit_Outbox table. No background worker or retry action is assumed to exist."});});

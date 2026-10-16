import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { db } from "@/lib/db";
import { auditOutbox } from "@/lib/db/schema";
export const GET=withRouteGuard({roles:["ADMIN"]},async()=>NextResponse.json({rows:db.select().from(auditOutbox).orderBy(desc(auditOutbox.createdAt)).limit(200).all(),notice:"These are Audit_Outbox delivery records, not a complete audit history. Only events written by the current application are shown."}));

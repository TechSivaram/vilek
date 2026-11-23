import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { db } from "@/lib/db";
import { crewBankAccountAuditEvents, crewBankAccounts } from "@/lib/db/schema";

const error = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
type Context = { params: Promise<{ id: string }> };

export const PATCH = withRouteGuard(
  { permissions: ["FINANCE_PROCESS"] },
  async (request, context: Context, auth) => {
    let body: { action?: unknown };
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON body.");
    }
    if (body.action !== "VERIFY" && body.action !== "REJECT")
      return error("Only VERIFY or REJECT actions are supported.");
    const { id } = await context.params;
    const account = db
      .select({ id: crewBankAccounts.id, isActive: crewBankAccounts.isActive })
      .from(crewBankAccounts)
      .where(and(eq(crewBankAccounts.id, id), eq(crewBankAccounts.isActive, true)))
      .get();
    if (!account) return error("Active bank account not found.", 404);

    const status = body.action === "VERIFY" ? "VERIFIED" : "REJECTED";
    const now = new Date().toISOString();
    db.update(crewBankAccounts)
      .set({
        verificationStatus: status,
        verificationMethod: "MANUAL",
        verifiedAt: status === "VERIFIED" ? now : null,
        verifiedByUserId: auth.user.id,
        updatedAt: now,
      })
      .where(eq(crewBankAccounts.id, id))
      .run();
    db.insert(crewBankAccountAuditEvents)
      .values({
        id: randomUUID(),
        bankAccountId: id,
        actorUserId: auth.user.id,
        action: `BANK_ACCOUNT_${status}`,
        detailsJson: JSON.stringify({ method: "MANUAL" }),
      })
      .run();
    return NextResponse.json({ success: true, verificationStatus: status });
  },
);

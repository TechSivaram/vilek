import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, inArray, ne } from "drizzle-orm";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { db } from "@/lib/db";
import { claims, paymentAuditEvents, paymentClaims, payments } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ paymentId: string }> };

export const PATCH = withRouteGuard(
  { permissions: ["FINANCE_PROCESS"] },
  async (request, context: Context, auth) => {
    const { paymentId } = await context.params;
    let body: { paymentReference?: unknown; paidAt?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const paymentReference =
      typeof body.paymentReference === "string" ? body.paymentReference.trim() : "";
    if (!paymentReference || paymentReference.length > 120)
      return NextResponse.json(
        { error: "Enter a valid UTR or bank transaction reference." },
        { status: 400 },
      );
    const paidAt =
      typeof body.paidAt === "string" && !Number.isNaN(Date.parse(body.paidAt))
        ? new Date(body.paidAt).toISOString()
        : null;
    if (!paidAt)
      return NextResponse.json({ error: "Enter a valid transfer date and time." }, { status: 400 });
    if (Date.parse(paidAt) > Date.now() + 5 * 60 * 1000)
      return NextResponse.json(
        { error: "Transfer date and time cannot be in the future." },
        { status: 400 },
      );

    try {
      db.transaction((tx) => {
        const payment = tx.select().from(payments).where(eq(payments.id, paymentId)).get();
        if (!payment || payment.mode !== "MANUAL") throw new Error("Manual transfer not found.");
        if (payment.status !== "PROCESSING")
          throw new Error("Only a prepared manual transfer can be confirmed.");
        const duplicateReference = tx
          .select({ id: payments.id })
          .from(payments)
          .where(and(eq(payments.paymentReference, paymentReference), ne(payments.id, paymentId)))
          .get();
        if (duplicateReference)
          throw new Error("This UTR or transaction reference is already recorded.");
        const linkedClaims = tx
          .select({ claimId: paymentClaims.claimId })
          .from(paymentClaims)
          .where(eq(paymentClaims.paymentId, paymentId))
          .all();
        if (linkedClaims.length !== 1)
          throw new Error("Manual transfer must be linked to exactly one claim.");
        const claimIds = linkedClaims.map((item) => item.claimId);
        const currentClaim = tx
          .select({ status: claims.status })
          .from(claims)
          .where(and(eq(claims.id, claimIds[0]), inArray(claims.status, ["APPROVED"])))
          .get();
        if (!currentClaim) throw new Error("The claim is no longer approved.");

        tx.update(payments)
          .set({
            status: "PAID",
            paymentReference,
            paidAt,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(payments.id, paymentId))
          .run();
        tx.update(claims)
          .set({ status: "PAID", updatedAt: new Date().toISOString() })
          .where(inArray(claims.id, claimIds))
          .run();
        tx.insert(paymentAuditEvents)
          .values({
            id: randomUUID(),
            paymentId,
            action: "MANUAL_TRANSFER_CONFIRMED",
            actorUserId: auth.user.id,
            detailsJson: JSON.stringify({ paymentReference, paidAt }),
          })
          .run();
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unable to confirm transfer." },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: true, status: "PAID" });
  },
);

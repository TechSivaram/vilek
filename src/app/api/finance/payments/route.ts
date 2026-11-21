import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { db } from "@/lib/db";
import { claims, paymentAuditEvents, paymentClaims, payments } from "@/lib/db/schema";
import {
  getApprovedFinanceClaims,
  getFinanceOverview,
  getFinancePayments,
} from "@/lib/finance/service";

export const dynamic = "force-dynamic";

const jsonError = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export const GET = withRouteGuard({ permissions: ["FINANCE_PROCESS"] }, async () => {
  return NextResponse.json({
    overview: getFinanceOverview(),
    approvedClaims: getApprovedFinanceClaims(),
    payments: getFinancePayments(),
  });
});

export const POST = withRouteGuard(
  { permissions: ["FINANCE_PROCESS"] },
  async (request, _context, auth) => {
    let body: {
      claimIds?: unknown;
      mode?: unknown;
      paymentReference?: unknown;
      paidAt?: unknown;
    };
    try {
      body = await request.json();
    } catch {
      return jsonError("Request body must be valid JSON.");
    }

    const claimIds = Array.isArray(body.claimIds)
      ? [
          ...new Set(
            body.claimIds.filter((id): id is string => typeof id === "string" && id.length > 0),
          ),
        ]
      : [];
    if (!claimIds.length || claimIds.length > 100)
      return jsonError("Select between 1 and 100 approved claims.");
    if (body.mode !== "MANUAL" && body.mode !== "BANK")
      return jsonError("Select a valid payment method.");
    const mode = body.mode;
    const paymentReference =
      typeof body.paymentReference === "string" ? body.paymentReference.trim() : "";
    if (mode === "MANUAL" && !paymentReference)
      return jsonError("A bank transfer or transaction reference is required for manual payments.");
    if (paymentReference.length > 120)
      return jsonError("Payment reference must be 120 characters or fewer.");
    if (mode === "BANK" && !process.env.VILEK_BANK_PAYMENT_URL) {
      return jsonError(
        "Bank payment integration is not configured. Set VILEK_BANK_PAYMENT_URL before initiating bank payments.",
        503,
      );
    }

    const approved = getApprovedFinanceClaims().filter((claim) => claimIds.includes(claim.claimId));
    if (approved.length !== claimIds.length)
      return jsonError("One or more claims are no longer approved or are unavailable.", 409);
    if (approved.some((claim) => !claim.canPay)) {
      return jsonError(
        "One or more claims have multiple currencies, no payable amount, or an existing active payment.",
        409,
      );
    }
    const currencyCodes = new Set(approved.map((claim) => claim.currencyTotals[0].currencyCode));
    if (currencyCodes.size !== 1)
      return jsonError("A payment batch must contain claims in the same currency.");
    const currencyCode = [...currencyCodes][0];
    const amount = approved.reduce((total, claim) => total + claim.currencyTotals[0].amount, 0);
    if (!Number.isFinite(amount) || amount <= 0)
      return jsonError("The payment amount must be greater than zero.");

    const id = randomUUID();
    const idempotencyKey = randomUUID();
    const paymentNumber = `VLK-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${id.slice(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();
    const manualPaidAt =
      typeof body.paidAt === "string" && !Number.isNaN(Date.parse(body.paidAt))
        ? new Date(body.paidAt).toISOString()
        : now;

    try {
      db.transaction((tx) => {
        // Re-check inside the write transaction to close the duplicate-submit race.
        for (const claim of approved) {
          const active = tx
            .select({ id: paymentClaims.id })
            .from(paymentClaims)
            .innerJoin(payments, eq(paymentClaims.paymentId, payments.id))
            .where(
              and(
                eq(paymentClaims.claimId, claim.claimId),
                inArray(payments.status, ["PROCESSING", "PAID"]),
              ),
            )
            .get();
          if (active) throw new Error("A selected claim already has an active payment.");
          const current = tx
            .select({ status: claims.status })
            .from(claims)
            .where(eq(claims.id, claim.claimId))
            .get();
          if (current?.status !== "APPROVED")
            throw new Error("A selected claim is no longer approved.");
        }
        tx.insert(payments)
          .values({
            id,
            paymentNumber,
            mode,
            status: mode === "MANUAL" ? "PAID" : "PROCESSING",
            currencyCode,
            amount: amount.toFixed(2),
            paymentReference: mode === "MANUAL" ? paymentReference : null,
            idempotencyKey,
            initiatedByUserId: auth.user.id,
            paidAt: mode === "MANUAL" ? manualPaidAt : null,
            updatedAt: now,
          })
          .run();
        tx.insert(paymentClaims)
          .values(
            approved.map((claim) => ({
              id: randomUUID(),
              paymentId: id,
              claimId: claim.claimId,
              amount: claim.currencyTotals[0].amount.toFixed(2),
            })),
          )
          .run();
        tx.insert(paymentAuditEvents)
          .values({
            id: randomUUID(),
            paymentId: id,
            action: mode === "MANUAL" ? "MANUAL_PAYMENT_RECORDED" : "BANK_PAYMENT_INITIATED",
            actorUserId: auth.user.id,
            detailsJson: JSON.stringify({ claimIds, currencyCode, amount }),
          })
          .run();
        if (mode === "MANUAL") {
          tx.update(claims)
            .set({ status: "PAID", updatedAt: now })
            .where(inArray(claims.id, claimIds))
            .run();
        }
      });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Unable to create payment.", 409);
    }

    if (mode === "MANUAL") {
      return NextResponse.json({ paymentId: id, paymentNumber, status: "PAID" }, { status: 201 });
    }

    // Provider-neutral bank adapter contract. A timeout/invalid response deliberately
    // leaves the transaction PROCESSING so Finance can reconcile before retrying.
    try {
      const response = await fetch(process.env.VILEK_BANK_PAYMENT_URL!, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          "idempotency-key": idempotencyKey,
          ...(process.env.VILEK_BANK_PAYMENT_TOKEN
            ? { authorization: `Bearer ${process.env.VILEK_BANK_PAYMENT_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({
          paymentNumber,
          amount: amount.toFixed(2),
          currency: currencyCode,
          reference: paymentNumber,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      const result = (await response.json().catch(() => ({}))) as {
        status?: string;
        reference?: string;
        transactionId?: string;
        message?: string;
      };
      const providerStatus = (result.status ?? "").toUpperCase();
      const status =
        response.ok && ["PAID", "SUCCESS", "COMPLETED"].includes(providerStatus)
          ? "PAID"
          : !response.ok || ["FAILED", "REJECTED", "DECLINED"].includes(providerStatus)
            ? "FAILED"
            : "PROCESSING";
      const providerReference = result.reference ?? result.transactionId ?? null;
      db.update(payments)
        .set({
          status,
          providerReference,
          failureReason:
            status === "FAILED"
              ? (result.message ?? `Bank provider returned HTTP ${response.status}.`).slice(0, 500)
              : null,
          paidAt: status === "PAID" ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(payments.id, id))
        .run();
      if (status === "PAID")
        db.update(claims)
          .set({ status: "PAID", updatedAt: new Date().toISOString() })
          .where(inArray(claims.id, claimIds))
          .run();
      db.insert(paymentAuditEvents)
        .values({
          id: randomUUID(),
          paymentId: id,
          action: `BANK_PAYMENT_${status}`,
          actorUserId: auth.user.id,
          detailsJson: JSON.stringify({ providerReference, httpStatus: response.status }),
        })
        .run();
      return NextResponse.json(
        { paymentId: id, paymentNumber, status },
        { status: status === "FAILED" ? 502 : 201 },
      );
    } catch {
      db.insert(paymentAuditEvents)
        .values({
          id: randomUUID(),
          paymentId: id,
          action: "BANK_PAYMENT_OUTCOME_UNKNOWN",
          actorUserId: auth.user.id,
          detailsJson: JSON.stringify({
            note: "Provider response could not be confirmed; payment remains PROCESSING.",
          }),
        })
        .run();
      return NextResponse.json(
        {
          paymentId: id,
          paymentNumber,
          status: "PROCESSING",
          warning:
            "The bank response could not be confirmed. Reconcile this transaction before retrying.",
        },
        { status: 202 },
      );
    }
  },
);

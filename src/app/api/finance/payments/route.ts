import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { db } from "@/lib/db";
import {
  claims,
  claimCurrencyResolutions,
  currencies,
  crewBankAccounts,
  paymentAuditEvents,
  paymentClaims,
  payments,
} from "@/lib/db/schema";
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
    if (paymentReference.length > 120)
      return jsonError("Payment reference must be 120 characters or fewer.");
    if (mode === "BANK" && !process.env.VILEK_BANK_PAYMENT_URL) {
      return jsonError(
        "Bank payment integration is not configured. Set VILEK_BANK_PAYMENT_URL before initiating bank payments.",
        503,
      );
    }

    if (mode === "MANUAL" && claimIds.length !== 1)
      return jsonError("Manual transfers must be prepared one crew claim at a time.");

    const approved = getApprovedFinanceClaims().filter((claim) => claimIds.includes(claim.claimId));
    if (approved.length !== claimIds.length)
      return jsonError("One or more claims are no longer approved or are unavailable.", 409);
    if (approved.some((claim) => !claim.canPay)) {
      return jsonError(
        "One or more claims have multiple currencies, no payable amount, or an existing active payment.",
        409,
      );
    }
    let beneficiaryBankAccountId: string | null = null;
    if (mode === "MANUAL") {
      const beneficiary = db
        .select({ id: crewBankAccounts.id })
        .from(crewBankAccounts)
        .where(
          and(
            eq(crewBankAccounts.crewMemberId, approved[0].crewMemberId),
            eq(crewBankAccounts.isActive, true),
            eq(crewBankAccounts.isPrimary, true),
            eq(crewBankAccounts.verificationStatus, "VERIFIED"),
            eq(crewBankAccounts.currencyCode, approved[0].payableCurrencyCode ?? ""),
          ),
        )
        .get();
      if (!beneficiary)
        return jsonError(
          "This crew member has no verified primary bank account in the claim currency.",
          409,
        );
      beneficiaryBankAccountId = beneficiary.id;
    }

    const currencyCodes = new Set(approved.map((claim) => claim.payableCurrencyCode));
    if (currencyCodes.size !== 1 || [...currencyCodes].some((code) => !code))
      return jsonError(
        "A payment batch must contain claims with the same resolved payout currency.",
      );
    const currencyCode = [...currencyCodes][0] as string;
    const payoutCurrency = db
      .select({ minorUnits: currencies.minorUnits })
      .from(currencies)
      .where(eq(currencies.code, currencyCode))
      .get();
    if (!payoutCurrency) return jsonError("The payout currency is not configured.", 409);
    const factor = 10 ** payoutCurrency.minorUnits;
    const amountMinor = approved.reduce(
      (total, claim) => total + Math.round((claim.payableAmount ?? 0) * factor),
      0,
    );
    const amount = amountMinor / factor;
    if (!Number.isFinite(amount) || amount <= 0)
      return jsonError("The payment amount must be greater than zero.");

    const id = randomUUID();
    const idempotencyKey = randomUUID();
    const paymentNumber = `VLK-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${id.slice(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();
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
          const currentBeneficiary = tx
            .select({ id: crewBankAccounts.id })
            .from(crewBankAccounts)
            .where(
              and(
                eq(crewBankAccounts.crewMemberId, claim.crewMemberId),
                eq(crewBankAccounts.isActive, true),
                eq(crewBankAccounts.isPrimary, true),
                eq(crewBankAccounts.verificationStatus, "VERIFIED"),
                eq(crewBankAccounts.currencyCode, claim.payableCurrencyCode ?? ""),
              ),
            )
            .get();
          if (!currentBeneficiary)
            throw new Error(
              "The verified primary beneficiary account changed. Refresh the payment queue.",
            );
          const sourceCurrencyCodes = new Set(
            claim.currencyTotals.map((total) => total.currencyCode),
          );
          const needsFxResolution =
            sourceCurrencyCodes.size !== 1 ||
            !sourceCurrencyCodes.has(claim.payableCurrencyCode ?? "");
          if (needsFxResolution) {
            const resolution = tx
              .select({
                payoutCurrencyCode: claimCurrencyResolutions.payoutCurrencyCode,
                convertedAmount: claimCurrencyResolutions.convertedAmount,
                status: claimCurrencyResolutions.status,
              })
              .from(claimCurrencyResolutions)
              .where(eq(claimCurrencyResolutions.claimId, claim.claimId))
              .get();
            if (
              !resolution ||
              resolution.status !== "APPROVED" ||
              resolution.payoutCurrencyCode !== claim.payableCurrencyCode ||
              Number(resolution.convertedAmount) !== claim.payableAmount
            )
              throw new Error(
                "The approved currency resolution changed. Refresh the payment queue before continuing.",
              );
          }
        }
        tx.insert(payments)
          .values({
            id,
            paymentNumber,
            mode,
            status: "PROCESSING",
            currencyCode,
            amount: amount.toFixed(payoutCurrency.minorUnits),
            paymentReference: null,
            idempotencyKey,
            initiatedByUserId: auth.user.id,
            paidAt: null,
            updatedAt: now,
          })
          .run();
        tx.insert(paymentClaims)
          .values(
            approved.map((claim) => ({
              id: randomUUID(),
              paymentId: id,
              claimId: claim.claimId,
              amount: (Math.round((claim.payableAmount ?? 0) * factor) / factor).toFixed(
                payoutCurrency.minorUnits,
              ),
            })),
          )
          .run();
        tx.insert(paymentAuditEvents)
          .values({
            id: randomUUID(),
            paymentId: id,
            action: mode === "MANUAL" ? "MANUAL_TRANSFER_PREPARED" : "BANK_PAYMENT_INITIATED",
            actorUserId: auth.user.id,
            detailsJson: JSON.stringify({
              claimIds,
              currencyCode,
              amount,
              beneficiaryBankAccountId,
            }),
          })
          .run();
      });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Unable to create payment.", 409);
    }

    if (mode === "MANUAL") {
      return NextResponse.json(
        {
          paymentId: id,
          paymentNumber,
          status: "PROCESSING",
          message:
            "Transfer prepared. Complete the bank transfer, then confirm it in Payment History using the UTR.",
        },
        { status: 201 },
      );
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
          amount: amount.toFixed(payoutCurrency.minorUnits),
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
      const providerReference =
        typeof result.reference === "string" && result.reference.trim()
          ? result.reference.trim().slice(0, 160)
          : typeof result.transactionId === "string" && result.transactionId.trim()
            ? result.transactionId.trim().slice(0, 160)
            : null;
      // A success label without a provider transaction reference is not sufficient
      // evidence to mark a reimbursement as paid.
      const providerReportedSuccess = ["PAID", "SUCCESS", "COMPLETED"].includes(providerStatus);
      const status =
        response.ok && providerReportedSuccess && providerReference
          ? "PAID"
          : !response.ok || ["FAILED", "REJECTED", "DECLINED"].includes(providerStatus)
            ? "FAILED"
            : "PROCESSING";
      const now = new Date().toISOString();
      db.transaction((tx) => {
        tx.update(payments)
          .set({
            status,
            providerReference,
            failureReason:
              status === "FAILED"
                ? (result.message ?? `Bank provider returned HTTP ${response.status}.`).slice(
                    0,
                    500,
                  )
                : null,
            paidAt: status === "PAID" ? now : null,
            updatedAt: now,
          })
          .where(eq(payments.id, id))
          .run();
        if (status === "PAID") {
          tx.update(claims)
            .set({ status: "PAID", updatedAt: now })
            .where(inArray(claims.id, claimIds))
            .run();
        }
        tx.insert(paymentAuditEvents)
          .values({
            id: randomUUID(),
            paymentId: id,
            action: `BANK_PAYMENT_${status}`,
            actorUserId: auth.user.id,
            detailsJson: JSON.stringify({
              providerReference,
              httpStatus: response.status,
              providerStatus,
            }),
          })
          .run();
      });
      return NextResponse.json(
        {
          paymentId: id,
          paymentNumber,
          status,
          ...(status === "PROCESSING"
            ? {
                warning:
                  "The provider did not return a confirmed transaction reference. Reconcile this payment before retrying.",
              }
            : {}),
        },
        { status: status === "FAILED" ? 502 : status === "PROCESSING" ? 202 : 201 },
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

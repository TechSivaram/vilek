import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { db } from "@/lib/db";
import {
  claimCurrencyResolutionAuditEvents,
  claimCurrencyResolutions,
  claims,
  currencies,
  crewBankAccounts,
  paymentClaims,
  payments,
} from "@/lib/db/schema";
import { getApprovedFinanceClaims } from "@/lib/finance/service";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ claimId: string }> };
export const POST = withRouteGuard(
  { permissions: ["FINANCE_PROCESS"] },
  async (request, context: Context, auth) => {
    const { claimId } = await context.params;
    let body: {
      rates?: unknown;
      rateSource?: unknown;
      effectiveDate?: unknown;
      correctionReason?: unknown;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    const claim = getApprovedFinanceClaims().find((item) => item.claimId === claimId);
    if (!claim) return NextResponse.json({ error: "Approved claim not found." }, { status: 404 });
    if (claim.hasInvalidAmounts || claim.currencyTotals.length < 1)
      return NextResponse.json(
        {
          error: "Currency resolution is only available for claims with valid expense currencies.",
        },
        { status: 409 },
      );
    const account = db
      .select({ id: crewBankAccounts.id, currencyCode: crewBankAccounts.currencyCode })
      .from(crewBankAccounts)
      .where(
        and(
          eq(crewBankAccounts.crewMemberId, claim.crewMemberId),
          eq(crewBankAccounts.isActive, true),
          eq(crewBankAccounts.isPrimary, true),
          eq(crewBankAccounts.verificationStatus, "VERIFIED"),
        ),
      )
      .get();
    if (!account)
      return NextResponse.json(
        { error: "A verified primary bank account is required before resolving currencies." },
        { status: 409 },
      );
    const rateSource =
      typeof body.rateSource === "string" ? body.rateSource.trim().slice(0, 160) : "";
    const effectiveDate = typeof body.effectiveDate === "string" ? body.effectiveDate : "";
    const parsedEffectiveDate = new Date(`${effectiveDate}T00:00:00Z`);
    const todayUtc = new Date().toISOString().slice(0, 10);
    if (
      !rateSource ||
      !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) ||
      Number.isNaN(parsedEffectiveDate.getTime()) ||
      parsedEffectiveDate.toISOString().slice(0, 10) !== effectiveDate ||
      effectiveDate > todayUtc
    )
      return NextResponse.json(
        {
          error:
            "Provide an exchange-rate source and a valid effective date that is not in the future.",
        },
        { status: 400 },
      );
    const correctionReason =
      typeof body.correctionReason === "string" ? body.correctionReason.trim().slice(0, 500) : "";
    const rates =
      body.rates && typeof body.rates === "object" && !Array.isArray(body.rates)
        ? (body.rates as Record<string, unknown>)
        : {};
    const normalized: Record<string, number> = {};
    for (const total of claim.currencyTotals) {
      const rate =
        total.currencyCode === account.currencyCode ? 1 : Number(rates[total.currencyCode]);
      if (!Number.isFinite(rate) || rate <= 0 || rate > 1_000_000)
        return NextResponse.json(
          {
            error: `Enter a valid ${total.currencyCode} to ${account.currencyCode} exchange rate.`,
          },
          { status: 400 },
        );
      normalized[total.currencyCode] = rate;
    }
    const payoutCurrency = db
      .select({ minorUnits: currencies.minorUnits })
      .from(currencies)
      .where(eq(currencies.code, account.currencyCode))
      .get();
    if (!payoutCurrency)
      return NextResponse.json(
        { error: "The beneficiary payout currency is not configured." },
        { status: 409 },
      );
    const rawAmount = claim.currencyTotals.reduce(
      (sum, total) => sum + total.amount * normalized[total.currencyCode],
      0,
    );
    const convertedAmount = (
      Math.round((rawAmount + Number.EPSILON) * 10 ** payoutCurrency.minorUnits) /
      10 ** payoutCurrency.minorUnits
    ).toFixed(payoutCurrency.minorUnits);
    if (!Number.isFinite(Number(convertedAmount)) || Number(convertedAmount) <= 0)
      return NextResponse.json(
        { error: "Converted payable amount must be greater than zero." },
        { status: 400 },
      );
    const now = new Date().toISOString();
    try {
      db.transaction((tx) => {
        const current = tx
          .select({ status: claims.status })
          .from(claims)
          .where(eq(claims.id, claimId))
          .get();
        if (current?.status !== "APPROVED") throw new Error("Claim is no longer approved.");
        const currentAccount = tx
          .select({ currencyCode: crewBankAccounts.currencyCode })
          .from(crewBankAccounts)
          .where(
            and(
              eq(crewBankAccounts.id, account.id),
              eq(crewBankAccounts.isActive, true),
              eq(crewBankAccounts.isPrimary, true),
              eq(crewBankAccounts.verificationStatus, "VERIFIED"),
            ),
          )
          .get();
        if (currentAccount?.currencyCode !== account.currencyCode)
          throw new Error(
            "The verified primary beneficiary account changed. Refresh and try again.",
          );
        const active = tx
          .select()
          .from(claimCurrencyResolutions)
          .where(eq(claimCurrencyResolutions.claimId, claimId))
          .get();

        const linkedPayments = tx
          .select({ status: payments.status, paymentNumber: payments.paymentNumber })
          .from(paymentClaims)
          .innerJoin(payments, eq(paymentClaims.paymentId, payments.id))
          .where(eq(paymentClaims.claimId, claimId))
          .all();

        if (linkedPayments.some((payment) => payment.status === "PAID")) {
          throw new Error("FX rates are locked because this claim has already been paid.");
        }
        const processingPayment = linkedPayments.find((payment) => payment.status === "PROCESSING");
        if (processingPayment) {
          throw new Error(
            `Payment ${processingPayment.paymentNumber} is still processing. Reconcile or resolve that payment before correcting FX rates.`,
          );
        }
        if (active && !correctionReason) {
          throw new Error("Enter a correction reason before changing an approved FX resolution.");
        }

        const resolutionId = active?.id ?? randomUUID();
        const previousResolution = active
          ? {
              payoutCurrencyCode: active.payoutCurrencyCode,
              rates: JSON.parse(active.ratesJson),
              convertedAmount: active.convertedAmount,
              rateSource: active.rateSource,
              effectiveDate: active.effectiveDate,
              status: active.status,
            }
          : null;
        const values = {
          payoutCurrencyCode: account.currencyCode,
          ratesJson: JSON.stringify(normalized),
          convertedAmount,
          rateSource,
          effectiveDate,
          status: "APPROVED",
          createdByUserId: auth.user.id,
          approvedByUserId: auth.user.id,
          approvedAt: now,
          updatedAt: now,
        };
        if (active)
          tx.update(claimCurrencyResolutions)
            .set(values)
            .where(eq(claimCurrencyResolutions.claimId, claimId))
            .run();
        else
          tx.insert(claimCurrencyResolutions)
            .values({ id: resolutionId, claimId, ...values })
            .run();
        tx.insert(claimCurrencyResolutionAuditEvents)
          .values({
            id: randomUUID(),
            resolutionId,
            claimId,
            actorUserId: auth.user.id,
            action: active
              ? "CURRENCY_RESOLUTION_CORRECTED"
              : "CURRENCY_RESOLUTION_CREATED_AND_APPROVED",
            detailsJson: JSON.stringify({
              correctionReason: active ? correctionReason : null,
              previous: previousResolution,
              revised: {
                payoutCurrencyCode: account.currencyCode,
                rates: normalized,
                convertedAmount,
                rateSource,
                effectiveDate,
                status: "APPROVED",
              },
            }),
          })
          .run();
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unable to save currency resolution." },
        { status: 409 },
      );
    }
    return NextResponse.json({
      payoutCurrencyCode: account.currencyCode,
      convertedAmount,
      rates: normalized,
      status: "APPROVED",
    });
  },
);

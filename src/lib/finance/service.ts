import "server-only";

import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  airlines,
  claimExpenses,
  claimCurrencyResolutions,
  crewBankAccounts,
  claims,
  currencies,
  expenseCategories,
  expenses,
  flightCrew,
  flights,
  paymentAuditEvents,
  paymentClaims,
  payments,
  crewMembers,
  users,
} from "@/lib/db/schema";

export function getFinanceOverview() {
  const approvedClaims =
    db
      .select({ value: sql<number>`count(*)` })
      .from(claims)
      .where(eq(claims.status, "APPROVED"))
      .get()?.value ?? 0;
  const paidPayments =
    db
      .select({ value: sql<number>`count(*)` })
      .from(payments)
      .where(eq(payments.status, "PAID"))
      .get()?.value ?? 0;
  const processingPayments =
    db
      .select({ value: sql<number>`count(*)` })
      .from(payments)
      .where(eq(payments.status, "PROCESSING"))
      .get()?.value ?? 0;
  const failedPayments =
    db
      .select({ value: sql<number>`count(*)` })
      .from(payments)
      .where(eq(payments.status, "FAILED"))
      .get()?.value ?? 0;
  return { approvedClaims, paidPayments, processingPayments, failedPayments };
}

export type FinanceListOptions = {
  page?: number;
  pageSize?: number;
  search?: string;
  claimIds?: string[];
  status?: string;
};

export function getApprovedFinanceClaims(options: FinanceListOptions = {}) {
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(options.pageSize ?? 10)));
  const offset = (page - 1) * pageSize;
  const search = options.search?.trim();
  const searchFilter = search
    ? or(
        like(users.firstName, `%${search}%`),
        like(users.lastName, `%${search}%`),
        like(users.email, `%${search}%`),
        like(flights.flightNumber, `%${search}%`),
        like(claims.id, `%${search}%`),
      )
    : undefined;
  const claimIdFilter = options.claimIds?.length ? inArray(claims.id, options.claimIds) : undefined;
  const baseFilter = and(eq(claims.status, "APPROVED"), searchFilter, claimIdFilter);
  const countQuery =
    db
      .select({ value: sql<number>`count(*)` })
      .from(claims)
      .innerJoin(flightCrew, eq(claims.flightCrewId, flightCrew.id))
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .innerJoin(users, eq(crewMembers.userId, users.id))
      .innerJoin(flights, eq(flightCrew.flightId, flights.id))
      .where(baseFilter)
      .get()?.value ?? 0;
  const rows = db
    .select({
      claimId: claims.id,
      crewMemberId: flightCrew.crewMemberId,
      createdAt: claims.createdAt,
      crewFirstName: users.firstName,
      crewLastName: users.lastName,
      crewEmail: users.email,
      flightNumber: flights.flightNumber,
      airlineName: airlines.name,
    })
    .from(claims)
    .innerJoin(flightCrew, eq(claims.flightCrewId, flightCrew.id))
    .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
    .innerJoin(users, eq(crewMembers.userId, users.id))
    .innerJoin(flights, eq(flightCrew.flightId, flights.id))
    .innerJoin(airlines, eq(flights.airlineId, airlines.id))
    .where(baseFilter)
    .orderBy(desc(claims.updatedAt))
    .limit(pageSize)
    .offset(offset)
    .all();

  const items = rows.map((claim) => {
    const items = db
      .select({
        amount: expenses.amount,
        currencyCode: currencies.code,
        minorUnits: currencies.minorUnits,
        category: expenseCategories.name,
        description: expenses.description,
      })
      .from(claimExpenses)
      .innerJoin(expenses, eq(claimExpenses.expenseId, expenses.id))
      .innerJoin(currencies, eq(expenses.originalCurrencyId, currencies.id))
      .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .where(eq(claimExpenses.claimId, claim.claimId))
      .all();
    // Sum in the currency's minor unit to avoid floating-point drift in payment amounts.
    const totals = new Map<string, { minorUnits: number; amountMinor: number }>();
    let hasInvalidAmounts = false;
    for (const item of items) {
      const factor = 10 ** item.minorUnits;
      const amount = Number(item.amount);
      if (!Number.isFinite(amount) || amount < 0) {
        hasInvalidAmounts = true;
        continue;
      }
      const current = totals.get(item.currencyCode) ?? {
        minorUnits: item.minorUnits,
        amountMinor: 0,
      };
      current.amountMinor += Math.round(amount * factor);
      totals.set(item.currencyCode, current);
    }
    const currencyTotals = [...totals.entries()].map(([currencyCode, total]) => ({
      currencyCode,
      amount: total.amountMinor / 10 ** total.minorUnits,
    }));
    const primaryAccount = db
      .select({ currencyCode: crewBankAccounts.currencyCode })
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
    const resolutionRow = db
      .select()
      .from(claimCurrencyResolutions)
      .where(
        and(
          eq(claimCurrencyResolutions.claimId, claim.claimId),
          eq(claimCurrencyResolutions.status, "APPROVED"),
        ),
      )
      .get();
    let resolution: {
      payoutCurrencyCode: string;
      convertedAmount: number;
      rateSource: string;
      effectiveDate: string;
      rates: Record<string, number>;
    } | null = null;
    if (resolutionRow) {
      try {
        resolution = {
          payoutCurrencyCode: resolutionRow.payoutCurrencyCode,
          convertedAmount: Number(resolutionRow.convertedAmount),
          rateSource: resolutionRow.rateSource,
          effectiveDate: resolutionRow.effectiveDate,
          rates: JSON.parse(resolutionRow.ratesJson) as Record<string, number>,
        };
      } catch {
        resolution = null;
      }
    }
    const resolvedForCurrentAccount = Boolean(
      resolution &&
      primaryAccount?.currencyCode === resolution.payoutCurrencyCode &&
      Number.isFinite(resolution.convertedAmount) &&
      resolution.convertedAmount > 0,
    );
    const activePayment = db
      .select({ status: payments.status, paymentNumber: payments.paymentNumber })
      .from(paymentClaims)
      .innerJoin(payments, eq(paymentClaims.paymentId, payments.id))
      .where(
        and(
          eq(paymentClaims.claimId, claim.claimId),
          inArray(payments.status, ["PROCESSING", "PAID"]),
        ),
      )
      .get();
    return {
      ...claim,
      expenses: items,
      currencyTotals,
      hasInvalidAmounts,
      primaryPayoutCurrency: primaryAccount?.currencyCode ?? null,
      currencyResolution: resolvedForCurrentAccount ? resolution : null,
      payableCurrencyCode:
        currencyTotals.length === 1 &&
        primaryAccount?.currencyCode === currencyTotals[0].currencyCode
          ? currencyTotals[0].currencyCode
          : resolvedForCurrentAccount
            ? resolution!.payoutCurrencyCode
            : null,
      payableAmount:
        currencyTotals.length === 1 &&
        primaryAccount?.currencyCode === currencyTotals[0].currencyCode
          ? currencyTotals[0].amount
          : resolvedForCurrentAccount
            ? resolution!.convertedAmount
            : null,
      canPay:
        !hasInvalidAmounts &&
        ((currencyTotals.length === 1 &&
          currencyTotals[0].amount > 0 &&
          primaryAccount?.currencyCode === currencyTotals[0].currencyCode) ||
          resolvedForCurrentAccount) &&
        !activePayment,
      activePayment: activePayment ?? null,
    };
  });
  return {
    items,
    page,
    pageSize,
    total: countQuery,
    totalPages: Math.max(1, Math.ceil(countQuery / pageSize)),
  };
}

export function getFinancePayments(options: FinanceListOptions = {}) {
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(options.pageSize ?? 10)));
  const offset = (page - 1) * pageSize;
  const search = options.search?.trim();
  const searchFilter = search
    ? or(
        like(payments.paymentNumber, `%${search}%`),
        like(payments.paymentReference, `%${search}%`),
        like(payments.providerReference, `%${search}%`),
        like(users.email, `%${search}%`),
      )
    : undefined;
  const statusFilter =
    options.status && ["PROCESSING", "PAID", "FAILED"].includes(options.status)
      ? eq(payments.status, options.status as "PROCESSING" | "PAID" | "FAILED")
      : undefined;
  const filter = and(searchFilter, statusFilter);
  const total =
    db
      .select({ value: sql<number>`count(*)` })
      .from(payments)
      .leftJoin(users, eq(payments.initiatedByUserId, users.id))
      .where(filter)
      .get()?.value ?? 0;
  const items = db
    .select({
      id: payments.id,
      paymentNumber: payments.paymentNumber,
      mode: payments.mode,
      status: payments.status,
      currencyCode: payments.currencyCode,
      amount: payments.amount,
      paymentReference: payments.paymentReference,
      providerReference: payments.providerReference,
      paidAt: payments.paidAt,
      failureReason: payments.failureReason,
      createdAt: payments.createdAt,
      initiatedBy: users.email,
    })
    .from(payments)
    .leftJoin(users, eq(payments.initiatedByUserId, users.id))
    .where(filter)
    .orderBy(desc(payments.createdAt))
    .limit(pageSize)
    .offset(offset)
    .all()
    .map((payment) => ({
      ...payment,
      claims: db
        .select({ claimId: paymentClaims.claimId })
        .from(paymentClaims)
        .where(eq(paymentClaims.paymentId, payment.id))
        .all(),
    }));
  return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function recordPaymentAudit(
  paymentId: string,
  action: string,
  actorUserId: string,
  details?: unknown,
) {
  db.insert(paymentAuditEvents)
    .values({
      paymentId,
      action,
      actorUserId,
      detailsJson: details === undefined ? null : JSON.stringify(details),
    })
    .run();
}

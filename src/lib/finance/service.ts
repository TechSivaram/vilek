import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  airlines,
  claimExpenses,
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

export function getApprovedFinanceClaims() {
  const rows = db
    .select({
      claimId: claims.id,
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
    .where(eq(claims.status, "APPROVED"))
    .orderBy(desc(claims.updatedAt))
    .all();

  return rows.map((claim) => {
    const items = db
      .select({
        amount: expenses.amount,
        currencyCode: currencies.code,
        category: expenseCategories.name,
        description: expenses.description,
      })
      .from(claimExpenses)
      .innerJoin(expenses, eq(claimExpenses.expenseId, expenses.id))
      .innerJoin(currencies, eq(expenses.originalCurrencyId, currencies.id))
      .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .where(eq(claimExpenses.claimId, claim.claimId))
      .all();
    const totals = new Map<string, number>();
    for (const item of items)
      totals.set(item.currencyCode, (totals.get(item.currencyCode) ?? 0) + Number(item.amount));
    const currencyTotals = [...totals.entries()].map(([currencyCode, amount]) => ({
      currencyCode,
      amount: Number(amount.toFixed(2)),
    }));
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
      canPay: currencyTotals.length === 1 && currencyTotals[0].amount > 0 && !activePayment,
      activePayment: activePayment ?? null,
    };
  });
}

export function getFinancePayments() {
  return db
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
    .orderBy(desc(payments.createdAt))
    .limit(100)
    .all()
    .map((payment) => ({
      ...payment,
      claims: db
        .select({ claimId: paymentClaims.claimId })
        .from(paymentClaims)
        .where(eq(paymentClaims.paymentId, payment.id))
        .all(),
    }));
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

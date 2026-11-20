import "server-only";

import { and, asc, desc, eq, gte, inArray, lte, like, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { alias } from "drizzle-orm/sqlite-core";
import {
  airlines,
  airports,
  claimExpenses,
  claims,
  crewMembers,
  currencies,
  expenseCategories,
  expenseDocuments,
  expenses,
  flightCrew,
  flights,
} from "@/lib/db/schema";

export type ExpenseFilters = {
  page: number;
  pageSize: number;
  search: string;
  categoryId: string;
  currencyId: string;
  fromDate: string;
  toDate: string;
  status: string;
  sortBy: "date" | "amount" | "category";
  sortOrder: "asc" | "desc";
};

function ownedCrew(userId: string) {
  return db
    .select({ id: crewMembers.id })
    .from(crewMembers)
    .where(and(eq(crewMembers.userId, userId), eq(crewMembers.isActive, true)))
    .get();
}

function expenseOwner(expenseId: string, userId: string) {
  return db
    .select({
      id: expenses.id,
      flightCrewId: expenses.flightCrewId,
      claimId: claimExpenses.claimId,
      claimStatus: claims.status,
    })
    .from(expenses)
    .innerJoin(flightCrew, eq(expenses.flightCrewId, flightCrew.id))
    .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
    .leftJoin(claimExpenses, eq(claimExpenses.expenseId, expenses.id))
    .leftJoin(claims, eq(claimExpenses.claimId, claims.id))
    .where(and(eq(expenses.id, expenseId), eq(crewMembers.userId, userId)))
    .get();
}

export const crewExpensesService = {
  options(userId: string) {
    const crew = ownedCrew(userId);
    if (!crew) return { assignments: [], categories: [], currencies: [] };
    const destinationAirports = alias(airports, "destination_airport");
    const assignments = db
      .select({
        id: flightCrew.id,
        flightNumber: flights.flightNumber,
        airlineIata: airlines.iataCode,
        departure: flights.scheduledDeparture,
        origin: airports.iataCode,
        destination: destinationAirports.iataCode,
      })
      .from(flightCrew)
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .innerJoin(flights, eq(flightCrew.flightId, flights.id))
      .innerJoin(airlines, eq(flights.airlineId, airlines.id))
      .innerJoin(airports, eq(flights.originAirportId, airports.id))
      .innerJoin(destinationAirports, eq(flights.destinationAirportId, destinationAirports.id))
      .where(eq(crewMembers.userId, userId))
      .orderBy(desc(flights.scheduledDeparture))
      .all();
    return {
      assignments,
      categories: db
        .select({ id: expenseCategories.id, name: expenseCategories.name })
        .from(expenseCategories)
        .where(eq(expenseCategories.isActive, true))
        .orderBy(asc(expenseCategories.name))
        .all(),
      currencies: db
        .select({
          id: currencies.id,
          code: currencies.code,
          name: currencies.name,
          minorUnits: currencies.minorUnits,
        })
        .from(currencies)
        .where(eq(currencies.isActive, true))
        .orderBy(asc(currencies.code))
        .all(),
    };
  },
  list(userId: string, filters: ExpenseFilters) {
    const owned = db
      .select({ id: expenses.id })
      .from(expenses)
      .innerJoin(flightCrew, eq(expenses.flightCrewId, flightCrew.id))
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .innerJoin(flights, eq(flightCrew.flightId, flights.id))
      .leftJoin(claimExpenses, eq(claimExpenses.expenseId, expenses.id))
      .where(
        and(
          eq(crewMembers.userId, userId),
          filters.search
            ? or(
                like(expenses.description, `%${filters.search}%`),
                like(expenses.location, `%${filters.search}%`),
                like(flights.flightNumber, `%${filters.search}%`),
                like(expenseCategories.name, `%${filters.search}%`),
              )
            : undefined,
          filters.categoryId ? eq(expenses.categoryId, Number(filters.categoryId)) : undefined,
          filters.currencyId
            ? eq(expenses.originalCurrencyId, Number(filters.currencyId))
            : undefined,
          filters.fromDate ? gte(expenses.expenseDate, filters.fromDate) : undefined,
          filters.toDate ? lte(expenses.expenseDate, `${filters.toDate}T23:59:59`) : undefined,
          filters.status === "CLAIMED"
            ? sql`${claimExpenses.id} IS NOT NULL`
            : filters.status === "UNCLAIMED"
              ? sql`${claimExpenses.id} IS NULL`
              : undefined,
        ),
      );
    const ids = owned.all().map((row) => row.id);
    if (!ids.length)
      return {
        expenses: [],
        pagination: { page: filters.page, pageSize: filters.pageSize, total: 0, totalPages: 0 },
        summary: this.summary(userId),
      };
    const conditions = [inArray(expenses.id, ids)];
    const sortColumn =
      filters.sortBy === "amount"
        ? sql`CAST(${expenses.amount} AS REAL)`
        : filters.sortBy === "category"
          ? expenseCategories.name
          : expenses.expenseDate;
    const order = filters.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
    const rows = db
      .select({
        id: expenses.id,
        assignmentId: expenses.flightCrewId,
        amount: expenses.amount,
        expenseDate: expenses.expenseDate,
        location: expenses.location,
        description: expenses.description,
        categoryId: expenseCategories.id,
        category: expenseCategories.name,
        currencyId: currencies.id,
        currencyCode: currencies.code,
        flightNumber: flights.flightNumber,
        airlineIata: airlines.iataCode,
        departure: flights.scheduledDeparture,
        claimId: claimExpenses.claimId,
        claimStatus: claims.status,
        documentCount: sql<number>`(SELECT COUNT(*) FROM Expense_Document d WHERE d.expense_id = ${expenses.id})`,
      })
      .from(expenses)
      .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .innerJoin(currencies, eq(expenses.originalCurrencyId, currencies.id))
      .innerJoin(flightCrew, eq(expenses.flightCrewId, flightCrew.id))
      .innerJoin(flights, eq(flightCrew.flightId, flights.id))
      .innerJoin(airlines, eq(flights.airlineId, airlines.id))
      .leftJoin(claimExpenses, eq(claimExpenses.expenseId, expenses.id))
      .leftJoin(claims, eq(claimExpenses.claimId, claims.id))
      .where(and(...conditions))
      .orderBy(order)
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize)
      .all();
    const withDocuments = rows.map((row) => ({
      ...row,
      documents: db
        .select({
          id: expenseDocuments.id,
          fileName: expenseDocuments.fileName,
          contentType: expenseDocuments.contentType,
        })
        .from(expenseDocuments)
        .where(eq(expenseDocuments.expenseId, row.id))
        .all(),
    }));
    return {
      expenses: withDocuments,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: ids.length,
        totalPages: Math.ceil(ids.length / filters.pageSize),
      },
      summary: this.summary(userId),
    };
  },
  summary(userId: string) {
    // Keep dashboard metrics aligned with the rows the expense register can display.
    // The register requires valid flight, airline, category and currency relationships;
    // counting a broader set here caused the dashboard/register total mismatch.
    const rows = db
      .select({
        id: expenses.id,
        amount: expenses.amount,
        description: expenses.description,
        date: expenses.expenseDate,
        createdAt: expenses.createdAt,
        claimId: claimExpenses.claimId,
        currencyCode: currencies.code,
      })
      .from(expenses)
      .innerJoin(flightCrew, eq(expenses.flightCrewId, flightCrew.id))
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .innerJoin(flights, eq(flightCrew.flightId, flights.id))
      .innerJoin(airlines, eq(flights.airlineId, airlines.id))
      .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .innerJoin(currencies, eq(expenses.originalCurrencyId, currencies.id))
      .leftJoin(claimExpenses, eq(claimExpenses.expenseId, expenses.id))
      .where(eq(crewMembers.userId, userId))
      .all();

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const recentRow = [...rows].sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
    )[0];
    const totals = new Map<string, number>();
    for (const row of rows) {
      totals.set(row.currencyCode, (totals.get(row.currencyCode) ?? 0) + Number(row.amount || 0));
    }

    return {
      total: rows.length,
      thisMonth: rows.filter((row) => String(row.date).startsWith(month)).length,
      unclaimed: rows.filter((row) => !row.claimId).length,
      recent: recentRow
        ? {
            description: recentRow.description,
            amount: recentRow.amount,
            expenseDate: recentRow.date,
            currencyCode: recentRow.currencyCode,
          }
        : null,
      amountByCurrency: [...totals.entries()].map(([code, amount]) => ({
        code,
        amount: String(amount),
      })),
    };
  },
  create(
    userId: string,
    input: {
      assignmentId: string;
      amount: string;
      currencyId: number;
      expenseDate: string;
      categoryId: number;
      description: string;
      location?: string;
    },
  ) {
    const assignment = db
      .select({ id: flightCrew.id, claimStatus: claims.status })
      .from(flightCrew)
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .leftJoin(claims, eq(claims.flightCrewId, flightCrew.id))
      .where(and(eq(flightCrew.id, input.assignmentId), eq(crewMembers.userId, userId)))
      .get();
    if (!assignment) throw new Error("ASSIGNMENT_NOT_FOUND");
    if (assignment.claimStatus && !["DRAFT", "REVISION_REQUIRED"].includes(assignment.claimStatus))
      throw new Error("EXPENSE_CLAIM_LOCKED");
    const id = crypto.randomUUID();
    db.insert(expenses)
      .values({
        id,
        flightCrewId: input.assignmentId,
        amount: input.amount,
        originalCurrencyId: input.currencyId,
        expenseDate: input.expenseDate,
        categoryId: input.categoryId,
        description: input.description,
        location: input.location || null,
      })
      .run();
    return { id };
  },
  update(
    userId: string,
    expenseId: string,
    input: {
      amount: string;
      currencyId: number;
      expenseDate: string;
      categoryId: number;
      description: string;
      location?: string;
    },
  ) {
    const owned = expenseOwner(expenseId, userId);
    if (!owned) throw new Error("EXPENSE_NOT_FOUND");
    if (owned.claimId && !["DRAFT", "REVISION_REQUIRED"].includes(owned.claimStatus ?? ""))
      throw new Error("EXPENSE_CLAIMED");
    db.update(expenses)
      .set({
        amount: input.amount,
        originalCurrencyId: input.currencyId,
        expenseDate: input.expenseDate,
        categoryId: input.categoryId,
        description: input.description,
        location: input.location || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(expenses.id, expenseId))
      .run();
  },
  delete(userId: string, expenseId: string) {
    const owned = expenseOwner(expenseId, userId);
    if (!owned) throw new Error("EXPENSE_NOT_FOUND");
    if (owned.claimId && owned.claimStatus !== "REVISION_REQUIRED")
      throw new Error("EXPENSE_CLAIMED");
    db.delete(expenses).where(eq(expenses.id, expenseId)).run();
  },
  getOwnedExpense(userId: string, expenseId: string) {
    return expenseOwner(expenseId, userId);
  },
  addDocument(
    expenseId: string,
    document: {
      id: string;
      storageKey: string;
      fileName: string;
      contentType: string;
      fileSizeBytes: number;
    },
  ) {
    db.insert(expenseDocuments)
      .values({ ...document, expenseId, documentType: "RECEIPT" })
      .run();
  },
  getDocument(userId: string, documentId: string) {
    return db
      .select({
        id: expenseDocuments.id,
        storageKey: expenseDocuments.storageKey,
        fileName: expenseDocuments.fileName,
        contentType: expenseDocuments.contentType,
        expenseId: expenseDocuments.expenseId,
        claimId: claimExpenses.claimId,
        claimStatus: claims.status,
      })
      .from(expenseDocuments)
      .innerJoin(expenses, eq(expenseDocuments.expenseId, expenses.id))
      .innerJoin(flightCrew, eq(expenses.flightCrewId, flightCrew.id))
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .leftJoin(claimExpenses, eq(claimExpenses.expenseId, expenses.id))
      .leftJoin(claims, eq(claimExpenses.claimId, claims.id))
      .where(and(eq(expenseDocuments.id, documentId), eq(crewMembers.userId, userId)))
      .get();
  },
  deleteDocument(documentId: string) {
    db.delete(expenseDocuments).where(eq(expenseDocuments.id, documentId)).run();
  },
};

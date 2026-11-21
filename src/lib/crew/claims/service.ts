import "server-only";

import { and, asc, count, desc, eq, gte, like, lt, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/lib/db";
import {
  airlines,
  airports,
  claimComments,
  claimExpenses,
  claims,
  crewDesignations,
  crewMembers,
  currencies,
  expenseCategories,
  expenseDocuments,
  expenses,
  flightCrew,
  flights,
  users,
} from "@/lib/db/schema";

function ownedClaim(claimId: string, userId: string) {
  return db
    .select({ id: claims.id, flightCrewId: claims.flightCrewId, status: claims.status })
    .from(claims)
    .innerJoin(flightCrew, eq(claims.flightCrewId, flightCrew.id))
    .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
    .where(and(eq(claims.id, claimId), eq(crewMembers.userId, userId)))
    .get();
}

function addComment(claimId: string, userId: string, comment: string) {
  db.insert(claimComments).values({ claimId, userId, comment }).run();
}

const sqlAliasDestination = alias(airports, "claim_destination_airport");

export const crewClaimsService = {
  reviewQueuePage(
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {},
  ) {
    const requestedPage = Number.isFinite(options.page) ? Math.floor(options.page as number) : 1;
    const requestedPageSize = Number.isFinite(options.pageSize)
      ? Math.floor(options.pageSize as number)
      : 25;
    const page = Math.max(1, requestedPage);
    const pageSize = Math.min(100, Math.max(10, requestedPageSize));
    const search = (options.search ?? "").trim();
    const sortOrder = options.sortOrder === "asc" ? "asc" : "desc";
    const searchTerm = `%${search}%`;
    const filters = [eq(claims.status, "SUBMITTED")];
    if (search) {
      filters.push(
        or(
          like(users.firstName, searchTerm),
          like(users.lastName, searchTerm),
          like(users.email, searchTerm),
          like(flights.flightNumber, searchTerm),
          like(airlines.name, searchTerm),
          like(airports.iataCode, searchTerm),
          like(sqlAliasDestination.iataCode, searchTerm),
          like(claims.id, searchTerm),
        )!,
      );
    }

    const whereClause = and(...filters);
    const total =
      db
        .select({ value: count() })
        .from(claims)
        .innerJoin(flightCrew, eq(claims.flightCrewId, flightCrew.id))
        .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
        .innerJoin(users, eq(crewMembers.userId, users.id))
        .innerJoin(flights, eq(flightCrew.flightId, flights.id))
        .innerJoin(airlines, eq(flights.airlineId, airlines.id))
        .innerJoin(airports, eq(flights.originAirportId, airports.id))
        .innerJoin(sqlAliasDestination, eq(flights.destinationAirportId, sqlAliasDestination.id))
        .where(whereClause)
        .get()?.value ?? 0;

    const sortColumn =
      options.sortBy === "crew"
        ? users.lastName
        : options.sortBy === "flight"
          ? flights.flightNumber
          : options.sortBy === "departure"
            ? flights.scheduledDeparture
            : claims.createdAt;
    const orderExpression = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

    const rows = db
      .select({
        claimId: claims.id,
        status: claims.status,
        createdAt: claims.createdAt,
        updatedAt: claims.updatedAt,
        flightNumber: flights.flightNumber,
        airlineName: airlines.name,
        crewName: users.firstName,
        crewLastName: users.lastName,
        crewEmail: users.email,
        originCode: airports.iataCode,
        originAirportName: airports.name,
        destinationCode: sqlAliasDestination.iataCode,
        destinationAirportName: sqlAliasDestination.name,
        scheduledDeparture: flights.scheduledDeparture,
        scheduledArrival: flights.scheduledArrival,
        actualDeparture: flights.actualDeparture,
        actualArrival: flights.actualArrival,
        flightStatus: flights.status,
      })
      .from(claims)
      .innerJoin(flightCrew, eq(claims.flightCrewId, flightCrew.id))
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .innerJoin(users, eq(crewMembers.userId, users.id))
      .innerJoin(flights, eq(flightCrew.flightId, flights.id))
      .innerJoin(airlines, eq(flights.airlineId, airlines.id))
      .innerJoin(airports, eq(flights.originAirportId, airports.id))
      .innerJoin(sqlAliasDestination, eq(flights.destinationAirportId, sqlAliasDestination.id))
      .where(whereClause)
      .orderBy(orderExpression, asc(claims.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .all();

    const claimsWithExpenses = rows.map((claim) => {
      const claimExpenseRows = db
        .select({
          id: expenses.id,
          description: expenses.description,
          amount: expenses.amount,
          currencyCode: currencies.code,
          category: expenseCategories.name,
          expenseDate: expenses.expenseDate,
          location: expenses.location,
        })
        .from(claimExpenses)
        .innerJoin(expenses, eq(claimExpenses.expenseId, expenses.id))
        .innerJoin(currencies, eq(expenses.originalCurrencyId, currencies.id))
        .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
        .where(eq(claimExpenses.claimId, claim.claimId))
        .all();

      return {
        ...claim,
        expenses: claimExpenseRows.map((expense) => ({
          ...expense,
          documents: db
            .select({
              id: expenseDocuments.id,
              fileName: expenseDocuments.fileName,
              contentType: expenseDocuments.contentType,
              fileSizeBytes: expenseDocuments.fileSizeBytes,
            })
            .from(expenseDocuments)
            .where(eq(expenseDocuments.expenseId, expense.id))
            .all(),
        })),
      };
    });

    return {
      claims: claimsWithExpenses,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    };
  },

  reviewDashboard() {
    const countStatus = (status: string, since?: string) => {
      const conditions = [eq(claims.status, status)];
      if (since) conditions.push(gte(claims.updatedAt, since));
      return (
        db
          .select({ value: count() })
          .from(claims)
          .where(and(...conditions))
          .get()?.value ?? 0
      );
    };
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const day = 24 * 60 * 60 * 1000;
    const pending = countStatus("SUBMITTED");
    const approvedThisMonth = countStatus("APPROVED", monthStart);
    const returnedThisMonth = countStatus("REJECTED", monthStart);
    const cutoff24 = new Date(Date.now() - day).toISOString();
    const cutoff72 = new Date(Date.now() - 3 * day).toISOString();
    const olderThan24Hours =
      db
        .select({ value: count() })
        .from(claims)
        .where(and(eq(claims.status, "SUBMITTED"), lt(claims.createdAt, cutoff24)))
        .get()?.value ?? 0;
    const olderThan72Hours =
      db
        .select({ value: count() })
        .from(claims)
        .where(and(eq(claims.status, "SUBMITTED"), lt(claims.createdAt, cutoff72)))
        .get()?.value ?? 0;
    const oldest = db
      .select({
        claimId: claims.id,
        createdAt: claims.createdAt,
        crewName: users.firstName,
        crewLastName: users.lastName,
        flightNumber: flights.flightNumber,
        airlineName: airlines.name,
      })
      .from(claims)
      .innerJoin(flightCrew, eq(claims.flightCrewId, flightCrew.id))
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .innerJoin(users, eq(crewMembers.userId, users.id))
      .innerJoin(flights, eq(flightCrew.flightId, flights.id))
      .innerJoin(airlines, eq(flights.airlineId, airlines.id))
      .where(eq(claims.status, "SUBMITTED"))
      .orderBy(asc(claims.createdAt))
      .limit(5)
      .all();

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
    const monthlyTrend = db
      .select({
        month: sql<string>`strftime('%Y-%m', ${claims.updatedAt})`,
        approved: sql<number>`sum(case when ${claims.status} = 'APPROVED' then 1 else 0 end)`,
        returned: sql<number>`sum(case when ${claims.status} = 'REJECTED' then 1 else 0 end)`,
      })
      .from(claims)
      .where(
        and(
          or(eq(claims.status, "APPROVED"), eq(claims.status, "REJECTED")),
          gte(claims.updatedAt, sixMonthsAgo),
        ),
      )
      .groupBy(sql`strftime('%Y-%m', ${claims.updatedAt})`)
      .orderBy(sql`strftime('%Y-%m', ${claims.updatedAt})`)
      .all();

    const pendingByCurrency = db
      .select({
        currency: currencies.code,
        amount: sql<number>`sum(cast(${expenses.amount} as real))`,
      })
      .from(claims)
      .innerJoin(claimExpenses, eq(claimExpenses.claimId, claims.id))
      .innerJoin(expenses, eq(claimExpenses.expenseId, expenses.id))
      .innerJoin(currencies, eq(expenses.originalCurrencyId, currencies.id))
      .where(eq(claims.status, "SUBMITTED"))
      .groupBy(currencies.code)
      .orderBy(currencies.code)
      .all();

    const averageReviewHours =
      db
        .select({
          value: sql<number>`round(avg((julianday(${claims.updatedAt}) - julianday(${claims.createdAt})) * 24), 1)`,
        })
        .from(claims)
        .where(
          and(
            or(eq(claims.status, "APPROVED"), eq(claims.status, "REJECTED")),
            gte(claims.updatedAt, monthStart),
          ),
        )
        .get()?.value ?? null;

    const recentActivity = db
      .select({
        claimId: claims.id,
        status: claims.status,
        updatedAt: claims.updatedAt,
        crewName: users.firstName,
        crewLastName: users.lastName,
        flightNumber: flights.flightNumber,
        airlineName: airlines.name,
      })
      .from(claims)
      .innerJoin(flightCrew, eq(claims.flightCrewId, flightCrew.id))
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .innerJoin(users, eq(crewMembers.userId, users.id))
      .innerJoin(flights, eq(flightCrew.flightId, flights.id))
      .innerJoin(airlines, eq(flights.airlineId, airlines.id))
      .where(or(eq(claims.status, "APPROVED"), eq(claims.status, "REJECTED")))
      .orderBy(desc(claims.updatedAt))
      .limit(5)
      .all();

    return {
      pending,
      approvedThisMonth,
      returnedThisMonth,
      olderThan24Hours,
      olderThan72Hours,
      oldest,
      monthlyTrend,
      pendingByCurrency,
      averageReviewHours,
      recentActivity,
    };
  },

  getReviewDocument(documentId: string) {
    return db
      .select({
        id: expenseDocuments.id,
        storageKey: expenseDocuments.storageKey,
        fileName: expenseDocuments.fileName,
        contentType: expenseDocuments.contentType,
      })
      .from(expenseDocuments)
      .innerJoin(expenses, eq(expenseDocuments.expenseId, expenses.id))
      .innerJoin(claimExpenses, eq(claimExpenses.expenseId, expenses.id))
      .innerJoin(claims, eq(claimExpenses.claimId, claims.id))
      .where(
        and(
          eq(expenseDocuments.id, documentId),
          or(
            eq(claims.status, "SUBMITTED"),
            eq(claims.status, "APPROVED"),
            eq(claims.status, "REJECTED"),
          ),
        ),
      )
      .get();
  },

  reviewHistoryPage(
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: "APPROVED" | "REJECTED" | "ALL";
      sortOrder?: "asc" | "desc";
    } = {},
  ) {
    const requestedPage = Number.isFinite(options.page) ? Math.floor(options.page as number) : 1;
    const requestedPageSize = Number.isFinite(options.pageSize)
      ? Math.floor(options.pageSize as number)
      : 25;
    const page = Math.max(1, requestedPage);
    const pageSize = Math.min(100, Math.max(10, requestedPageSize));
    const search = (options.search ?? "").trim();
    const filters =
      options.status && options.status !== "ALL"
        ? [eq(claims.status, options.status)]
        : [or(eq(claims.status, "APPROVED"), eq(claims.status, "REJECTED"))!];
    if (search) {
      const term = `%${search}%`;
      filters.push(
        or(
          like(users.firstName, term),
          like(users.lastName, term),
          like(users.email, term),
          like(flights.flightNumber, term),
          like(airlines.name, term),
          like(claims.id, term),
        )!,
      );
    }
    const whereClause = and(...filters);
    const total =
      db
        .select({ value: count() })
        .from(claims)
        .innerJoin(flightCrew, eq(claims.flightCrewId, flightCrew.id))
        .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
        .innerJoin(users, eq(crewMembers.userId, users.id))
        .innerJoin(flights, eq(flightCrew.flightId, flights.id))
        .innerJoin(airlines, eq(flights.airlineId, airlines.id))
        .innerJoin(airports, eq(flights.originAirportId, airports.id))
        .innerJoin(sqlAliasDestination, eq(flights.destinationAirportId, sqlAliasDestination.id))
        .where(whereClause)
        .get()?.value ?? 0;

    const rows = db
      .select({
        claimId: claims.id,
        status: claims.status,
        createdAt: claims.createdAt,
        updatedAt: claims.updatedAt,
        flightNumber: flights.flightNumber,
        airlineName: airlines.name,
        crewName: users.firstName,
        crewLastName: users.lastName,
        crewEmail: users.email,
        originCode: airports.iataCode,
        originAirportName: airports.name,
        destinationCode: sqlAliasDestination.iataCode,
        destinationAirportName: sqlAliasDestination.name,
        scheduledDeparture: flights.scheduledDeparture,
        scheduledArrival: flights.scheduledArrival,
        actualDeparture: flights.actualDeparture,
        actualArrival: flights.actualArrival,
        flightStatus: flights.status,
      })
      .from(claims)
      .innerJoin(flightCrew, eq(claims.flightCrewId, flightCrew.id))
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .innerJoin(users, eq(crewMembers.userId, users.id))
      .innerJoin(flights, eq(flightCrew.flightId, flights.id))
      .innerJoin(airlines, eq(flights.airlineId, airlines.id))
      .innerJoin(airports, eq(flights.originAirportId, airports.id))
      .innerJoin(sqlAliasDestination, eq(flights.destinationAirportId, sqlAliasDestination.id))
      .where(whereClause)
      .orderBy(
        options.sortOrder === "asc" ? asc(claims.updatedAt) : desc(claims.updatedAt),
        asc(claims.id),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .all();

    const claimsWithComments = rows.map((claim) => ({
      ...claim,
      latestComments: db
        .select({
          comment: claimComments.comment,
          createdAt: claimComments.createdAt,
          authorFirstName: users.firstName,
          authorLastName: users.lastName,
        })
        .from(claimComments)
        .innerJoin(users, eq(claimComments.userId, users.id))
        .where(eq(claimComments.claimId, claim.claimId))
        .orderBy(desc(claimComments.createdAt))
        .limit(1)
        .all(),
    }));

    return {
      claims: claimsWithComments,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    };
  },

  list(userId: string) {
    const assignments = db
      .select({
        assignmentId: flightCrew.id,
        flightId: flights.id,
        flightNumber: flights.flightNumber,
        scheduledDeparture: flights.scheduledDeparture,
        scheduledArrival: flights.scheduledArrival,
        flightStatus: flights.status,
        airlineName: airlines.name,
        airlineIata: airlines.iataCode,
        originCode: airports.iataCode,
        originCity: airports.city,
        destinationCode: sqlAliasDestination.iataCode,
        destinationCity: sqlAliasDestination.city,
        designation: crewDesignations.name,
        claimId: claims.id,
        claimStatus: claims.status,
        claimCreatedAt: claims.createdAt,
      })
      .from(flightCrew)
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .innerJoin(flights, eq(flightCrew.flightId, flights.id))
      .innerJoin(airlines, eq(flights.airlineId, airlines.id))
      .innerJoin(airports, eq(flights.originAirportId, airports.id))
      .innerJoin(sqlAliasDestination, eq(flights.destinationAirportId, sqlAliasDestination.id))
      .innerJoin(crewDesignations, eq(flightCrew.designationId, crewDesignations.id))
      .leftJoin(claims, eq(claims.flightCrewId, flightCrew.id))
      .where(eq(crewMembers.userId, userId))
      .orderBy(desc(flights.scheduledDeparture))
      .all();

    return {
      assignments: assignments.map((assignment) => {
        const expenseRows = db
          .select({
            id: expenses.id,
            amount: expenses.amount,
            expenseDate: expenses.expenseDate,
            location: expenses.location,
            description: expenses.description,
            category: expenseCategories.name,
            currencyCode: currencies.code,
            linkedClaimId: claimExpenses.claimId,
          })
          .from(expenses)
          .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
          .innerJoin(currencies, eq(expenses.originalCurrencyId, currencies.id))
          .leftJoin(claimExpenses, eq(claimExpenses.expenseId, expenses.id))
          .where(eq(expenses.flightCrewId, assignment.assignmentId))
          .orderBy(asc(expenses.expenseDate))
          .all();
        const comments = assignment.claimId
          ? db
              .select({
                id: claimComments.id,
                comment: claimComments.comment,
                parentCommentId: claimComments.parentCommentId,
                createdAt: claimComments.createdAt,
                authorFirstName: users.firstName,
                authorLastName: users.lastName,
              })
              .from(claimComments)
              .innerJoin(users, eq(claimComments.userId, users.id))
              .where(eq(claimComments.claimId, assignment.claimId))
              .orderBy(asc(claimComments.createdAt))
              .all()
          : [];
        return {
          ...assignment,
          expenses: expenseRows.map((expense) => ({
            ...expense,
            isAttachedToThisClaim:
              expense.linkedClaimId === assignment.claimId && !!assignment.claimId,
            isClaimed: !!expense.linkedClaimId,
          })),
          comments,
        };
      }),
    };
  },

  create(userId: string, assignmentId: string) {
    const assignment = db
      .select({ id: flightCrew.id })
      .from(flightCrew)
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .where(and(eq(flightCrew.id, assignmentId), eq(crewMembers.userId, userId)))
      .get();
    if (!assignment) throw new Error("ASSIGNMENT_NOT_FOUND");
    const existing = db
      .select({ id: claims.id })
      .from(claims)
      .where(eq(claims.flightCrewId, assignmentId))
      .get();
    if (existing) return { id: existing.id };
    const id = crypto.randomUUID();
    db.insert(claims).values({ id, flightCrewId: assignmentId, status: "DRAFT" }).run();
    return { id };
  },

  crewAction(userId: string, claimId: string, action: string, expenseId?: string) {
    const claim = ownedClaim(claimId, userId);
    if (!claim) throw new Error("CLAIM_NOT_FOUND");
    if (action === "submit") {
      if (!["DRAFT", "REVISION_REQUIRED"].includes(claim.status)) throw new Error("INVALID_STATUS");
      const count = db
        .select({ id: claimExpenses.id })
        .from(claimExpenses)
        .where(eq(claimExpenses.claimId, claimId))
        .all().length;
      if (!count) throw new Error("EMPTY_CLAIM");
      db.update(claims)
        .set({ status: "SUBMITTED", updatedAt: new Date().toISOString() })
        .where(eq(claims.id, claimId))
        .run();
      addComment(
        claimId,
        userId,
        claim.status === "REVISION_REQUIRED"
          ? "Claim resubmitted after corrections."
          : "Claim submitted for review.",
      );
      return;
    }
    if (action === "reopen") {
      if (claim.status !== "REJECTED") throw new Error("INVALID_STATUS");
      db.update(claims)
        .set({ status: "REVISION_REQUIRED", updatedAt: new Date().toISOString() })
        .where(eq(claims.id, claimId))
        .run();
      addComment(claimId, userId, "Crew reopened the rejected claim for corrections.");
      return;
    }
    if (action === "add-expense" || action === "remove-expense") {
      if (!["DRAFT", "REVISION_REQUIRED"].includes(claim.status)) throw new Error("CLAIM_LOCKED");
      if (!expenseId) throw new Error("EXPENSE_NOT_FOUND");
      const expense = db
        .select({ id: expenses.id, flightCrewId: expenses.flightCrewId })
        .from(expenses)
        .where(eq(expenses.id, expenseId))
        .get();
      if (!expense || expense.flightCrewId !== claim.flightCrewId)
        throw new Error("EXPENSE_NOT_FOUND");
      if (action === "add-expense") {
        const linked = db
          .select({ id: claimExpenses.id })
          .from(claimExpenses)
          .where(eq(claimExpenses.expenseId, expenseId))
          .get();
        if (linked) throw new Error("EXPENSE_ALREADY_CLAIMED");
        db.insert(claimExpenses).values({ claimId, expenseId }).run();
      } else {
        db.delete(claimExpenses)
          .where(and(eq(claimExpenses.claimId, claimId), eq(claimExpenses.expenseId, expenseId)))
          .run();
      }
      return;
    }
    throw new Error("INVALID_ACTION");
  },

  postComment(userId: string, claimId: string, comment: string, parentCommentId?: string) {
    const claim = ownedClaim(claimId, userId);
    if (!claim) throw new Error("CLAIM_NOT_FOUND");
    if (!comment.trim()) throw new Error("COMMENT_REQUIRED");
    if (parentCommentId) {
      const parent = db
        .select({ id: claimComments.id })
        .from(claimComments)
        .where(and(eq(claimComments.id, parentCommentId), eq(claimComments.claimId, claimId)))
        .get();
      if (!parent) throw new Error("COMMENT_NOT_FOUND");
    }
    const id = crypto.randomUUID();
    db.insert(claimComments)
      .values({
        id,
        claimId,
        userId,
        comment: comment.trim(),
        parentCommentId: parentCommentId ?? null,
      })
      .run();
    return { id };
  },

  postReviewerComment(userId: string, claimId: string, comment: string, parentCommentId?: string) {
    const claim = db.select({ id: claims.id }).from(claims).where(eq(claims.id, claimId)).get();
    if (!claim) throw new Error("CLAIM_NOT_FOUND");
    if (!comment.trim()) throw new Error("COMMENT_REQUIRED");
    if (parentCommentId) {
      const parent = db
        .select({ id: claimComments.id })
        .from(claimComments)
        .where(and(eq(claimComments.id, parentCommentId), eq(claimComments.claimId, claimId)))
        .get();
      if (!parent) throw new Error("COMMENT_NOT_FOUND");
    }
    const id = crypto.randomUUID();
    db.insert(claimComments)
      .values({
        id,
        claimId,
        userId,
        comment: comment.trim(),
        parentCommentId: parentCommentId ?? null,
      })
      .run();
    return { id };
  },

  review(userId: string, claimId: string, action: string, comment: string) {
    const claim = db
      .select({ id: claims.id, status: claims.status })
      .from(claims)
      .where(eq(claims.id, claimId))
      .get();
    if (!claim) throw new Error("CLAIM_NOT_FOUND");
    if (claim.status !== "SUBMITTED") throw new Error("INVALID_STATUS");
    if (!comment.trim()) throw new Error("COMMENT_REQUIRED");
    if (action !== "reject" && action !== "approve") throw new Error("INVALID_ACTION");
    db.transaction((tx) => {
      tx.update(claims)
        .set({
          status: action === "reject" ? "REJECTED" : "APPROVED",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(claims.id, claimId))
        .run();
      tx.insert(claimComments).values({ claimId, userId, comment: comment.trim() }).run();
    });
  },

  /** Shared claim-wide conversation history used by every authorised workspace. */
  getConversation(claimId: string, limit = 100, before?: string) {
    const claim = db.select({ id: claims.id }).from(claims).where(eq(claims.id, claimId)).get();
    if (!claim) throw new Error("CLAIM_NOT_FOUND");
    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
    const rows = db
      .select({
        id: claimComments.id,
        claimId: claimComments.claimId,
        comment: claimComments.comment,
        parentCommentId: claimComments.parentCommentId,
        createdAt: claimComments.createdAt,
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(claimComments)
      .innerJoin(users, eq(claimComments.userId, users.id))
      .where(
        before
          ? and(eq(claimComments.claimId, claimId), lt(claimComments.createdAt, before))
          : eq(claimComments.claimId, claimId),
      )
      .orderBy(desc(claimComments.createdAt))
      .limit(safeLimit + 1)
      .all();
    const hasMore = rows.length > safeLimit;
    const page = rows.slice(0, safeLimit).reverse();
    return { messages: page, hasMore, nextBefore: hasMore ? (page[0]?.createdAt ?? null) : null };
  },

  postConversationMessage(
    userId: string,
    claimId: string,
    comment: string,
    parentCommentId?: string,
  ) {
    const claim = db.select({ id: claims.id }).from(claims).where(eq(claims.id, claimId)).get();
    if (!claim) throw new Error("CLAIM_NOT_FOUND");
    if (!comment.trim()) throw new Error("COMMENT_REQUIRED");
    if (parentCommentId) {
      const parent = db
        .select({ id: claimComments.id })
        .from(claimComments)
        .where(and(eq(claimComments.id, parentCommentId), eq(claimComments.claimId, claimId)))
        .get();
      if (!parent) throw new Error("COMMENT_NOT_FOUND");
    }
    const id = crypto.randomUUID();
    db.insert(claimComments)
      .values({
        id,
        claimId,
        userId,
        comment: comment.trim(),
        parentCommentId: parentCommentId ?? null,
      })
      .run();
    return { id };
  },

  userOwnsClaim(claimId: string, userId: string) {
    return Boolean(ownedClaim(claimId, userId));
  },
};

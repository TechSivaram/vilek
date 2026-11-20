import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
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
  reviewQueue() {
    return db
      .select({
        claimId: claims.id,
        status: claims.status,
        createdAt: claims.createdAt,
        flightNumber: flights.flightNumber,
        airlineName: airlines.name,
        crewName: users.firstName,
        crewLastName: users.lastName,
        crewEmail: users.email,
        originCode: airports.iataCode,
        destinationCode: sqlAliasDestination.iataCode,
        scheduledDeparture: flights.scheduledDeparture,
      })
      .from(claims)
      .innerJoin(flightCrew, eq(claims.flightCrewId, flightCrew.id))
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .innerJoin(users, eq(crewMembers.userId, users.id))
      .innerJoin(flights, eq(flightCrew.flightId, flights.id))
      .innerJoin(airlines, eq(flights.airlineId, airlines.id))
      .innerJoin(airports, eq(flights.originAirportId, airports.id))
      .innerJoin(sqlAliasDestination, eq(flights.destinationAirportId, sqlAliasDestination.id))
      .where(eq(claims.status, "SUBMITTED"))
      .orderBy(asc(claims.createdAt))
      .all();
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
};

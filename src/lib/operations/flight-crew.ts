import "server-only";
import { and, asc, countDistinct, desc, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/lib/db";
import {
  airlines,
  airports,
  crewDesignations,
  crewMembers,
  crewMemberDesignations,
  crewQualifications,
  designationQualificationRequirements,
  qualificationTypes,
  flightCrew,
  flightCrewAuditEvents,
  flights,
  users,
} from "@/lib/db/schema";

const originAirport = alias(airports, "flightCrewOriginAirport");
const destinationAirport = alias(airports, "flightCrewDestinationAirport");

export type FlightCrewListInput = {
  search?: string;
  page?: number;
  pageSize?: number;
  direction?: "asc" | "desc";
};

export const flightCrewRepository = {
  listFlights(input: FlightCrewListInput) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 10));
    const search = (input.search ?? "").trim();
    const where: SQL | undefined = search
      ? or(
          like(flights.flightNumber, `%${search}%`),
          like(airlines.name, `%${search}%`),
          like(airlines.iataCode, `%${search}%`),
          like(airlines.icaoCode, `%${search}%`),
          like(originAirport.iataCode, `%${search}%`),
          like(originAirport.name, `%${search}%`),
          like(originAirport.city, `%${search}%`),
          like(destinationAirport.iataCode, `%${search}%`),
          like(destinationAirport.name, `%${search}%`),
          like(destinationAirport.city, `%${search}%`),
          like(users.firstName, `%${search}%`),
          like(users.lastName, `%${search}%`),
          like(sql`(${users.firstName} || ' ' || ${users.lastName})`, `%${search}%`),
          like(crewMembers.badgeNumber, `%${search}%`),
          like(crewDesignations.name, `%${search}%`),
        )
      : undefined;

    const total = db.select({ value: countDistinct(flights.id) })
      .from(flights)
      .innerJoin(airlines, eq(flights.airlineId, airlines.id))
      .innerJoin(originAirport, eq(flights.originAirportId, originAirport.id))
      .innerJoin(destinationAirport, eq(flights.destinationAirportId, destinationAirport.id))
      .leftJoin(flightCrew, eq(flightCrew.flightId, flights.id))
      .leftJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .leftJoin(users, eq(crewMembers.userId, users.id))
      .leftJoin(crewDesignations, eq(flightCrew.designationId, crewDesignations.id))
      .where(where).get()?.value ?? 0;

    const flightsPage = db.selectDistinct({
      id: flights.id,
      flightNumber: flights.flightNumber,
      airlineName: airlines.name,
      airlineCode: airlines.iataCode,
      originCode: originAirport.iataCode,
      originCity: originAirport.city,
      destinationCode: destinationAirport.iataCode,
      destinationCity: destinationAirport.city,
      scheduledDeparture: flights.scheduledDeparture,
    }).from(flights)
      .innerJoin(airlines, eq(flights.airlineId, airlines.id))
      .innerJoin(originAirport, eq(flights.originAirportId, originAirport.id))
      .innerJoin(destinationAirport, eq(flights.destinationAirportId, destinationAirport.id))
      .leftJoin(flightCrew, eq(flightCrew.flightId, flights.id))
      .leftJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .leftJoin(users, eq(crewMembers.userId, users.id))
      .leftJoin(crewDesignations, eq(flightCrew.designationId, crewDesignations.id))
      .where(where)
      .orderBy(desc(flights.scheduledDeparture), asc(airlines.name), asc(flights.flightNumber))
      .limit(pageSize).offset((page - 1) * pageSize).all();

    const ids = flightsPage.map((flight) => flight.id);
    const counts = ids.length ? db.select({ flightId: flightCrew.flightId, count: countDistinct(flightCrew.id) })
      .from(flightCrew).where(inArray(flightCrew.flightId, ids)).groupBy(flightCrew.flightId).all() : [];
    const countMap = new Map(counts.map((item) => [item.flightId, item.count]));
    return { rows: flightsPage.map((flight) => ({ ...flight, crewCount: countMap.get(flight.id) ?? 0 })), total };
  },

  manifest(flightId: string) {
    return db.select({
      id: flightCrew.id,
      crewMemberId: crewMembers.id,
      crewMemberName: sql<string>`trim(${users.firstName} || ' ' || ${users.lastName})`,
      badgeNumber: crewMembers.badgeNumber,
      designationId: crewDesignations.id,
      designationName: crewDesignations.name,
    }).from(flightCrew)
      .innerJoin(flights, eq(flightCrew.flightId, flights.id))
      .innerJoin(airlines, eq(flights.airlineId, airlines.id))
      .innerJoin(originAirport, eq(flights.originAirportId, originAirport.id))
      .innerJoin(destinationAirport, eq(flights.destinationAirportId, destinationAirport.id))
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .innerJoin(users, eq(crewMembers.userId, users.id))
      .innerJoin(crewDesignations, eq(flightCrew.designationId, crewDesignations.id))
      .where(eq(flights.id, flightId))
      .orderBy(asc(crewDesignations.name), asc(users.lastName), asc(users.firstName)).all();
  },
  list(input: FlightCrewListInput) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 10));
    const search = (input.search ?? "").trim();
    const where: SQL | undefined = search
      ? or(
          like(flights.flightNumber, `%${search}%`),
          like(airlines.name, `%${search}%`),
          like(airlines.iataCode, `%${search}%`),
          like(airlines.icaoCode, `%${search}%`),
          like(originAirport.iataCode, `%${search}%`),
          like(originAirport.name, `%${search}%`),
          like(originAirport.city, `%${search}%`),
          like(destinationAirport.iataCode, `%${search}%`),
          like(destinationAirport.name, `%${search}%`),
          like(destinationAirport.city, `%${search}%`),
          like(users.firstName, `%${search}%`),
          like(users.lastName, `%${search}%`),
          like(sql`(${users.firstName} || ' ' || ${users.lastName})`, `%${search}%`),
          like(crewMembers.badgeNumber, `%${search}%`),
          like(crewDesignations.name, `%${search}%`),
        )
      : undefined;

    const total = db
      .select({ value: countDistinct(flights.id) })
      .from(flights)
      .innerJoin(airlines, eq(flights.airlineId, airlines.id))
      .innerJoin(originAirport, eq(flights.originAirportId, originAirport.id))
      .innerJoin(destinationAirport, eq(flights.destinationAirportId, destinationAirport.id))
      .innerJoin(flightCrew, eq(flightCrew.flightId, flights.id))
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .innerJoin(users, eq(crewMembers.userId, users.id))
      .innerJoin(crewDesignations, eq(flightCrew.designationId, crewDesignations.id))
      .where(where)
      .get()?.value ?? 0;

    // Page distinct flights first. Search qualifies a flight if any of its assignments
    // match, but the manifest query below returns every assignment for each selected flight.
    const flightIds = db
      .selectDistinct({ id: flights.id })
      .from(flights)
      .innerJoin(airlines, eq(flights.airlineId, airlines.id))
      .innerJoin(originAirport, eq(flights.originAirportId, originAirport.id))
      .innerJoin(destinationAirport, eq(flights.destinationAirportId, destinationAirport.id))
      .innerJoin(flightCrew, eq(flightCrew.flightId, flights.id))
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .innerJoin(users, eq(crewMembers.userId, users.id))
      .innerJoin(crewDesignations, eq(flightCrew.designationId, crewDesignations.id))
      .where(where)
      .orderBy(desc(flights.scheduledDeparture), asc(airlines.name), asc(flights.flightNumber))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .all()
      .map((row) => row.id);

    if (flightIds.length === 0) return { rows: [], total };

    const rows = db
      .select({
        id: flightCrew.id,
        flightId: flights.id,
        flightNumber: flights.flightNumber,
        airlineName: airlines.name,
        airlineCode: airlines.iataCode,
        originCode: originAirport.iataCode,
        originCity: originAirport.city,
        scheduledDeparture: flights.scheduledDeparture,
        destinationCode: destinationAirport.iataCode,
        destinationCity: destinationAirport.city,
        crewMemberId: crewMembers.id,
        crewMemberName: sql<string>`trim(${users.firstName} || ' ' || ${users.lastName})`,
        badgeNumber: crewMembers.badgeNumber,
        designationId: crewDesignations.id,
        designationName: crewDesignations.name,
        designationCode: crewDesignations.code,
      })
      .from(flightCrew)
      .innerJoin(flights, eq(flightCrew.flightId, flights.id))
      .innerJoin(airlines, eq(flights.airlineId, airlines.id))
      .innerJoin(originAirport, eq(flights.originAirportId, originAirport.id))
      .innerJoin(destinationAirport, eq(flights.destinationAirportId, destinationAirport.id))
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .innerJoin(users, eq(crewMembers.userId, users.id))
      .innerJoin(crewDesignations, eq(flightCrew.designationId, crewDesignations.id))
      .where(inArray(flights.id, flightIds))
      .orderBy(desc(flights.scheduledDeparture), asc(airlines.name), asc(flights.flightNumber), asc(crewDesignations.name), asc(users.lastName), asc(users.firstName))
      .all();

    return { rows, total };
  },

  options() {
    const flightOptions = db
      .select({
        id: flights.id,
        flightNumber: flights.flightNumber,
        airlineName: airlines.name,
        airlineCode: airlines.iataCode,
        originCode: originAirport.iataCode,
        originCity: originAirport.city,
        destinationCode: destinationAirport.iataCode,
        destinationCity: destinationAirport.city,
        scheduledDeparture: flights.scheduledDeparture,
      })
      .from(flights)
      .innerJoin(airlines, eq(flights.airlineId, airlines.id))
      .innerJoin(originAirport, eq(flights.originAirportId, originAirport.id))
        .innerJoin(destinationAirport, eq(flights.destinationAirportId, destinationAirport.id))
      .where(eq(flights.isActive, true))
      .orderBy(desc(flights.scheduledDeparture))
      .all();

    const crewOptions = db
      .select({
        id: crewMembers.id,
        name: sql<string>`trim(${users.firstName} || ' ' || ${users.lastName})`,
        email: users.email,
        badgeNumber: crewMembers.badgeNumber,
      })
      .from(crewMembers)
      .innerJoin(users, eq(crewMembers.userId, users.id))
      .where(and(eq(crewMembers.isActive, true), eq(users.isActive, true)))
      .orderBy(asc(users.lastName), asc(users.firstName))
      .all();

    const designationOptions = db
      .select({ id: crewDesignations.id, code: crewDesignations.code, name: crewDesignations.name })
      .from(crewDesignations)
      .where(eq(crewDesignations.isActive, true))
      .orderBy(asc(crewDesignations.name))
      .all();

    return { flights: flightOptions, crewMembers: crewOptions, designations: designationOptions };
  },

  create(input: { flightId: string; crewMemberId: string; designationId: number }, actor: { id: string; email: string }) {
    // Run validation and the insert/audit write in one SQLite transaction so concurrent
    // requests cannot bypass the eligibility and duplicate checks.
    return db.transaction((tx) => {
      const flight = tx.select({
        id: flights.id,
        flightNumber: flights.flightNumber,
        scheduledDeparture: flights.scheduledDeparture,
      }).from(flights).where(and(eq(flights.id, input.flightId), eq(flights.isActive, true))).get();
      if (!flight) throw new Error("FLIGHT_NOT_AVAILABLE");
      const crew = tx.select({
        id: crewMembers.id,
        name: sql<string>`trim(${users.firstName} || ' ' || ${users.lastName})`,
        badgeNumber: crewMembers.badgeNumber,
      }).from(crewMembers).innerJoin(users, eq(crewMembers.userId, users.id)).where(and(eq(crewMembers.id, input.crewMemberId), eq(crewMembers.isActive, true), eq(users.isActive, true))).get();
      if (!crew) throw new Error("CREW_NOT_AVAILABLE");
      const designation = tx.select({ id: crewDesignations.id, name: crewDesignations.name }).from(crewDesignations).where(and(eq(crewDesignations.id, input.designationId), eq(crewDesignations.isActive, true))).get();
      if (!designation) throw new Error("DESIGNATION_NOT_AVAILABLE");

      const departureDate = flight.scheduledDeparture.slice(0, 10);
      const eligibility = tx.select({ validFrom: crewMemberDesignations.validFrom, validUntil: crewMemberDesignations.validUntil })
        .from(crewMemberDesignations)
        .where(and(eq(crewMemberDesignations.crewMemberId, input.crewMemberId), eq(crewMemberDesignations.designationId, input.designationId), eq(crewMemberDesignations.isActive, true)))
        .get();
      if (!eligibility || (eligibility.validFrom && eligibility.validFrom > departureDate) || (eligibility.validUntil && eligibility.validUntil < departureDate)) {
        throw new Error("CREW_NOT_QUALIFIED_FOR_DESIGNATION");
      }

      const required = tx.select({ qualificationTypeId: designationQualificationRequirements.qualificationTypeId, typeName: qualificationTypes.name })
        .from(designationQualificationRequirements)
        .innerJoin(qualificationTypes, eq(designationQualificationRequirements.qualificationTypeId, qualificationTypes.id))
        .where(and(eq(designationQualificationRequirements.designationId, input.designationId), eq(designationQualificationRequirements.isRequired, true), eq(qualificationTypes.isActive, true)))
        .all();
      for (const requirement of required) {
        const valid = tx.select({ id: crewQualifications.id }).from(crewQualifications)
          .where(and(
            eq(crewQualifications.crewMemberId, input.crewMemberId),
            eq(crewQualifications.qualificationTypeId, requirement.qualificationTypeId),
            eq(crewQualifications.status, "ACTIVE"),
            sql`${crewQualifications.validFrom} <= ${departureDate}`,
            sql`(${crewQualifications.validUntil} IS NULL OR ${crewQualifications.validUntil} >= ${departureDate})`,
          )).get();
        if (!valid) throw new Error(`QUALIFICATION_MISSING:${requirement.typeName}`);
      }

      const assignment = tx.insert(flightCrew).values(input).returning().get();
      tx.insert(flightCrewAuditEvents).values({
        flightId: flight.id,
        flightNumberSnapshot: flight.flightNumber,
        crewMemberId: crew.id,
        crewNameSnapshot: `${crew.name} (${crew.badgeNumber})`,
        designationId: designation.id,
        designationSnapshot: designation.name,
        assignmentId: assignment.id,
        action: "ASSIGNED",
        newValueJson: JSON.stringify({ flightId: flight.id, crewMemberId: crew.id, designationId: designation.id }),
        actorUserId: actor.id,
        actorEmailSnapshot: actor.email,
      }).run();
      return assignment;
    });
  },

  remove(id: string, reason: string, actor: { id: string; email: string }) {
    return db.transaction((tx) => {
      const assignment = tx.select({
        id: flightCrew.id,
        flightId: flights.id,
        flightNumber: flights.flightNumber,
        crewMemberId: crewMembers.id,
        crewName: sql<string>`trim(${users.firstName} || ' ' || ${users.lastName})`,
        badgeNumber: crewMembers.badgeNumber,
        designationId: crewDesignations.id,
        designationName: crewDesignations.name,
      }).from(flightCrew)
        .innerJoin(flights, eq(flightCrew.flightId, flights.id))
        .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
        .innerJoin(users, eq(crewMembers.userId, users.id))
        .innerJoin(crewDesignations, eq(flightCrew.designationId, crewDesignations.id))
        .where(eq(flightCrew.id, id)).get();
      if (!assignment) return { changes: 0 };
      const result = tx.delete(flightCrew).where(eq(flightCrew.id, id)).run();
      tx.insert(flightCrewAuditEvents).values({
        flightId: assignment.flightId,
        flightNumberSnapshot: assignment.flightNumber,
        crewMemberId: assignment.crewMemberId,
        crewNameSnapshot: `${assignment.crewName} (${assignment.badgeNumber})`,
        designationId: assignment.designationId,
        designationSnapshot: assignment.designationName,
        assignmentId: assignment.id,
        action: "REMOVED",
        previousValueJson: JSON.stringify({ flightId: assignment.flightId, crewMemberId: assignment.crewMemberId, designationId: assignment.designationId }),
        reason,
        actorUserId: actor.id,
        actorEmailSnapshot: actor.email,
      }).run();
      return result;
    });
  },
};

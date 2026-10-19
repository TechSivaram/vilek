import "server-only";
import { and, asc, countDistinct, desc, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/lib/db";
import {
  airlines,
  airports,
  crewDesignations,
  crewMembers,
  flightCrew,
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

  create(input: { flightId: string; crewMemberId: string; designationId: number }) {
    const flight = db.select({ id: flights.id }).from(flights).where(and(eq(flights.id, input.flightId), eq(flights.isActive, true))).get();
    if (!flight) throw new Error("FLIGHT_NOT_AVAILABLE");
    const crew = db.select({ id: crewMembers.id }).from(crewMembers).innerJoin(users, eq(crewMembers.userId, users.id)).where(and(eq(crewMembers.id, input.crewMemberId), eq(crewMembers.isActive, true), eq(users.isActive, true))).get();
    if (!crew) throw new Error("CREW_NOT_AVAILABLE");
    const designation = db.select({ id: crewDesignations.id }).from(crewDesignations).where(and(eq(crewDesignations.id, input.designationId), eq(crewDesignations.isActive, true))).get();
    if (!designation) throw new Error("DESIGNATION_NOT_AVAILABLE");
    return db.insert(flightCrew).values(input).run();
  },

  remove(id: string) {
    return db.delete(flightCrew).where(eq(flightCrew.id, id)).run();
  },
};

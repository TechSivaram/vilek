import "server-only";

import { and, asc, count, desc, eq, gte, lte, like, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "@/lib/db";
import {
  airlines,
  airports,
  crewDesignations,
  crewMembers,
  flightCrew,
  flights,
} from "@/lib/db/schema";

export type CrewFlightListParams = {
  page: number;
  pageSize: number;
  search: string;
  status: string;
  fromDate: string;
  toDate: string;
  sortBy: "departure" | "arrival" | "flightNumber" | "airline";
  sortOrder: "asc" | "desc";
};

const allowedStatuses = ["SCHEDULED", "BOARDING", "DEPARTED", "COMPLETED", "CANCELLED"] as const;

export const crewFlightsService = {
  listForEmployee(userId: string, params: CrewFlightListParams) {
    const destinationAirports = alias(airports, "destination_airport");
    const filters = [
      eq(crewMembers.userId, userId),
      eq(crewMembers.isActive, true),
      eq(flights.isActive, true),
    ];

    if (
      params.status &&
      allowedStatuses.includes(params.status as (typeof allowedStatuses)[number])
    ) {
      filters.push(eq(flights.status, params.status));
    }
    if (params.fromDate)
      filters.push(gte(flights.scheduledDeparture, `${params.fromDate}T00:00:00`));
    if (params.toDate) filters.push(lte(flights.scheduledDeparture, `${params.toDate}T23:59:59`));
    if (params.search) {
      const term = `%${params.search}%`;
      filters.push(
        or(
          like(flights.flightNumber, term),
          like(airlines.name, term),
          like(airlines.iataCode, term),
          like(airports.iataCode, term),
          like(airports.city, term),
          like(destinationAirports.iataCode, term),
          like(destinationAirports.city, term),
        )!,
      );
    }
    const where = and(...filters);
    const sortColumn =
      params.sortBy === "arrival"
        ? flights.scheduledArrival
        : params.sortBy === "flightNumber"
          ? flights.flightNumber
          : params.sortBy === "airline"
            ? airlines.name
            : flights.scheduledDeparture;
    const order = params.sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn);

    const base = db
      .select({
        assignmentId: flightCrew.id,
        flightId: flights.id,
        flightNumber: flights.flightNumber,
        airlineName: airlines.name,
        airlineIata: airlines.iataCode,
        originCode: airports.iataCode,
        originCity: airports.city,
        originCountry: airports.country,
        destinationCode: destinationAirports.iataCode,
        destinationCity: destinationAirports.city,
        destinationCountry: destinationAirports.country,
        scheduledDeparture: flights.scheduledDeparture,
        scheduledArrival: flights.scheduledArrival,
        actualDeparture: flights.actualDeparture,
        actualArrival: flights.actualArrival,
        flightStatus: flights.status,
        designation: crewDesignations.name,
      })
      .from(flightCrew)
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .innerJoin(flights, eq(flightCrew.flightId, flights.id))
      .innerJoin(airlines, eq(flights.airlineId, airlines.id))
      .innerJoin(airports, eq(flights.originAirportId, airports.id))
      .innerJoin(destinationAirports, eq(flights.destinationAirportId, destinationAirports.id))
      .innerJoin(crewDesignations, eq(flightCrew.designationId, crewDesignations.id))
      .where(where);

    const rows = base
      .orderBy(order, asc(flightCrew.id))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize)
      .all();

    const aggregate = db
      .select({
        total: count(),
        upcoming: sql<number>`coalesce(sum(case
          when ${flights.status} in ('BOARDING', 'DEPARTED') then 1
          when ${flights.status} = 'SCHEDULED'
            and datetime(${flights.scheduledDeparture}) >= datetime('now', 'localtime') then 1
          else 0
        end), 0)`,
        completed: sql<number>`coalesce(sum(case
          when ${flights.status} in ('COMPLETED', 'CANCELLED') then 1
          else 0
        end), 0)`,
      })
      .from(flightCrew)
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .innerJoin(flights, eq(flightCrew.flightId, flights.id))
      .where(
        and(
          eq(crewMembers.userId, userId),
          eq(crewMembers.isActive, true),
          eq(flights.isActive, true),
        ),
      )
      .get();

    const total =
      db
        .select({ total: count() })
        .from(flightCrew)
        .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
        .innerJoin(flights, eq(flightCrew.flightId, flights.id))
        .innerJoin(airlines, eq(flights.airlineId, airlines.id))
        .innerJoin(airports, eq(flights.originAirportId, airports.id))
        .innerJoin(destinationAirports, eq(flights.destinationAirportId, destinationAirports.id))
        .where(where)
        .get()?.total ?? 0;

    return {
      flights: rows,
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
      },
      summary: {
        total: Number(aggregate?.total ?? 0),
        upcoming: Number(aggregate?.upcoming ?? 0),
        completed: Number(aggregate?.completed ?? 0),
      },
    };
  },

  summaryForEmployee(userId: string) {
    const destinationAirports = alias(airports, "summary_destination_airport");
    const baseFilters = [
      eq(crewMembers.userId, userId),
      eq(crewMembers.isActive, true),
      eq(flights.isActive, true),
    ];

    const counts = db
      .select({
        total: count(),
        upcoming: sql<number>`coalesce(sum(case when ${flights.status} not in ('COMPLETED', 'CANCELLED') and datetime(${flights.scheduledDeparture}) >= datetime('now', 'localtime') then 1 else 0 end), 0)`,
        thisMonth: sql<number>`coalesce(sum(case when strftime('%Y-%m', ${flights.scheduledDeparture}) = strftime('%Y-%m', 'now', 'localtime') then 1 else 0 end), 0)`,
      })
      .from(flightCrew)
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .innerJoin(flights, eq(flightCrew.flightId, flights.id))
      .where(and(...baseFilters))
      .get();

    const nextFlight = db
      .select({
        assignmentId: flightCrew.id,
        flightNumber: flights.flightNumber,
        airlineName: airlines.name,
        airlineIata: airlines.iataCode,
        originCode: airports.iataCode,
        originCity: airports.city,
        destinationCode: destinationAirports.iataCode,
        destinationCity: destinationAirports.city,
        scheduledDeparture: flights.scheduledDeparture,
        scheduledArrival: flights.scheduledArrival,
        flightStatus: flights.status,
        designation: crewDesignations.name,
      })
      .from(flightCrew)
      .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
      .innerJoin(flights, eq(flightCrew.flightId, flights.id))
      .innerJoin(airlines, eq(flights.airlineId, airlines.id))
      .innerJoin(airports, eq(flights.originAirportId, airports.id))
      .innerJoin(destinationAirports, eq(flights.destinationAirportId, destinationAirports.id))
      .innerJoin(crewDesignations, eq(flightCrew.designationId, crewDesignations.id))
      .where(
        and(
          ...baseFilters,
          sql`${flights.status} not in ('COMPLETED', 'CANCELLED')`,
          sql`datetime(${flights.scheduledDeparture}) >= datetime('now', 'localtime')`,
        ),
      )
      .orderBy(asc(flights.scheduledDeparture), asc(flightCrew.id))
      .limit(1)
      .get();

    return {
      summary: {
        total: Number(counts?.total ?? 0),
        upcoming: Number(counts?.upcoming ?? 0),
        thisMonth: Number(counts?.thisMonth ?? 0),
      },
      nextFlight: nextFlight ?? null,
    };
  },
};

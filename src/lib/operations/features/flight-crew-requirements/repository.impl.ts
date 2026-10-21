import "server-only";
import { asc, eq, like, or, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  airports,
  airlines,
  crewDesignations,
  flightCrewRequirements,
  flights,
} from "@/lib/db/schema";
import type {
  FlightCrewRequirementsCreateDto,
  FlightCrewRequirementsListResponseDto,
  FlightCrewListResponseDto,
} from "./dto";
import type { FlightCrewRequirementsRepository } from "./repository";

function listFlightOptions() {
  const airportRows = db
    .select({ id: airports.id, code: airports.iataCode })
    .from(airports)
    .all();
  const airportCodes = new Map(
    airportRows.map((airport) => [airport.id, airport.code]),
  );
  return db
    .select({
      id: flights.id,
      flight_number: flights.flightNumber,
      origin_airport_id: flights.originAirportId,
      destination_airport_id: flights.destinationAirportId,
    })
    .from(flights)
    .orderBy(asc(flights.flightNumber), asc(flights.id))
    .all()
    .map((flight) => ({
      value: flight.id,
      label: `${flight.flight_number} — ${airportCodes.get(flight.origin_airport_id) ?? "?"} → ${airportCodes.get(flight.destination_airport_id) ?? "?"}`,
    }));
}
function listDesignationOptions() {
  return db
    .select({ value: crewDesignations.id, label: crewDesignations.name })
    .from(crewDesignations)
    .orderBy(asc(crewDesignations.name))
    .all();
}

export const flightCrewRequirementsRepository: FlightCrewRequirementsRepository =
  {
    list(flightId): FlightCrewRequirementsListResponseDto {
      let query = db
        .select({
          id: flightCrewRequirements.id,
          flight_id: flightCrewRequirements.flightId,
          designation_id: flightCrewRequirements.designationId,
          required_count: flightCrewRequirements.requiredCount,
          reason: flightCrewRequirements.reason,
          created_at: flightCrewRequirements.createdAt,
          flight_number: flights.flightNumber,
          scheduled_departure: flights.scheduledDeparture,
          scheduled_arrival: flights.scheduledArrival,
          airline_name: airlines.name,
          origin_airport_id: flights.originAirportId,
          destination_airport_id: flights.destinationAirportId,
          designation_name: crewDesignations.name,
        })
        .from(flightCrewRequirements)
        .leftJoin(flights, eq(flightCrewRequirements.flightId, flights.id))
        .leftJoin(airlines, eq(flights.airlineId, airlines.id))
        .leftJoin(airports, eq(flights.originAirportId, airports.id))
        .leftJoin(
          crewDesignations,
          eq(flightCrewRequirements.designationId, crewDesignations.id),
        )
        .$dynamic();
      if (flightId)
        query = query.where(
          eq(flightCrewRequirements.flightId, flightId),
        ) as typeof query;
      const airportRows = db
        .select({ id: airports.id, code: airports.iataCode })
        .from(airports)
        .all();
      const airportCodes = new Map(
        airportRows.map((airport) => [airport.id, airport.code]),
      );
      const rows = query
        .orderBy(asc(crewDesignations.name), asc(flightCrewRequirements.id))
        .limit(500)
        .all()
        .map((row) => ({
          ...row,
          flight_route: `${airportCodes.get(row.origin_airport_id) ?? "?"} → ${airportCodes.get(row.destination_airport_id) ?? "?"}`,
        }));
      return {
        rows,
        options: {
          flight_id: listFlightOptions(),
          designation_id: listDesignationOptions(),
        },
      };
    },
    listFlights(search): FlightCrewListResponseDto {
      const pattern = `%${search.trim()}%`;
      const flightsQuery = db
        .select({
          flight_id: flights.id,
          flight_number: flights.flightNumber,
          scheduled_departure: flights.scheduledDeparture,
          scheduled_arrival: flights.scheduledArrival,
          airline_name: airlines.name,
          origin_airport_id: flights.originAirportId,
          destination_airport_id: flights.destinationAirportId,
        })
        .from(flights)
        .leftJoin(airlines, eq(flights.airlineId, airlines.id))
        .leftJoin(airports, eq(flights.originAirportId, airports.id))
        .$dynamic();
      const filtered = search.trim()
        ? flightsQuery.where(
            or(
              like(flights.flightNumber, pattern),
              like(airlines.name, pattern),
              like(airports.iataCode, pattern),
            ),
          )
        : flightsQuery;
      const flightRows = filtered
        .orderBy(asc(airlines.name), asc(flights.flightNumber), asc(flights.id))
        .limit(500)
        .all();
      const counts = db
        .select({
          flightId: flightCrewRequirements.flightId,
          requirementCount: count(),
        })
        .from(flightCrewRequirements)
        .groupBy(flightCrewRequirements.flightId)
        .all();
      const countByFlight = new Map(
        counts.map((row) => [row.flightId, row.requirementCount]),
      );
      const airportRows = db
        .select({ id: airports.id, code: airports.iataCode })
        .from(airports)
        .all();
      const airportCodes = new Map(
        airportRows.map((airport) => [airport.id, airport.code]),
      );
      const rows = flightRows.map((row) => ({
        flight_id: row.flight_id,
        flight_number: row.flight_number,
        scheduled_departure: row.scheduled_departure,
        scheduled_arrival: row.scheduled_arrival,
        airline_name: row.airline_name,
        flight_route: `${airportCodes.get(row.origin_airport_id) ?? "?"} → ${airportCodes.get(row.destination_airport_id) ?? "?"}`,
        requirement_count: countByFlight.get(row.flight_id) ?? 0,
      }));
      return {
        rows,
        options: {
          flight_id: listFlightOptions(),
          designation_id: listDesignationOptions(),
        },
      };
    },
    create(input: FlightCrewRequirementsCreateDto): string {
      const row = db
        .insert(flightCrewRequirements)
        .values({
          flightId: String(input.flight_id),
          designationId: input.designation_id,
          requiredCount: input.required_count,
          reason: input.reason ?? null,
        })
        .returning({ id: flightCrewRequirements.id })
        .get();
      return String(row.id);
    },
    update(
      id: string,
      input: Partial<FlightCrewRequirementsCreateDto>,
    ): boolean {
      const values: Partial<typeof flightCrewRequirements.$inferInsert> = {};
      if (input.flight_id !== undefined)
        values.flightId = String(input.flight_id);
      if (input.designation_id !== undefined)
        values.designationId = input.designation_id;
      if (input.required_count !== undefined)
        values.requiredCount = input.required_count;
      if (input.reason !== undefined) values.reason = input.reason;
      if (!Object.keys(values).length)
        return (
          db
            .select({ id: flightCrewRequirements.id })
            .from(flightCrewRequirements)
            .where(eq(flightCrewRequirements.id, Number(id)))
            .get() !== undefined
        );
      values.updatedAt = new Date().toISOString();
      return (
        db
          .update(flightCrewRequirements)
          .set(values)
          .where(eq(flightCrewRequirements.id, Number(id)))
          .returning({ id: flightCrewRequirements.id })
          .all().length > 0
      );
    },
  };

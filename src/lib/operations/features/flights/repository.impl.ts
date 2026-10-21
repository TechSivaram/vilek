import "server-only";
import { db } from "@/lib/db";
import { airlines, airports, flights } from "@/lib/db/schema";
import { alias } from "drizzle-orm/sqlite-core";
import { and, asc, count, desc, eq, like, or, type SQL } from "drizzle-orm";

import type { FlightsListQuery } from "./dto";

const originAirport = alias(airports, "originAirport");
const destinationAirport = alias(airports, "destinationAirport");

const sortColumns = {
  id: flights.id,
  airlineId: airlines.iataCode,
  flightNumber: flights.flightNumber,
  originAirportId: originAirport.iataCode,
  destinationAirportId: destinationAirport.iataCode,
  scheduledDeparture: flights.scheduledDeparture,
  scheduledArrival: flights.scheduledArrival,
  actualDeparture: flights.actualDeparture,
  actualArrival: flights.actualArrival,
  isActive: flights.isActive,
} as const;

export const flightsRepository = {
  async list(input: FlightsListQuery) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 10));
    const search = (input.search ?? "").trim();

    const filters: SQL[] = [];
    if (search) {
      const escaped = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
      filters.push(
        or(
          like(flights.flightNumber, escaped),
          like(airlines.iataCode, escaped),
          like(airlines.icaoCode, escaped),
          like(airlines.name, escaped),
          like(originAirport.iataCode, escaped),
          like(originAirport.name, escaped),
          like(destinationAirport.iataCode, escaped),
          like(destinationAirport.name, escaped),
        )!,
      );
    }
    const where = filters.length ? and(...filters) : undefined;

    // Count and page queries use the same joins and filters so pagination totals
    // reflect the exact set of flights shown in the grid.
    const total =
      db
        .select({ value: count() })
        .from(flights)
        .leftJoin(airlines, eq(flights.airlineId, airlines.id))
        .leftJoin(originAirport, eq(flights.originAirportId, originAirport.id))
        .leftJoin(
          destinationAirport,
          eq(flights.destinationAirportId, destinationAirport.id),
        )
        .where(where)
        .get()?.value ?? 0;

    const requestedSort = input.sort as keyof typeof sortColumns | undefined;
    const sortColumn = requestedSort ? sortColumns[requestedSort] : undefined;
    const ordering = sortColumn
      ? input.direction === "desc"
        ? desc(sortColumn)
        : asc(sortColumn)
      : asc(flights.scheduledDeparture);

    const rows = db
      .select({
        id: flights.id,
        airlineId: flights.airlineId,
        airlineCode: airlines.iataCode,
        airlineIcaoCode: airlines.icaoCode,
        airlineName: airlines.name,
        flightNumber: flights.flightNumber,
        originAirportId: flights.originAirportId,
        originAirportCode: originAirport.iataCode,
        originAirportName: originAirport.name,
        originAirportCity: originAirport.city,
        destinationAirportId: flights.destinationAirportId,
        destinationAirportCode: destinationAirport.iataCode,
        destinationAirportName: destinationAirport.name,
        destinationAirportCity: destinationAirport.city,
        scheduledDeparture: flights.scheduledDeparture,
        scheduledArrival: flights.scheduledArrival,
        actualDeparture: flights.actualDeparture,
        actualArrival: flights.actualArrival,
        isActive: flights.isActive,
      })
      .from(flights)
      .leftJoin(airlines, eq(flights.airlineId, airlines.id))
      .leftJoin(originAirport, eq(flights.originAirportId, originAirport.id))
      .leftJoin(
        destinationAirport,
        eq(flights.destinationAirportId, destinationAirport.id),
      )
      .where(where)
      .orderBy(ordering)
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .all();

    return { rows, total };
  },
  create(values: Record<string, unknown>) {
    const result = db
      .insert(flights)
      .values(values as typeof flights.$inferInsert)
      .run();
    return { changes: result.changes };
  },
  update(id: string | number, values: Record<string, unknown>) {
    const result = db
      .update(flights)
      .set(values as Partial<typeof flights.$inferInsert>)
      .where(eq(flights.id, String(id)))
      .run();
    return { changes: result.changes };
  },
  deactivate(id: string | number) {
    const result = db
      .update(flights)
      .set({ isActive: false })
      .where(eq(flights.id, String(id)))
      .run();
    return { changes: result.changes };
  },
  options() {
    return {
      airlines: db
        .select({
          id: airlines.id,
          name: airlines.name,
          iataCode: airlines.iataCode,
          icaoCode: airlines.icaoCode,
        })
        .from(airlines)
        .where(eq(airlines.isActive, true))
        .all(),
      airports: db
        .select({
          id: airports.id,
          name: airports.name,
          iataCode: airports.iataCode,
          icaoCode: airports.icaoCode,
          city: airports.city,
        })
        .from(airports)
        .where(eq(airports.isActive, true))
        .all(),
    };
  },
};

import "server-only";
import { db } from "@/lib/db";
import { airports } from "@/lib/db/schema";
import { asc, count, desc, eq, like, or, type SQL } from "drizzle-orm";
import type { AirportsListQuery } from "./dto";

export const airportsRepository = {
  async list(input: AirportsListQuery) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 10));
    const search = (input.search ?? "").trim();
    const escaped = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    const where = search
      ? or(
          like(airports.iataCode, escaped),
          like(airports.icaoCode, escaped),
          like(airports.name, escaped),
          like(airports.city, escaped),
          like(airports.country, escaped),
        )
      : undefined;

    const total =
      db.select({ value: count() }).from(airports).where(where).get()?.value ??
      0;

    let ordering: SQL;
    switch (input.sort) {
      case "iataCode":
        ordering =
          input.direction === "desc"
            ? desc(airports.iataCode)
            : asc(airports.iataCode);
        break;
      case "icaoCode":
        ordering =
          input.direction === "desc"
            ? desc(airports.icaoCode)
            : asc(airports.icaoCode);
        break;
      case "name":
        ordering =
          input.direction === "desc" ? desc(airports.name) : asc(airports.name);
        break;
      case "city":
        ordering =
          input.direction === "desc" ? desc(airports.city) : asc(airports.city);
        break;
      case "country":
        ordering =
          input.direction === "desc"
            ? desc(airports.country)
            : asc(airports.country);
        break;
      case "timeZone":
        ordering =
          input.direction === "desc"
            ? desc(airports.timeZone)
            : asc(airports.timeZone);
        break;
      case "isActive":
        ordering =
          input.direction === "desc"
            ? desc(airports.isActive)
            : asc(airports.isActive);
        break;
      case "id":
        ordering =
          input.direction === "desc" ? desc(airports.id) : asc(airports.id);
        break;
      default:
        ordering = asc(airports.name);
    }

    const rows = db
      .select()
      .from(airports)
      .where(where)
      .orderBy(ordering, asc(airports.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .all();
    return { rows, total };
  },
  create(values: Record<string, unknown>) {
    const result = db
      .insert(airports)
      .values(values as typeof airports.$inferInsert)
      .run();
    return { changes: result.changes };
  },
  update(id: string | number, values: Record<string, unknown>) {
    const result = db
      .update(airports)
      .set(values as Partial<typeof airports.$inferInsert>)
      .where(eq(airports.id, Number(id)))
      .run();
    return { changes: result.changes };
  },
  deactivate(id: string | number) {
    const result = db
      .update(airports)
      .set({ isActive: false })
      .where(eq(airports.id, Number(id)))
      .run();
    return { changes: result.changes };
  },
};

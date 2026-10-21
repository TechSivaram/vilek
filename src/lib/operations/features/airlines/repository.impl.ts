import "server-only";
import { db } from "@/lib/db";
import { airlines } from "@/lib/db/schema";
import { asc, count, desc, eq, like, or, type SQL } from "drizzle-orm";
import type { AirlinesListQuery } from "./dto";

export const airlinesRepository = {
  async list(input: AirlinesListQuery) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 10));
    const search = (input.search ?? "").trim();
    const escaped = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    const where = search
      ? or(
          like(airlines.iataCode, escaped),
          like(airlines.icaoCode, escaped),
          like(airlines.name, escaped),
        )
      : undefined;

    const total = db.select({ value: count() }).from(airlines).where(where).get()?.value ?? 0;

    let ordering: SQL;
    switch (input.sort) {
      case "iataCode":
        ordering = input.direction === "desc" ? desc(airlines.iataCode) : asc(airlines.iataCode);
        break;
      case "icaoCode":
        ordering = input.direction === "desc" ? desc(airlines.icaoCode) : asc(airlines.icaoCode);
        break;
      case "name":
        ordering = input.direction === "desc" ? desc(airlines.name) : asc(airlines.name);
        break;
      case "isActive":
        ordering = input.direction === "desc" ? desc(airlines.isActive) : asc(airlines.isActive);
        break;
      case "id":
        ordering = input.direction === "desc" ? desc(airlines.id) : asc(airlines.id);
        break;
      default:
        ordering = asc(airlines.name);
    }

    const rows = db
      .select()
      .from(airlines)
      .where(where)
      .orderBy(ordering, asc(airlines.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .all();
    return { rows, total };
  },
  create(values: Record<string, unknown>) {
    const result = db
      .insert(airlines)
      .values(values as typeof airlines.$inferInsert)
      .run();
    return { changes: result.changes };
  },
  update(id: string | number, values: Record<string, unknown>) {
    const result = db
      .update(airlines)
      .set(values as Partial<typeof airlines.$inferInsert>)
      .where(eq(airlines.id, Number(id)))
      .run();
    return { changes: result.changes };
  },
  deactivate(id: string | number) {
    const result = db
      .update(airlines)
      .set({ isActive: false })
      .where(eq(airlines.id, Number(id)))
      .run();
    return { changes: result.changes };
  },
};

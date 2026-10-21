import "server-only";
import { db } from "@/lib/db";
import { count, eq, like, or, asc, desc } from "drizzle-orm";
import { currencies } from "@/lib/db/schema";
import type { CurrenciesListQuery } from "./dto";

export const currenciesRepository = {
  async list(input: CurrenciesListQuery) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 10));
    const q = (input.search ?? "").trim();
    const escapedQuery = q.replace(/[\\%_]/g, "\\$&");
    const where = q
      ? or(
          like(currencies.code, `%${escapedQuery}%`),
          like(currencies.name, `%${escapedQuery}%`),
        )
      : undefined;
    const total =
      db.select({ value: count() }).from(currencies).where(where).get()
        ?.value ?? 0;
    const sortColumns = {
      id: currencies.id,
      code: currencies.code,
      name: currencies.name,
      minorUnits: currencies.minorUnits,
      isActive: currencies.isActive,
    };
    const sortColumn =
      input.sort && input.sort in sortColumns
        ? sortColumns[input.sort as keyof typeof sortColumns]
        : undefined;
    const ordering = sortColumn
      ? input.direction === "desc"
        ? desc(sortColumn)
        : asc(sortColumn)
      : undefined;
    const query = db.select().from(currencies).where(where);
    const rows = (ordering ? query.orderBy(ordering) : query)
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .all();
    return { rows, total };
  },
  create(values: Record<string, unknown>) {
    const result = db
      .insert(currencies)
      .values(values as never)
      .run();
    return { changes: result.changes };
  },
  update(id: string | number, values: Record<string, unknown>) {
    const result = db
      .update(currencies)
      .set(values as never)
      .where(eq(currencies.id, Number(id) as never))
      .run();
    return { changes: result.changes };
  },
  deactivate(id: string | number) {
    const result = db
      .update(currencies)
      .set({ isActive: false })
      .where(eq(currencies.id, Number(id) as never))
      .run();
    return { changes: result.changes };
  },
};

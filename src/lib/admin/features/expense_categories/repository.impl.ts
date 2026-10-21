import "server-only";
import { db } from "@/lib/db";
import { count, eq, like, or, asc, desc } from "drizzle-orm";
import { expenseCategories } from "@/lib/db/schema";
import type { ExpenseCategoriesListQuery } from "./dto";

export const expense_categoriesRepository = {
  async list(input: ExpenseCategoriesListQuery) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 10));
    const q = (input.search ?? "").trim();
    const escapedQuery = q.replace(/[\\%_]/g, "\\$&");
    const where = q
      ? or(
          like(expenseCategories.code, `%${escapedQuery}%`),
          like(expenseCategories.name, `%${escapedQuery}%`),
        )
      : undefined;
    const total =
      db.select({ value: count() }).from(expenseCategories).where(where).get()?.value ?? 0;
    const sortColumns = {
      id: expenseCategories.id,
      code: expenseCategories.code,
      name: expenseCategories.name,
      isActive: expenseCategories.isActive,
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
    const query = db.select().from(expenseCategories).where(where);
    const rows = (ordering ? query.orderBy(ordering) : query)
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .all();
    return { rows, total };
  },
  create(values: Record<string, unknown>) {
    const result = db
      .insert(expenseCategories)
      .values(values as never)
      .run();
    return { changes: result.changes };
  },
  update(id: string | number, values: Record<string, unknown>) {
    const result = db
      .update(expenseCategories)
      .set(values as never)
      .where(eq(expenseCategories.id, Number(id) as never))
      .run();
    return { changes: result.changes };
  },
  deactivate(id: string | number) {
    const result = db
      .update(expenseCategories)
      .set({ isActive: false })
      .where(eq(expenseCategories.id, Number(id) as never))
      .run();
    return { changes: result.changes };
  },
};

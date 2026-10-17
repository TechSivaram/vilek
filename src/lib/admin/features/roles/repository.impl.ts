import "server-only";
import { db } from "@/lib/db";
import { resourceConfigs } from "@/lib/admin/resources";
import { count, like, or, asc, desc } from "drizzle-orm";
import { makeCrudRepository } from "../repository-crud";
import type { RolesListQuery } from "./dto";
const config = resourceConfigs["roles"];
const crud = makeCrudRepository("roles");
export const rolesRepository = {
  async list(input: RolesListQuery) {
    const table = config?.table as any;
    if (!table) return { rows: [], total: 0 };
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 10));
    const q = (input.search ?? "").trim();
    const searchable = (config.search ?? [])
      .map((key) => table[key])
      .filter(Boolean);
    const where =
      q && searchable.length
        ? or(
            ...searchable.map((column: any) =>
              like(column, `%${q.replace(/[\\%_]/g, "\\$&")}%`),
            ),
          )
        : undefined;
    const total =
      db.select({ value: count() }).from(table).where(where).get()?.value ?? 0;
    const requestedSort =
      input.sort && typeof input.sort === "string" ? input.sort : "";
    const sortColumn =
      requestedSort && (table as Record<string, any>)[requestedSort]
        ? (table as Record<string, any>)[requestedSort]
        : undefined;
    const ordering = sortColumn
      ? input.direction === "desc"
        ? desc(sortColumn)
        : asc(sortColumn)
      : undefined;
    const baseQuery = db.select().from(table).where(where);
    const rows = (ordering ? baseQuery.orderBy(ordering) : baseQuery)
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .all();
    return { rows, total };
  },
  create(values: Record<string, unknown>) {
    return crud.create(values);
  },
  update(id: string | number, values: Record<string, unknown>) {
    return crud.update(id, values);
  },
  deactivate(id: string | number) {
    return crud.deactivate(id);
  },
};

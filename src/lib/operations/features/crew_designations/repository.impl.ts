import "server-only";
import { db } from "@/lib/db";
import { crewDesignations } from "@/lib/db/schema";
import { asc, count, desc, eq, like, or, type SQL } from "drizzle-orm";
import type { CrewDesignationsListQuery } from "./dto";

export const crew_designationsRepository = {
  async list(input: CrewDesignationsListQuery) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 10));
    const search = (input.search ?? "").trim();
    const escaped = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    const where = search
      ? or(
          like(crewDesignations.code, escaped),
          like(crewDesignations.name, escaped),
        )
      : undefined;

    const total =
      db.select({ value: count() }).from(crewDesignations).where(where).get()
        ?.value ?? 0;

    let ordering: SQL;
    switch (input.sort) {
      case "code":
        ordering =
          input.direction === "desc"
            ? desc(crewDesignations.code)
            : asc(crewDesignations.code);
        break;
      case "name":
        ordering =
          input.direction === "desc"
            ? desc(crewDesignations.name)
            : asc(crewDesignations.name);
        break;
      case "isActive":
        ordering =
          input.direction === "desc"
            ? desc(crewDesignations.isActive)
            : asc(crewDesignations.isActive);
        break;
      case "id":
        ordering =
          input.direction === "desc"
            ? desc(crewDesignations.id)
            : asc(crewDesignations.id);
        break;
      default:
        ordering = asc(crewDesignations.name);
    }

    const rows = db
      .select()
      .from(crewDesignations)
      .where(where)
      .orderBy(ordering, asc(crewDesignations.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .all();
    return { rows, total };
  },
  create(values: Record<string, unknown>) {
    const result = db
      .insert(crewDesignations)
      .values(values as typeof crewDesignations.$inferInsert)
      .run();
    return { changes: result.changes };
  },
  update(id: string | number, values: Record<string, unknown>) {
    const result = db
      .update(crewDesignations)
      .set(values as Partial<typeof crewDesignations.$inferInsert>)
      .where(eq(crewDesignations.id, Number(id)))
      .run();
    return { changes: result.changes };
  },
  deactivate(id: string | number) {
    const result = db
      .update(crewDesignations)
      .set({ isActive: false })
      .where(eq(crewDesignations.id, Number(id)))
      .run();
    return { changes: result.changes };
  },
};

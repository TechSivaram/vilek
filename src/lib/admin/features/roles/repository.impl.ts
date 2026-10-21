import "server-only";
import { db } from "@/lib/db";
import { and, count, eq, like, or, asc, desc } from "drizzle-orm";
import { roles } from "@/lib/db/schema";
import { users, userRoles } from "@/lib/db/schema";
import type { RolesListQuery } from "./dto";

export const rolesRepository = {
  async list(input: RolesListQuery) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 10));
    const q = (input.search ?? "").trim();
    const escapedQuery = q.replace(/[\\%_]/g, "\\$&");
    const where = q
      ? or(
          like(roles.code, `%${escapedQuery}%`),
          like(roles.name, `%${escapedQuery}%`),
          like(roles.description, `%${escapedQuery}%`),
        )
      : undefined;
    const total = db.select({ value: count() }).from(roles).where(where).get()?.value ?? 0;
    const sortColumns = {
      id: roles.id,
      code: roles.code,
      name: roles.name,
      isActive: roles.isActive,
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
    const query = db.select().from(roles).where(where);
    const rows = (ordering ? query.orderBy(ordering) : query)
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .all();
    return { rows, total };
  },
  create(_values: Record<string, unknown>) {
    throw new Error("Role creation is not supported.");
  },
  update(id: string | number, values: Record<string, unknown>) {
    if (values.isActive === false && isLastAdminRole(Number(id)))
      throw new Error("LAST_ADMIN_ROLE");
    const result = db
      .update(roles)
      .set(values as never)
      .where(eq(roles.id, Number(id)))
      .run();
    return { changes: result.changes };
  },
  deactivate(id: string | number) {
    if (isLastAdminRole(Number(id))) throw new Error("LAST_ADMIN_ROLE");
    const result = db
      .update(roles)
      .set({ isActive: false })
      .where(eq(roles.id, Number(id)))
      .run();
    return { changes: result.changes };
  },
};
function activeAdminCount() {
  return (
    db
      .select({ value: count() })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(users.isActive, true), eq(roles.code, "ADMIN"), eq(roles.isActive, true)))
      .get()?.value ?? 0
  );
}
function isLastAdminRole(id: number) {
  const target = db.select({ code: roles.code }).from(roles).where(eq(roles.id, id)).get();
  return target?.code === "ADMIN" && activeAdminCount() <= 1;
}

import "server-only";
import { db } from "@/lib/db";
import { and, count, eq } from "drizzle-orm";
import { users, roles, userRoles } from "@/lib/db/schema";
import { resourceConfigs } from "@/lib/admin/resources";

/** Low-level Drizzle helper. It is only called from a feature repository, never from an API route. */
export function makeCrudRepository(resource: string) {
  const config = resourceConfigs[resource];
  const table = config.table as any;
  return {
    create(values: Record<string, unknown>) {
      const result = db
        .insert(table)
        .values(values as never)
        .run();
      return { changes: result.changes };
    },
    update(id: string | number, values: Record<string, unknown>) {
      const idValue = ["users", "crew-members", "flights"].includes(resource)
        ? String(id)
        : Number(id);
      if (
        resource === "users" &&
        values.isActive === false &&
        isLastAdminUser(String(id))
      )
        throw new Error("LAST_ADMIN");
      if (
        resource === "roles" &&
        values.isActive === false &&
        isLastAdminRole(Number(id))
      )
        throw new Error("LAST_ADMIN_ROLE");
      const result = db
        .update(table)
        .set(values as never)
        .where(eq(table.id, idValue as never))
        .run();
      return { changes: result.changes };
    },
    deactivate(id: string | number) {
      const idValue = ["users", "crew-members", "flights"].includes(resource)
        ? String(id)
        : Number(id);
      if (resource === "users" && isLastAdminUser(String(id)))
        throw new Error("LAST_ADMIN");
      if (resource === "roles" && isLastAdminRole(Number(id)))
        throw new Error("LAST_ADMIN_ROLE");
      const result = db
        .update(table)
        .set({ isActive: false } as never)
        .where(eq(table.id, idValue as never))
        .run();
      return { changes: result.changes };
    },
  };
}

function activeAdminCount() {
  return (
    db
      .select({ value: count() })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(
        and(
          eq(users.isActive, true),
          eq(roles.code, "ADMIN"),
          eq(roles.isActive, true),
        ),
      )
      .get()?.value ?? 0
  );
}
function isLastAdminUser(id: string) {
  const target = db
    .select({ id: users.id })
    .from(users)
    .innerJoin(userRoles, eq(userRoles.userId, users.id))
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(
      and(
        eq(users.id, id),
        eq(users.isActive, true),
        eq(roles.code, "ADMIN"),
        eq(roles.isActive, true),
      ),
    )
    .get();
  return Boolean(target) && activeAdminCount() <= 1;
}
function isLastAdminRole(id: number) {
  const target = db
    .select({ code: roles.code })
    .from(roles)
    .where(eq(roles.id, id))
    .get();
  return target?.code === "ADMIN" && activeAdminCount() <= 1;
}

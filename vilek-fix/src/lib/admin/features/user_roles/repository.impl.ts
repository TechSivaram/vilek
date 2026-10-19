import "server-only";
import { db } from "@/lib/db";
import { userRoles, users, roles } from "@/lib/db/schema";
import { and, count, eq } from "drizzle-orm";
export const userRolesRepository = {
  list() {
    const assignments = db
      .select({
        id: userRoles.id,
        userId: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        roleId: roles.id,
        roleCode: roles.code,
        roleName: roles.name,
        createdAt: userRoles.createdAt,
      })
      .from(userRoles)
      .innerJoin(users, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .all();
    const people = db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(eq(users.isActive, true))
      .all();
    const availableRoles = db
      .select({ id: roles.id, code: roles.code, name: roles.name })
      .from(roles)
      .where(eq(roles.isActive, true))
      .all();
    return {
      rows: assignments,
      options: { users: people, roles: availableRoles },
    };
  },
  create(userId: string, roleId: number) {
    return db.insert(userRoles).values({ userId, roleId }).run();
  },
  remove(id: number) {
    const assignment = db
      .select({
        userId: userRoles.userId,
        roleCode: roles.code,
        userActive: users.isActive,
      })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .innerJoin(users, eq(users.id, userRoles.userId))
      .where(eq(userRoles.id, id))
      .get();
    if (!assignment) return { status: "missing" as const };
    if (assignment.roleCode === "ADMIN" && assignment.userActive) {
      const admins =
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
          .get()?.value ?? 0;
      if (admins <= 1) return { status: "last-admin" as const };
    }
    const result = db.delete(userRoles).where(eq(userRoles.id, id)).run();
    return result.changes
      ? { status: "ok" as const }
      : { status: "missing" as const };
  },
};

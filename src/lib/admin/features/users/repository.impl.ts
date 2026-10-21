import "server-only";
import { db } from "@/lib/db";
import { and, count, like, or, asc, desc, eq, sql } from "drizzle-orm";
import { users, roles, userRoles } from "@/lib/db/schema";
import type { UsersListQuery } from "./dto";
export const usersRepository = {
  async list(input: UsersListQuery) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 10));
    const q = (input.search ?? "").trim();
    const where = q
      ? or(
          like(users.email, `%${q.replace(/[\\%_]/g, "\\$&")}%`),
          like(users.firstName, `%${q.replace(/[\\%_]/g, "\\$&")}%`),
          like(users.lastName, `%${q.replace(/[\\%_]/g, "\\$&")}%`),
          like(users.oidcSubject, `%${q.replace(/[\\%_]/g, "\\$&")}%`),
        )
      : undefined;
    const total = db.select({ value: count() }).from(users).where(where).get()?.value ?? 0;
    const sortColumns = {
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      isActive: users.isActive,
      updatedAt: users.updatedAt,
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
    const query = db.select().from(users).where(where);
    const rows = (ordering ? query.orderBy(ordering) : query)
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .all();
    return { rows, total };
  },
  async findByEmail(email: string) {
    return db
      .select({
        id: users.id,
        email: users.email,
        oidcSubject: users.oidcSubject,
      })
      .from(users)
      .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
      .get();
  },
  async findById(id: string) {
    return db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        oidcSubject: users.oidcSubject,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, id))
      .get();
  },
  importFromScim(values: {
    email: string;
    firstName: string;
    lastName: string;
    scimId: string;
    isActive: boolean;
  }) {
    const existing = db
      .select({
        id: users.id,
        email: users.email,
        oidcSubject: users.oidcSubject,
      })
      .from(users)
      .where(sql`lower(${users.email}) = ${values.email.toLowerCase()}`)
      .get();

    if (existing) return { created: false, user: existing };

    // ViLek uses oidc_subject as its only identity identifier column. Store the
    // provider ID verbatim; never add a synthetic scim-pending: prefix.
    const id = crypto.randomUUID();
    const identitySubject = values.scimId;
    try {
      db.insert(users)
        .values({
          id,
          oidcSubject: identitySubject,
          email: values.email.toLowerCase(),
          firstName: values.firstName,
          lastName: values.lastName,
          isActive: values.isActive,
          updatedAt: new Date().toISOString(),
        })
        .run();
      return {
        created: true,
        user: {
          id,
          email: values.email.toLowerCase(),
          oidcSubject: identitySubject,
        },
      };
    } catch (error) {
      // Be idempotent if the same email was added between the lookup and insert.
      const raced = db
        .select({
          id: users.id,
          email: users.email,
          oidcSubject: users.oidcSubject,
        })
        .from(users)
        .where(sql`lower(${users.email}) = ${values.email.toLowerCase()}`)
        .get();
      if (raced) return { created: false, user: raced };
      throw error;
    }
  },
  createProvisionedUser(values: {
    email: string;
    firstName: string;
    lastName: string;
    scimId: string;
  }) {
    const id = crypto.randomUUID();
    db.insert(users)
      .values({
        id,
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        oidcSubject: values.scimId,
        isActive: true,
      })
      .run();
    return {
      id,
      email: values.email,
      firstName: values.firstName,
      lastName: values.lastName,
      oidcSubject: values.scimId,
      isActive: true,
    };
  },
  syncIdentities(): {
    id: string;
    email: string;
    oidcSubject: string | null;
  }[] {
    return db
      .select({
        id: users.id,
        email: users.email,
        oidcSubject: users.oidcSubject,
      })
      .from(users)
      .all();
  },
  relinkIdentity(userId: string, subject: string) {
    return db
      .update(users)
      .set({ oidcSubject: subject, updatedAt: new Date().toISOString() })
      .where(eq(users.id, userId))
      .run();
  },
  create(values: Record<string, unknown>) {
    const result = db
      .insert(users)
      .values(values as never)
      .run();
    return { changes: result.changes };
  },
  update(id: string | number, values: Record<string, unknown>) {
    if (values.isActive === false && isLastAdminUser(String(id))) throw new Error("LAST_ADMIN");
    const result = db
      .update(users)
      .set(values as never)
      .where(eq(users.id, String(id)))
      .run();
    return { changes: result.changes };
  },
  deactivate(id: string | number) {
    if (isLastAdminUser(String(id))) throw new Error("LAST_ADMIN");
    const result = db
      .update(users)
      .set({ isActive: false })
      .where(eq(users.id, String(id)))
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

import "server-only";
import { db } from "@/lib/db";
import { resourceConfigs } from "@/lib/admin/resources";
import { count, like, or, asc, desc, eq, sql } from "drizzle-orm";
import { users } from "@/lib/db/schema";
import { makeCrudRepository } from "../repository-crud";
import type { UsersListQuery } from "./dto";
const config = resourceConfigs["users"];
const table = config.table as any;
const crud = makeCrudRepository("users");
export const usersRepository = {
  async list(input: UsersListQuery) {
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
        id: table.id,
        email: table.email,
        oidcSubject: table.oidcSubject,
      })
      .from(table)
      .all() as { id: string; email: string; oidcSubject: string }[];
  },
  relinkIdentity(userId: string, subject: string) {
    return db
      .update(table)
      .set({ oidcSubject: subject, updatedAt: new Date().toISOString() })
      .where(eq(table.id, userId))
      .run();
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

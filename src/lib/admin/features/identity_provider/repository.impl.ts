import "server-only";
import { db } from "@/lib/db";
import { count, like, or, asc, desc } from "drizzle-orm";
import { users } from "@/lib/db/schema";
import type { IdentityProviderListQuery } from "./dto";

export const identity_providerRepository = {
  async list(input: IdentityProviderListQuery) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 10));
    const q = (input.search ?? "").trim();
    const escapedQuery = q.replace(/[\\%_]/g, "\\$&");
    const where = q
      ? or(
          like(users.email, `%${escapedQuery}%`),
          like(users.firstName, `%${escapedQuery}%`),
          like(users.lastName, `%${escapedQuery}%`),
          like(users.oidcSubject, `%${escapedQuery}%`),
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
    const query = db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        oidcSubject: users.oidcSubject,
        isActive: users.isActive,
      })
      .from(users)
      .where(where);
    const rows = (ordering ? query.orderBy(ordering) : query)
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .all();
    return { rows, total };
  },
};

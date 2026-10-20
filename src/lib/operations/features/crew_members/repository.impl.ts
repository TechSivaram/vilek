import "server-only";
import { db } from "@/lib/db";
import { crewMembers, users } from "@/lib/db/schema";
import { count, like, or, asc, desc, eq, sql } from "drizzle-orm";
import { makeCrudRepository } from "../repository-crud";
import type { CrewMembersListQuery } from "./dto";

const crud = makeCrudRepository("crew-members");

export const crew_membersRepository = {
  async list(input: CrewMembersListQuery) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 10));
    const q = (input.search ?? "").trim();
    const where = q
      ? or(
          like(crewMembers.badgeNumber, `%${q}%`),
          like(users.firstName, `%${q}%`),
          like(users.lastName, `%${q}%`),
          like(users.email, `%${q}%`),
          like(sql`(${users.firstName} || ' ' || ${users.lastName})`, `%${q}%`),
        )
      : undefined;

    // Projection: return only the fields used by the table and edit form.
    // IDs remain available for internal edits, but the UI displays the name.
    const total =
      db
        .select({ value: count() })
        .from(crewMembers)
        .innerJoin(users, eq(crewMembers.userId, users.id))
        .where(where)
        .get()?.value ?? 0;

    const sortKey = input.sort ?? "badgeNumber";
    const sortColumns: Record<string, any> = {
      badgeNumber: crewMembers.badgeNumber,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      isActive: crewMembers.isActive,
    };
    const sortColumn = sortColumns[sortKey] ?? crewMembers.badgeNumber;
    const ordering =
      input.direction === "desc" ? desc(sortColumn) : asc(sortColumn);
    const rows = db
      .select({
        id: crewMembers.id,
        userId: crewMembers.userId,
        badgeNumber: crewMembers.badgeNumber,
        isActive: crewMembers.isActive,
        firstName: users.firstName,
        lastName: users.lastName,
        userName: sql<string>`trim(${users.firstName} || ' ' || ${users.lastName})`,
        email: users.email,
      })
      .from(crewMembers)
      .innerJoin(users, eq(crewMembers.userId, users.id))
      .where(where)
      .orderBy(ordering)
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
  options() {
    return {
      users: db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(users)
        .where(eq(users.isActive, true))
        .orderBy(asc(users.lastName), asc(users.firstName))
        .all(),
    };
  },
};

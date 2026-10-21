import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { crewDesignations, crewMemberDesignations, crewMembers, users } from "@/lib/db/schema";
import type { ResourceRepository } from "./repository";

export const repository: ResourceRepository = {
  listRows() {
    return db
      .select({
        id: crewMemberDesignations.id,
        crew_member_id: crewMemberDesignations.crewMemberId,
        designation_id: crewMemberDesignations.designationId,
        valid_from: crewMemberDesignations.validFrom,
        valid_until: crewMemberDesignations.validUntil,
        is_active: crewMemberDesignations.isActive,
        created_at: crewMemberDesignations.createdAt,
        updated_at: crewMemberDesignations.updatedAt,
        badge_number: crewMembers.badgeNumber,
        first_name: users.firstName,
        last_name: users.lastName,
        designation_name: crewDesignations.name,
      })
      .from(crewMemberDesignations)
      .leftJoin(crewMembers, eq(crewMemberDesignations.crewMemberId, crewMembers.id))
      .leftJoin(users, eq(crewMembers.userId, users.id))
      .leftJoin(crewDesignations, eq(crewMemberDesignations.designationId, crewDesignations.id))
      .orderBy(desc(crewMemberDesignations.id))
      .limit(500)
      .all()
      .map((row) => ({
        ...row,
        crew_display:
          `${[row.first_name, row.last_name].filter(Boolean).join(" ")}${row.badge_number ? ` (${row.badge_number})` : ""}`.trim(),
      }));
  },
  getOptions(field: string) {
    if (field === "crew_member_id") {
      return db
        .select({
          value: crewMembers.id,
          badge_number: crewMembers.badgeNumber,
          first_name: users.firstName,
          last_name: users.lastName,
        })
        .from(crewMembers)
        .leftJoin(users, eq(crewMembers.userId, users.id))
        .orderBy(asc(users.lastName), asc(users.firstName))
        .all()
        .map((row) => ({
          value: row.value,
          label:
            `${[row.first_name, row.last_name].filter(Boolean).join(" ")}${row.badge_number ? ` (${row.badge_number})` : ""}`.trim(),
        }));
    }
    if (field === "designation_id")
      return db
        .select({ value: crewDesignations.id, label: crewDesignations.name })
        .from(crewDesignations)
        .orderBy(asc(crewDesignations.name))
        .all();
    return [];
  },
  create(input) {
    const row = db
      .insert(crewMemberDesignations)
      .values({
        crewMemberId: String(input.crew_member_id),
        designationId: Number(input.designation_id),
        validFrom:
          input.valid_from == null || input.valid_from === "" ? null : String(input.valid_from),
        validUntil:
          input.valid_until == null || input.valid_until === "" ? null : String(input.valid_until),
        isActive: input.is_active === undefined ? true : Boolean(input.is_active),
      })
      .returning({ id: crewMemberDesignations.id })
      .get();
    return { id: String(row.id) };
  },
  update(id, input) {
    const values: Partial<typeof crewMemberDesignations.$inferInsert> = {};
    if (input.crew_member_id !== undefined) values.crewMemberId = String(input.crew_member_id);
    if (input.designation_id !== undefined) values.designationId = Number(input.designation_id);
    if (input.valid_from !== undefined)
      values.validFrom =
        input.valid_from == null || input.valid_from === "" ? null : String(input.valid_from);
    if (input.valid_until !== undefined)
      values.validUntil =
        input.valid_until == null || input.valid_until === "" ? null : String(input.valid_until);
    if (input.is_active !== undefined) values.isActive = Boolean(input.is_active);
    if (!Object.keys(values).length)
      return (
        db
          .select({ id: crewMemberDesignations.id })
          .from(crewMemberDesignations)
          .where(eq(crewMemberDesignations.id, Number(id)))
          .get() !== undefined
      );
    values.updatedAt = new Date().toISOString();
    return (
      db
        .update(crewMemberDesignations)
        .set(values)
        .where(eq(crewMemberDesignations.id, Number(id)))
        .returning({ id: crewMemberDesignations.id })
        .all().length > 0
    );
  },
};

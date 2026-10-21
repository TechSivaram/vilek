import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  crewMembers,
  crewQualifications,
  qualificationTypes,
  users,
} from "@/lib/db/schema";
import type {
  CrewQualificationsCreateDto,
  CrewQualificationsUpdateDto,
} from "./dto";
import type { CrewQualificationsRepository as Repository } from "./repository";

export const CrewQualificationsRepositoryImpl: Repository = {
  listRows() {
    return db
      .select({
        id: crewQualifications.id,
        crew_member_id: crewQualifications.crewMemberId,
        qualification_type_id: crewQualifications.qualificationTypeId,
        valid_from: crewQualifications.validFrom,
        valid_until: crewQualifications.validUntil,
        status: crewQualifications.status,
        replaced_by_id: crewQualifications.replacedById,
        notes: crewQualifications.notes,
        created_at: crewQualifications.createdAt,
        updated_at: crewQualifications.updatedAt,
        badge_number: crewMembers.badgeNumber,
        first_name: users.firstName,
        last_name: users.lastName,
        qualification_name: qualificationTypes.name,
      })
      .from(crewQualifications)
      .leftJoin(
        crewMembers,
        eq(crewQualifications.crewMemberId, crewMembers.id),
      )
      .leftJoin(users, eq(crewMembers.userId, users.id))
      .leftJoin(
        qualificationTypes,
        eq(crewQualifications.qualificationTypeId, qualificationTypes.id),
      )
      .orderBy(desc(crewQualifications.createdAt), desc(crewQualifications.id))
      .limit(500)
      .all()
      .map((row) => ({
        ...row,
        crew_display:
          `${[row.first_name, row.last_name].filter(Boolean).join(" ")}${row.badge_number ? ` (${row.badge_number})` : ""}`.trim(),
      }));
  },
  getOptions(field) {
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
    if (field === "qualification_type_id")
      return db
        .select({
          value: qualificationTypes.id,
          label: qualificationTypes.name,
        })
        .from(qualificationTypes)
        .where(eq(qualificationTypes.isActive, true))
        .orderBy(asc(qualificationTypes.name))
        .all();
    if (field === "replaced_by_id") {
      return db
        .select({
          value: crewQualifications.id,
          valid_from: crewQualifications.validFrom,
          first_name: users.firstName,
          last_name: users.lastName,
          qualification_name: qualificationTypes.name,
        })
        .from(crewQualifications)
        .leftJoin(
          crewMembers,
          eq(crewQualifications.crewMemberId, crewMembers.id),
        )
        .leftJoin(users, eq(crewMembers.userId, users.id))
        .leftJoin(
          qualificationTypes,
          eq(crewQualifications.qualificationTypeId, qualificationTypes.id),
        )
        .orderBy(
          asc(users.lastName),
          asc(users.firstName),
          asc(qualificationTypes.name),
        )
        .all()
        .map((row) => ({
          value: row.value,
          label: `${[row.first_name, row.last_name].filter(Boolean).join(" ")} — ${row.qualification_name ?? "Qualification"} (${row.valid_from})`,
        }));
    }
    return [];
  },
  create(input: CrewQualificationsCreateDto) {
    const row = db
      .insert(crewQualifications)
      .values({
        crewMemberId: String(input.crew_member_id),
        qualificationTypeId: input.qualification_type_id,
        validFrom: input.valid_from,
        validUntil: input.valid_until ?? null,
        status: input.status,
        replacedById:
          input.replaced_by_id == null ? null : String(input.replaced_by_id),
        notes: input.notes ?? null,
      })
      .returning({ id: crewQualifications.id })
      .get();
    return String(row.id);
  },
  update(id: string, input: CrewQualificationsUpdateDto) {
    const values: Partial<typeof crewQualifications.$inferInsert> = {};
    if (input.crew_member_id !== undefined)
      values.crewMemberId = String(input.crew_member_id);
    if (input.qualification_type_id !== undefined)
      values.qualificationTypeId = input.qualification_type_id;
    if (input.valid_from !== undefined) values.validFrom = input.valid_from;
    if (input.valid_until !== undefined) values.validUntil = input.valid_until;
    if (input.status !== undefined) values.status = input.status;
    if (input.replaced_by_id !== undefined)
      values.replacedById =
        input.replaced_by_id == null ? null : String(input.replaced_by_id);
    if (input.notes !== undefined) values.notes = input.notes;
    if (!Object.keys(values).length)
      return (
        db
          .select({ id: crewQualifications.id })
          .from(crewQualifications)
          .where(eq(crewQualifications.id, id))
          .get() !== undefined
      );
    values.updatedAt = new Date().toISOString();
    return (
      db
        .update(crewQualifications)
        .set(values)
        .where(eq(crewQualifications.id, id))
        .returning({ id: crewQualifications.id })
        .all().length > 0
    );
  },
};

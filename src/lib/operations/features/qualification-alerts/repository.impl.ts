import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  crewMembers,
  crewQualifications,
  qualificationAlerts,
  qualificationTypes,
  users,
} from "@/lib/db/schema";
import type { QualificationAlertsCreateDto, QualificationAlertsUpdateDto } from "./dto";
import type { QualificationAlertsRepository as Repository } from "./repository";

export const QualificationAlertsRepositoryImpl: Repository = {
  listRows() {
    return db
      .select({
        id: qualificationAlerts.id,
        crew_qualification_id: qualificationAlerts.crewQualificationId,
        alert_interval_days: qualificationAlerts.alertIntervalDays,
        due_at: qualificationAlerts.dueAt,
        state: qualificationAlerts.state,
        generated_at: qualificationAlerts.generatedAt,
        resolved_at: qualificationAlerts.resolvedAt,
        created_at: qualificationAlerts.createdAt,
        first_name: users.firstName,
        last_name: users.lastName,
        qualification_name: qualificationTypes.name,
        qualification_expiry: crewQualifications.validUntil,
      })
      .from(qualificationAlerts)
      .leftJoin(
        crewQualifications,
        eq(qualificationAlerts.crewQualificationId, crewQualifications.id),
      )
      .leftJoin(crewMembers, eq(crewQualifications.crewMemberId, crewMembers.id))
      .leftJoin(users, eq(crewMembers.userId, users.id))
      .leftJoin(
        qualificationTypes,
        eq(crewQualifications.qualificationTypeId, qualificationTypes.id),
      )
      .orderBy(asc(qualificationAlerts.dueAt), asc(qualificationAlerts.id))
      .limit(500)
      .all()
      .map((row) => ({
        ...row,
        crew_name: [row.first_name, row.last_name].filter(Boolean).join(" "),
      }));
  },
  getOptions(field) {
    if (field !== "crew_qualification_id") return [];
    return db
      .select({
        value: crewQualifications.id,
        valid_from: crewQualifications.validFrom,
        first_name: users.firstName,
        last_name: users.lastName,
        qualification_name: qualificationTypes.name,
      })
      .from(crewQualifications)
      .leftJoin(crewMembers, eq(crewQualifications.crewMemberId, crewMembers.id))
      .leftJoin(users, eq(crewMembers.userId, users.id))
      .leftJoin(
        qualificationTypes,
        eq(crewQualifications.qualificationTypeId, qualificationTypes.id),
      )
      .orderBy(asc(users.lastName), asc(users.firstName), asc(qualificationTypes.name))
      .all()
      .map((row) => ({
        value: row.value,
        label: `${[row.first_name, row.last_name].filter(Boolean).join(" ")} — ${row.qualification_name ?? "Qualification"} (${row.valid_from})`,
      }));
  },
  create(input: QualificationAlertsCreateDto) {
    const row = db
      .insert(qualificationAlerts)
      .values({
        crewQualificationId: String(input.crew_qualification_id),
        alertIntervalDays: input.alert_interval_days,
        dueAt: input.due_at ?? "",
        state: input.state == null ? "PENDING" : String(input.state),
        generatedAt: input.generated_at ?? null,
        resolvedAt: input.resolved_at ?? null,
      })
      .returning({ id: qualificationAlerts.id })
      .get();
    return String(row.id);
  },
  update(id: string, input: QualificationAlertsUpdateDto) {
    const values: Partial<typeof qualificationAlerts.$inferInsert> = {};
    if (input.crew_qualification_id !== undefined)
      values.crewQualificationId = String(input.crew_qualification_id);
    if (input.alert_interval_days !== undefined)
      values.alertIntervalDays = input.alert_interval_days;
    if (input.due_at !== undefined) values.dueAt = input.due_at ?? "";
    if (input.state !== undefined)
      values.state = input.state == null ? "PENDING" : String(input.state);
    if (input.generated_at !== undefined) values.generatedAt = input.generated_at;
    if (input.resolved_at !== undefined) values.resolvedAt = input.resolved_at;
    if (!Object.keys(values).length)
      return (
        db
          .select({ id: qualificationAlerts.id })
          .from(qualificationAlerts)
          .where(eq(qualificationAlerts.id, id))
          .get() !== undefined
      );
    values.updatedAt = new Date().toISOString();
    return (
      db
        .update(qualificationAlerts)
        .set(values)
        .where(eq(qualificationAlerts.id, id))
        .returning({ id: qualificationAlerts.id })
        .all().length > 0
    );
  },
};

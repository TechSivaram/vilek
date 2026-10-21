import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  crewDesignations,
  designationQualificationRequirements,
  qualificationTypes,
} from "@/lib/db/schema";
import type {
  DesignationQualificationRequirementsCreateDto,
  DesignationQualificationRequirementsUpdateDto,
} from "./dto";
import type { DesignationQualificationRequirementsRepository } from "./repository";

export const DesignationQualificationRequirementsResourceConfig = {
  label: "Designation qualification requirements",
  writable: true,
  required: ["designation_id", "qualification_type_id"],
  columns: ["designation_id", "qualification_type_id", "is_required"],
} as const;

export class DesignationQualificationRequirementsRepositoryImpl implements DesignationQualificationRequirementsRepository {
  listWithMetadata() {
    const rows = db
      .select({
        id: designationQualificationRequirements.id,
        designation_id: designationQualificationRequirements.designationId,
        qualification_type_id: designationQualificationRequirements.qualificationTypeId,
        is_required: designationQualificationRequirements.isRequired,
        created_at: designationQualificationRequirements.createdAt,
        designation_name: crewDesignations.name,
        qualification_name: qualificationTypes.name,
      })
      .from(designationQualificationRequirements)
      .leftJoin(
        crewDesignations,
        eq(designationQualificationRequirements.designationId, crewDesignations.id),
      )
      .leftJoin(
        qualificationTypes,
        eq(designationQualificationRequirements.qualificationTypeId, qualificationTypes.id),
      )
      .orderBy(
        asc(crewDesignations.name),
        asc(qualificationTypes.name),
        asc(designationQualificationRequirements.id),
      )
      .limit(500)
      .all()
      .map((row) => ({
        ...row,
        requirement_type: row.is_required ? "Required" : "Optional",
      }));
    return {
      rows,
      options: {},
      displayColumns: [
        "id",
        "designation_name",
        "qualification_name",
        "requirement_type",
        "created_at",
      ],
    };
  }

  create(input: DesignationQualificationRequirementsCreateDto): string {
    const created = db
      .insert(designationQualificationRequirements)
      .values({
        designationId: input.designation_id,
        qualificationTypeId: input.qualification_type_id,
        isRequired: input.is_required === undefined ? true : Boolean(input.is_required),
      })
      .returning({ id: designationQualificationRequirements.id })
      .get();
    return String(created.id);
  }

  update(id: string, input: DesignationQualificationRequirementsUpdateDto): boolean {
    const values: Partial<typeof designationQualificationRequirements.$inferInsert> = {};
    if (input.designation_id !== undefined) values.designationId = input.designation_id;
    if (input.qualification_type_id !== undefined)
      values.qualificationTypeId = input.qualification_type_id;
    if (input.is_required !== undefined) values.isRequired = Boolean(input.is_required);
    if (!Object.keys(values).length)
      return (
        db
          .select({ id: designationQualificationRequirements.id })
          .from(designationQualificationRequirements)
          .where(eq(designationQualificationRequirements.id, Number(id)))
          .get() !== undefined
      );
    return (
      db
        .update(designationQualificationRequirements)
        .set(values)
        .where(eq(designationQualificationRequirements.id, Number(id)))
        .returning({ id: designationQualificationRequirements.id })
        .all().length > 0
    );
  }
}

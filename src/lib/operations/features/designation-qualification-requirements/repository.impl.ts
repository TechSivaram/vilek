import "server-only";
import { SqliteMaintenanceResourceRepository } from "@/lib/operations/maintenance-resource.repository";
import type { MaintenanceResourceConfig } from "@/lib/operations/maintenance-resource.repository";
import type {
  DesignationQualificationRequirementsCreateDto,
  DesignationQualificationRequirementsUpdateDto,
} from "./dto";
import type { DesignationQualificationRequirementsRepository } from "./repository";

export const DesignationQualificationRequirementsResourceConfig = {
  table: "Designation_Qualification_Requirement",
  label: "Designation qualification requirements",
  id: "id",
  writable: true,
  required: ["designation_id", "qualification_type_id"],
  columns: ["designation_id", "qualification_type_id", "is_required"],
} as const satisfies MaintenanceResourceConfig;

const persistence = new SqliteMaintenanceResourceRepository();

/** Feature repository adapter. SQL and persistence concerns remain behind this boundary. */
export class SqliteDesignationQualificationRequirementsRepository implements DesignationQualificationRequirementsRepository {
  listWithMetadata() {
    return persistence.list(
      "designation-qualification-requirements",
      DesignationQualificationRequirementsResourceConfig,
    );
  }
  create(input: DesignationQualificationRequirementsCreateDto): string {
    return persistence.create(
      DesignationQualificationRequirementsResourceConfig,
      input as Record<string, unknown>,
    );
  }
  update(
    id: string,
    input: DesignationQualificationRequirementsUpdateDto,
  ): boolean {
    return persistence.update(
      DesignationQualificationRequirementsResourceConfig,
      id,
      input as Record<string, unknown>,
    );
  }
}

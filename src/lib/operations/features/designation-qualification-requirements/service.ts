import "server-only";
import type {
  DesignationQualificationRequirementsCreateDto,
  DesignationQualificationRequirementsUpdateDto,
  DesignationQualificationRequirementsResponseDto,
  DesignationQualificationRequirementsCollectionResponseDto,
} from "./dto";
import {
  DesignationQualificationRequirementsResourceConfig,
  SqliteDesignationQualificationRequirementsRepository,
} from "./repository.impl";

const repository = new SqliteDesignationQualificationRequirementsRepository();

function mapRow(
  value: unknown,
): DesignationQualificationRequirementsResponseDto {
  const row =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    id: Number(row.id),
    designation_id: Number(row.designation_id),
    qualification_type_id: Number(row.qualification_type_id),
    is_required: Number(row.is_required),
    created_at: row.created_at == null ? null : String(row.created_at),
    designation_name:
      row.designation_name == null ? null : String(row.designation_name),
    qualification_name:
      row.qualification_name == null ? null : String(row.qualification_name),
    requirement_type:
      row.requirement_type == null ? null : String(row.requirement_type),
  };
}

export const designationQualificationRequirementsService = {
  config: DesignationQualificationRequirementsResourceConfig,
  list(): DesignationQualificationRequirementsCollectionResponseDto {
    const result = repository.listWithMetadata();
    return {
      resource: "designation-qualification-requirements",
      label: DesignationQualificationRequirementsResourceConfig.label,
      writable: DesignationQualificationRequirementsResourceConfig.writable,
      columns: DesignationQualificationRequirementsResourceConfig.columns,
      displayColumns:
        result.displayColumns ??
        DesignationQualificationRequirementsResourceConfig.columns.slice(),
      rows: result.rows.map(mapRow),
      options: result.options,
    };
  },
  create(input: DesignationQualificationRequirementsCreateDto): string {
    return repository.create(input);
  },
  update(
    id: string,
    input: DesignationQualificationRequirementsUpdateDto,
  ): boolean {
    return repository.update(id, input);
  },
};

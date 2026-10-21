import type {
  DesignationQualificationRequirementsCreateDto,
  DesignationQualificationRequirementsUpdateDto,
  DesignationQualificationRequirementsResponseDto,
} from "./dto";

export interface DesignationQualificationRequirementsRepository {
  listWithMetadata(): {
    rows: unknown[];
    options: Record<string, { value: string | number; label: string }[]>;
    displayColumns?: string[];
  };
  create(input: DesignationQualificationRequirementsCreateDto): string;
  update(
    id: string,
    input: DesignationQualificationRequirementsUpdateDto,
  ): boolean;
}

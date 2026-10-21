/** Request and response contracts for Designation qualification requirements. */
export type DesignationQualificationRequirementsCreateDto = {
  designation_id: number;
  qualification_type_id: number;
  is_required?: number;
};
export type DesignationQualificationRequirementsUpdateDto = Partial<{
  designation_id: number;
  qualification_type_id: number;
  is_required: number;
}>;
export type DesignationQualificationRequirementsResponseDto = {
  id: number | string;
  designation_id: number;
  qualification_type_id: number;
  is_required: number;
  created_at: string | null;
  designation_name: string | null;
  qualification_name: string | null;
  requirement_type: string | null;
};
export type DesignationQualificationRequirementsCollectionResponseDto = {
  resource: "designation-qualification-requirements";
  label: string;
  writable: boolean;
  columns: readonly string[];
  displayColumns: string[];
  rows: DesignationQualificationRequirementsResponseDto[];
  options: Record<string, { value: string | number; label: string }[]>;
};
export type DesignationQualificationRequirementsMutationResponseDto = {
  ok: true;
  id?: string;
};

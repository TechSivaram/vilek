/** Stable response contract for crew qualification records. */
export type CrewQualificationsCreateDto = {
  crew_member_id: number;
  qualification_type_id: number;
  valid_from: string;
  valid_until?: string | null;
  status: string;
  replaced_by_id?: number | null;
  notes?: string | null;
};
export type CrewQualificationsUpdateDto = Partial<CrewQualificationsCreateDto>;
export type CrewQualificationsResponseDto = {
  id: number | string;
  crew_member_id: number | string;
  qualification_type_id: number | string;
  valid_from: string | null;
  valid_until: string | null;
  status: string | null;
  replaced_by_id: number | string | null;
  notes: string | null;
  crew_name?: string | null;
  qualification_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

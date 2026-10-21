/** Stable response contract for qualification alert rows. */
export type QualificationAlertsCreateDto = {
  crew_qualification_id: number;
  alert_interval_days: number;
  due_at: string | null;
  state?: string | number | boolean | null;
  generated_at?: string | null;
  resolved_at?: string | null;
};
export type QualificationAlertsUpdateDto =
  Partial<QualificationAlertsCreateDto>;
export type QualificationAlertsResponseDto = {
  id: number | string;
  crew_qualification_id: number | string;
  alert_interval_days: number;
  due_at: string | null;
  state: string | null;
  generated_at: string | null;
  resolved_at: string | null;
  crew_name?: string | null;
  qualification_name?: string | null;
  created_at?: string | null;
};

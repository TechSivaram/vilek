/** Read-only collection response contract for Crew batch requests. */
export type BatchRequestsRowDto = {
  id: number | string;
  state: string | null;
  requested_by_user_id: number | string | null;
  created_at: string | null;
  completed_at: string | null;
  requested_by_email: string | null;
};
export type BatchRequestsCollectionResponseDto = {
  resource: "batch-requests";
  label: string;
  writable: false;
  columns: readonly string[];
  displayColumns: string[];
  rows: BatchRequestsRowDto[];
  options: Record<string, { value: string | number; label: string }[]>;
};

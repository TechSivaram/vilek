/** Read-only collection response contract for Audit retention actions. */
export type AuditRetentionActionsRowDto = {
  id: number | string;
  action: string | null;
  cutoff_at: string | null;
  affected_count: number | null;
  actor_user_id: number | string | null;
  created_at: string | null;
  actor_email: string | null;
};
export type AuditRetentionActionsCollectionResponseDto = {
  resource: "audit-retention-actions";
  label: string;
  writable: false;
  columns: readonly string[];
  displayColumns: string[];
  rows: AuditRetentionActionsRowDto[];
  options: Record<string, { value: string | number; label: string }[]>;
};

/** Read-only collection response contract for Audit export history. */
export type AuditExportsRowDto = {
  id: number | string;
  actor_user_id: number | string | null;
  format: string | null;
  row_count: number | null;
  created_at: string | null;
  actor_email: string | null;
};
export type AuditExportsCollectionResponseDto = {
  resource: "audit-exports";
  label: string;
  writable: false;
  columns: readonly string[];
  displayColumns: string[];
  rows: AuditExportsRowDto[];
  options: Record<string, { value: string | number; label: string }[]>;
};

/** Request and response contracts for Audit retention policy. */
export type AuditRetentionPolicyCreateDto = {
  id: number;
  retention_days: number;
};
export type AuditRetentionPolicyUpdateDto = Partial<{
  id: number;
  retention_days: number;
}>;
export type AuditRetentionPolicyResponseDto = {
  id: number | string;
  retention_days: number | null;
  updated_at: string | null;
  retention_label: string | null;
};
export type AuditRetentionPolicyCollectionResponseDto = {
  resource: "audit-retention-policy";
  label: string;
  writable: boolean;
  columns: readonly string[];
  displayColumns: string[];
  rows: AuditRetentionPolicyResponseDto[];
  options: Record<string, { value: string | number; label: string }[]>;
};
export type AuditRetentionPolicyMutationResponseDto = { ok: true; id?: string };

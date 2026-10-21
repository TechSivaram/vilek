import "server-only";
import type {
  AuditRetentionActionsRowDto,
  AuditRetentionActionsCollectionResponseDto,
} from "./dto";
import {
  AuditRetentionActionsResourceConfig,
  AuditRetentionActionsRepositoryImpl,
} from "./repository.impl";

const repository = new AuditRetentionActionsRepositoryImpl();

function mapRow(value: unknown): AuditRetentionActionsRowDto {
  const r = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    id: String(r.id ?? ""),
    action: r.action == null ? null : String(r.action),
    cutoff_at: r.cutoff_at == null ? null : String(r.cutoff_at),
    affected_count: r.affected_count == null ? null : Number(r.affected_count),
    actor_user_id: r.actor_user_id == null ? null : String(r.actor_user_id),
    created_at: r.created_at == null ? null : String(r.created_at),
    actor_email: r.actor_email == null ? null : String(r.actor_email),
  };
}

export const auditretentionactionsService = {
  list(): AuditRetentionActionsCollectionResponseDto {
    const result = repository.list();
    return {
      resource: "audit-retention-actions",
      label: AuditRetentionActionsResourceConfig.label,
      writable: false,
      columns: AuditRetentionActionsResourceConfig.columns,
      displayColumns: result.displayColumns ?? [],
      rows: result.rows.map(mapRow),
      options: result.options,
    };
  },
};

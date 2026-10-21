import "server-only";
import type {
  AuditExportsRowDto,
  AuditExportsCollectionResponseDto,
} from "./dto";
import {
  AuditExportsResourceConfig,
  SqliteAuditExportsRepositoryImpl,
} from "./repository.impl";

const repository = new SqliteAuditExportsRepositoryImpl();

function mapRow(value: unknown): AuditExportsRowDto {
  const r =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    id: Number(r.id),
    actor_user_id: r.actor_user_id == null ? null : Number(r.actor_user_id),
    format: r.format == null ? null : String(r.format),
    row_count: r.row_count == null ? null : Number(r.row_count),
    created_at: r.created_at == null ? null : String(r.created_at),
    actor_email: r.actor_email == null ? null : String(r.actor_email),
  };
}

export const auditexportsService = {
  list(): AuditExportsCollectionResponseDto {
    const result = repository.list();
    return {
      resource: "audit-exports",
      label: AuditExportsResourceConfig.label,
      writable: false,
      columns: AuditExportsResourceConfig.columns,
      displayColumns: result.displayColumns ?? [],
      rows: result.rows.map(mapRow),
      options: result.options,
    };
  },
};

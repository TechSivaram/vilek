import "server-only";
import type {
  AuditRetentionPolicyCreateDto,
  AuditRetentionPolicyUpdateDto,
  AuditRetentionPolicyResponseDto,
  AuditRetentionPolicyCollectionResponseDto,
} from "./dto";
import {
  AuditRetentionPolicyResourceConfig,
  AuditRetentionPolicyRepositoryImpl,
} from "./repository.impl";

const repository = new AuditRetentionPolicyRepositoryImpl();

function mapRow(value: unknown): AuditRetentionPolicyResponseDto {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    id: Number(row.id),
    retention_days: row.retention_days == null ? null : Number(row.retention_days),
    updated_at: row.updated_at == null ? null : String(row.updated_at),
    retention_label: row.retention_label == null ? null : String(row.retention_label),
  };
}

export const auditRetentionPolicyService = {
  config: AuditRetentionPolicyResourceConfig,
  list(): AuditRetentionPolicyCollectionResponseDto {
    const result = repository.listWithMetadata();
    return {
      resource: "audit-retention-policy",
      label: AuditRetentionPolicyResourceConfig.label,
      writable: AuditRetentionPolicyResourceConfig.writable,
      columns: AuditRetentionPolicyResourceConfig.columns,
      displayColumns: result.displayColumns ?? AuditRetentionPolicyResourceConfig.columns.slice(),
      rows: result.rows.map(mapRow),
      options: result.options,
    };
  },
  create(input: AuditRetentionPolicyCreateDto): string {
    return repository.create(input);
  },
  update(id: string, input: AuditRetentionPolicyUpdateDto): boolean {
    return repository.update(id, input);
  },
};

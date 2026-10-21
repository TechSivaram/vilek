import "server-only";
import { SqliteMaintenanceResourceRepository } from "@/lib/operations/maintenance-resource.repository";
import type { MaintenanceResourceConfig } from "@/lib/operations/maintenance-resource.repository";
import type {
  AuditRetentionPolicyCreateDto,
  AuditRetentionPolicyUpdateDto,
} from "./dto";
import type { AuditRetentionPolicyRepository } from "./repository";

export const AuditRetentionPolicyResourceConfig = {
  table: "Audit_Retention_Policy",
  label: "Audit retention policy",
  id: "id",
  writable: true,
  required: ["id"],
  columns: ["id", "retention_days"],
} as const satisfies MaintenanceResourceConfig;

const persistence = new SqliteMaintenanceResourceRepository();

/** Feature repository adapter. SQL and persistence concerns remain behind this boundary. */
export class SqliteAuditRetentionPolicyRepository implements AuditRetentionPolicyRepository {
  listWithMetadata() {
    return persistence.list(
      "audit-retention-policy",
      AuditRetentionPolicyResourceConfig,
    );
  }
  create(input: AuditRetentionPolicyCreateDto): string {
    return persistence.create(
      AuditRetentionPolicyResourceConfig,
      input as Record<string, unknown>,
    );
  }
  update(id: string, input: AuditRetentionPolicyUpdateDto): boolean {
    return persistence.update(
      AuditRetentionPolicyResourceConfig,
      id,
      input as Record<string, unknown>,
    );
  }
}

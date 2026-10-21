import "server-only";
import { SqliteMaintenanceResourceRepository } from "@/lib/operations/maintenance-resource.repository";
import type { MaintenanceResourceConfig } from "@/lib/operations/maintenance-resource.repository";
import type { AuditRetentionActionsRepository } from "./repository";

const config = {
  table: "Audit_Retention_Action",
  label: "Audit retention actions",
  id: "id",
  writable: false,
  required: [],
  columns: [],
} as const satisfies MaintenanceResourceConfig;

const persistence = new SqliteMaintenanceResourceRepository();

export class SqliteAuditRetentionActionsRepositoryImpl implements AuditRetentionActionsRepository {
  list() {
    return persistence.list("audit-retention-actions", config);
  }
}
export const AuditRetentionActionsResourceConfig = config;

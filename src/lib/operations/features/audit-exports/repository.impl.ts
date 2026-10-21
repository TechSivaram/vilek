import "server-only";
import { SqliteMaintenanceResourceRepository } from "@/lib/operations/maintenance-resource.repository";
import type { MaintenanceResourceConfig } from "@/lib/operations/maintenance-resource.repository";
import type { AuditExportsRepository } from "./repository";

const config = {
  table: "Audit_Export_Event",
  label: "Audit export history",
  id: "id",
  writable: false,
  required: [],
  columns: [],
} as const satisfies MaintenanceResourceConfig;

const persistence = new SqliteMaintenanceResourceRepository();

export class SqliteAuditExportsRepositoryImpl implements AuditExportsRepository {
  list() {
    return persistence.list("audit-exports", config);
  }
}
export const AuditExportsResourceConfig = config;

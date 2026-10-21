import "server-only";
import { SqliteMaintenanceResourceRepository } from "@/lib/operations/maintenance-resource.repository";
import type { MaintenanceResourceConfig } from "@/lib/operations/maintenance-resource.repository";
import type { BatchRequestsRepository } from "./repository";

const config = {
  table: "Flight_Crew_Batch_Request",
  label: "Crew batch requests",
  id: "id",
  writable: false,
  required: [],
  columns: [],
} as const satisfies MaintenanceResourceConfig;

const persistence = new SqliteMaintenanceResourceRepository();

export class SqliteBatchRequestsRepositoryImpl implements BatchRequestsRepository {
  list() {
    return persistence.list("batch-requests", config);
  }
}
export const BatchRequestsResourceConfig = config;

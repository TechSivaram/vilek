import "server-only";
import { SqliteMaintenanceResourceRepository } from "@/lib/operations/maintenance-resource.repository";
import type { MaintenanceResourceConfig } from "@/lib/operations/maintenance-resource.repository";
import type { FlightCrewAuditRepository } from "./repository";

const config = {
  table: "Flight_Crew_Audit_Event",
  label: "Flight crew assignment audit",
  id: "id",
  writable: false,
  required: [],
  columns: [],
} as const satisfies MaintenanceResourceConfig;

const persistence = new SqliteMaintenanceResourceRepository();

export class SqliteFlightCrewAuditRepositoryImpl implements FlightCrewAuditRepository {
  list() {
    return persistence.list("flight-crew-audit", config);
  }
}
export const FlightCrewAuditResourceConfig = config;

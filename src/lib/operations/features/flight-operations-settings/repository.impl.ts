import "server-only";
import { SqliteMaintenanceResourceRepository } from "@/lib/operations/maintenance-resource.repository";
import type { MaintenanceResourceConfig } from "@/lib/operations/maintenance-resource.repository";
import type {
  FlightOperationsSettingsCreateDto,
  FlightOperationsSettingsUpdateDto,
} from "./dto";
import type { FlightOperationsSettingsRepository } from "./repository";

export const FlightOperationsSettingsResourceConfig = {
  table: "Flight_Operations_Setting",
  label: "Flight Operations settings",
  id: "id",
  writable: true,
  required: ["setting_key", "value_json"],
  columns: ["setting_key", "value_json", "description"],
} as const satisfies MaintenanceResourceConfig;

const persistence = new SqliteMaintenanceResourceRepository();

/** Feature repository adapter. SQL and persistence concerns remain behind this boundary. */
export class SqliteFlightOperationsSettingsRepository implements FlightOperationsSettingsRepository {
  listWithMetadata() {
    return persistence.list(
      "flight-operations-settings",
      FlightOperationsSettingsResourceConfig,
    );
  }
  create(input: FlightOperationsSettingsCreateDto): string {
    return persistence.create(
      FlightOperationsSettingsResourceConfig,
      input as Record<string, unknown>,
    );
  }
  update(id: string, input: FlightOperationsSettingsUpdateDto): boolean {
    return persistence.update(
      FlightOperationsSettingsResourceConfig,
      id,
      input as Record<string, unknown>,
    );
  }
}

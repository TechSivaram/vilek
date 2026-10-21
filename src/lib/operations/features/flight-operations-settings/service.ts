import "server-only";
import type {
  FlightOperationsSettingsCreateDto,
  FlightOperationsSettingsUpdateDto,
  FlightOperationsSettingsResponseDto,
  FlightOperationsSettingsCollectionResponseDto,
} from "./dto";
import {
  FlightOperationsSettingsResourceConfig,
  SqliteFlightOperationsSettingsRepository,
} from "./repository.impl";

const repository = new SqliteFlightOperationsSettingsRepository();

function mapRow(value: unknown): FlightOperationsSettingsResponseDto {
  const row =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    id: Number(row.id),
    setting_key: String(row.setting_key ?? ""),
    value_json: String(row.value_json ?? ""),
    description: row.description == null ? null : String(row.description),
    updated_at: row.updated_at == null ? null : String(row.updated_at),
    setting: String(row.setting ?? row.setting_key ?? ""),
    setting_description:
      row.setting_description == null ? null : String(row.setting_description),
  };
}

export const flightOperationsSettingsService = {
  config: FlightOperationsSettingsResourceConfig,
  list(): FlightOperationsSettingsCollectionResponseDto {
    const result = repository.listWithMetadata();
    return {
      resource: "flight-operations-settings",
      label: FlightOperationsSettingsResourceConfig.label,
      writable: FlightOperationsSettingsResourceConfig.writable,
      columns: FlightOperationsSettingsResourceConfig.columns,
      displayColumns:
        result.displayColumns ??
        FlightOperationsSettingsResourceConfig.columns.slice(),
      rows: result.rows.map(mapRow),
      options: result.options,
    };
  },
  create(input: FlightOperationsSettingsCreateDto): string {
    return repository.create(input);
  },
  update(id: string, input: FlightOperationsSettingsUpdateDto): boolean {
    return repository.update(id, input);
  },
};

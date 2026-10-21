import "server-only";
import {
  maintenanceRepository,
  type MaintenanceOption,
} from "@/lib/operations/maintenance-repository";

type SqlValue = string | number | bigint | null | Uint8Array;
export const maintenanceService = {
  list<T = Record<string, unknown>>(sql: string, params: SqlValue[] = []): T[] {
    return maintenanceRepository.queryAll<T>(sql, params);
  },
  options(sql: string): MaintenanceOption[] {
    return maintenanceRepository.queryAll<MaintenanceOption>(sql);
  },
  create(table: string, input: Record<string, unknown>) {
    return maintenanceRepository.insert(table, input);
  },
  update(
    table: string,
    idColumn: string,
    id: string | number,
    input: Record<string, unknown>,
  ) {
    return maintenanceRepository.update(table, idColumn, id, input);
  },
};

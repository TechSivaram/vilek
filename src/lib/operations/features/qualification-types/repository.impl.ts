import "server-only";
import {
  maintenanceRepository,
  type MaintenanceOption,
} from "@/lib/operations/maintenance-repository";
import type { ResourceRepository } from "./repository";
const optionQueries: Record<string, string> = {};
const table = "Qualification_Type";
export const repository: ResourceRepository = {
  listRows() {
    return maintenanceRepository.queryAll<Record<string, unknown>>(
      "SELECT q.id, q.code, q.name AS qualification_name, q.name, q.expiry_required, q.is_active, q.created_at, q.updated_at, CASE q.expiry_required WHEN 1 THEN 'Expiry required' ELSE 'No expiry' END AS expiry_policy, CASE q.is_active WHEN 1 THEN 'Active' ELSE 'Inactive' END AS status_label FROM Qualification_Type q ORDER BY q.name LIMIT 500",
    );
  },
  getOptions(field: string): MaintenanceOption[] {
    const sql = optionQueries[field];
    return sql ? maintenanceRepository.queryAll<MaintenanceOption>(sql) : [];
  },
  create(input) {
    return maintenanceRepository.insert(table, input);
  },
  update(id, input) {
    return maintenanceRepository.update(table, "id", id, input);
  },
};

import "server-only";
import {
  maintenanceRepository,
  type MaintenanceOption,
} from "@/lib/operations/maintenance-repository";
import type { ResourceRepository } from "./repository";
const optionQueries: Record<string, string> = {
  crew_member_id:
    "SELECT cm.id AS value, trim(coalesce(u.first_name,'') || ' ' || coalesce(u.last_name,'')) || CASE WHEN cm.badge_number IS NOT NULL AND cm.badge_number <> '' THEN ' (' || cm.badge_number || ')' ELSE '' END AS label FROM Crew_Member cm LEFT JOIN User u ON u.id=cm.user_id ORDER BY label",
  designation_id:
    "SELECT id AS value, name AS label FROM Crew_Designation ORDER BY name",
};
const table = "Crew_Member_Designation";
export const repository: ResourceRepository = {
  listRows() {
    return maintenanceRepository.queryAll<Record<string, unknown>>(
      "SELECT c.id, c.crew_member_id, c.designation_id, c.valid_from, c.valid_until, c.is_active, c.created_at, c.updated_at, trim(coalesce(u.first_name,'') || ' ' || coalesce(u.last_name,'')) || CASE WHEN cm.badge_number IS NOT NULL AND cm.badge_number <> '' THEN ' (' || cm.badge_number || ')' ELSE '' END AS crew_display, d.name AS designation_name FROM Crew_Member_Designation c LEFT JOIN Crew_Member cm ON cm.id=c.crew_member_id LEFT JOIN User u ON u.id=cm.user_id LEFT JOIN Crew_Designation d ON d.id=c.designation_id ORDER BY c.id DESC LIMIT 500",
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

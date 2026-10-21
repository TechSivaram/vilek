import "server-only";
import {
  maintenanceRepository,
  type MaintenanceOption,
} from "@/lib/operations/maintenance-repository";
import type {
  CrewQualificationsCreateDto,
  CrewQualificationsUpdateDto,
} from "./dto";
import type { CrewQualificationsRepository as Repository } from "./repository";

const optionQueries: Record<string, string> = {
  crew_member_id:
    "SELECT cm.id AS value, trim(coalesce(u.first_name,'') || ' ' || coalesce(u.last_name,'')) || CASE WHEN cm.badge_number IS NOT NULL AND cm.badge_number <> '' THEN ' (' || cm.badge_number || ')' ELSE '' END AS label FROM Crew_Member cm LEFT JOIN User u ON u.id=cm.user_id ORDER BY label",
  qualification_type_id:
    "SELECT id AS value, name AS label FROM Qualification_Type WHERE is_active=1 ORDER BY name",
  replaced_by_id:
    "SELECT q.id AS value, trim(coalesce(u.first_name,'') || ' ' || coalesce(u.last_name,'')) || ' — ' || qt.name || ' (' || q.valid_from || ')' AS label FROM Crew_Qualification q LEFT JOIN Crew_Member cm ON cm.id=q.crew_member_id LEFT JOIN User u ON u.id=cm.user_id LEFT JOIN Qualification_Type qt ON qt.id=q.qualification_type_id ORDER BY label",
};

export const CrewQualificationsRepositoryImpl: Repository = {
  listRows() {
    return maintenanceRepository.queryAll<Record<string, unknown>>(
      `SELECT q.id, q.crew_member_id, q.qualification_type_id, q.valid_from, q.valid_until, q.status, q.replaced_by_id, q.notes, q.created_at, trim(coalesce(u.first_name,'') || ' ' || coalesce(u.last_name,'')) || CASE WHEN cm.badge_number IS NOT NULL AND cm.badge_number <> '' THEN ' (' || cm.badge_number || ')' ELSE '' END AS crew_display, qt.name AS qualification_name FROM Crew_Qualification q LEFT JOIN Crew_Member cm ON cm.id=q.crew_member_id LEFT JOIN User u ON u.id=cm.user_id LEFT JOIN Qualification_Type qt ON qt.id=q.qualification_type_id ORDER BY q.created_at DESC LIMIT 500`,
    );
  },
  getOptions(field: string): MaintenanceOption[] {
    const query = optionQueries[field];
    return query
      ? maintenanceRepository.queryAll<MaintenanceOption>(query)
      : [];
  },
  create(input: CrewQualificationsCreateDto): string {
    return maintenanceRepository.insert(
      "Crew_Qualification",
      input as Record<string, unknown>,
    ).id;
  },
  update(id: string, input: CrewQualificationsUpdateDto): boolean {
    return maintenanceRepository.update(
      "Crew_Qualification",
      "id",
      id,
      input as Record<string, unknown>,
    );
  },
};

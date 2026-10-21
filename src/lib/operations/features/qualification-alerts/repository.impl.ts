import "server-only";
import {
  maintenanceRepository,
  type MaintenanceOption,
} from "@/lib/operations/maintenance-repository";
import type {
  QualificationAlertsCreateDto,
  QualificationAlertsUpdateDto,
} from "./dto";
import type { QualificationAlertsRepository as Repository } from "./repository";

const optionQueries: Record<string, string> = {
  crew_qualification_id:
    "SELECT q.id AS value, trim(coalesce(u.first_name,'') || ' ' || coalesce(u.last_name,'')) || ' — ' || qt.name || ' (' || q.valid_from || ')' AS label FROM Crew_Qualification q LEFT JOIN Crew_Member cm ON cm.id=q.crew_member_id LEFT JOIN User u ON u.id=cm.user_id LEFT JOIN Qualification_Type qt ON qt.id=q.qualification_type_id ORDER BY label",
};

export const QualificationAlertsRepositoryImpl: Repository = {
  listRows() {
    return maintenanceRepository.queryAll<Record<string, unknown>>(
      `SELECT a.id, a.crew_qualification_id, a.alert_interval_days, a.due_at, a.state, a.generated_at, a.resolved_at, trim(coalesce(u.first_name,'') || ' ' || coalesce(u.last_name,'')) AS crew_name, qt.name AS qualification_name, q.valid_until AS qualification_expiry FROM Qualification_Alert a LEFT JOIN Crew_Qualification q ON q.id=a.crew_qualification_id LEFT JOIN Crew_Member cm ON cm.id=q.crew_member_id LEFT JOIN User u ON u.id=cm.user_id LEFT JOIN Qualification_Type qt ON qt.id=q.qualification_type_id ORDER BY a.due_at LIMIT 500`,
    );
  },
  getOptions(field: string): MaintenanceOption[] {
    const query = optionQueries[field];
    return query
      ? maintenanceRepository.queryAll<MaintenanceOption>(query)
      : [];
  },
  create(input: QualificationAlertsCreateDto): string {
    return maintenanceRepository.insert(
      "Qualification_Alert",
      input as Record<string, unknown>,
    ).id;
  },
  update(id: string, input: QualificationAlertsUpdateDto): boolean {
    return maintenanceRepository.update(
      "Qualification_Alert",
      "id",
      id,
      input as Record<string, unknown>,
    );
  },
};

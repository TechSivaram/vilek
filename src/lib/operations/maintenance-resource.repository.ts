import { getMaintenanceDb } from "@/lib/operations/maintenance";

export interface MaintenanceResourceConfig {
  table: string;
  label: string;
  id: string;
  writable: boolean;
  required: readonly string[];
  columns: readonly string[];
}
export interface MaintenanceProjection {
  sql: string;
  displayColumns: string[];
}
export interface MaintenanceListResult {
  rows: unknown[];
  options: Record<string, { value: string | number; label: string }[]>;
  displayColumns?: string[];
}

const projections: Record<string, MaintenanceProjection> = {
  "audit-exports": {
    sql: `SELECT a.id, a.actor_user_id, a.format, a.row_count, a.created_at, u.email AS actor_email FROM Audit_Export_Event a LEFT JOIN User u ON u.id=a.actor_user_id ORDER BY a.created_at DESC LIMIT 500`,
    displayColumns: ["id", "actor_email", "format", "row_count", "created_at"],
  },
  "audit-retention-actions": {
    sql: `SELECT a.id, a.action, a.cutoff_at, a.affected_count, a.actor_user_id, a.created_at, u.email AS actor_email FROM Audit_Retention_Action a LEFT JOIN User u ON u.id=a.actor_user_id ORDER BY a.created_at DESC LIMIT 500`,
    displayColumns: [
      "id",
      "action",
      "cutoff_at",
      "affected_count",
      "actor_email",
      "created_at",
    ],
  },
  "audit-retention-policy": {
    sql: `SELECT p.id, p.retention_days, p.updated_at, CASE WHEN p.retention_days IS NULL THEN 'Keep indefinitely' ELSE CAST(p.retention_days AS TEXT) || ' days' END AS retention_label FROM Audit_Retention_Policy p ORDER BY p.id LIMIT 500`,
    displayColumns: ["id", "retention_label", "updated_at"],
  },
  "batch-requests": {
    sql: `SELECT b.id, b.state, b.requested_by_user_id, b.created_at, b.completed_at, u.email AS requested_by_email FROM Flight_Crew_Batch_Request b LEFT JOIN User u ON u.id=b.requested_by_user_id ORDER BY b.created_at DESC LIMIT 500`,
    displayColumns: [
      "id",
      "state",
      "requested_by_email",
      "created_at",
      "completed_at",
    ],
  },
  "designation-qualification-requirements": {
    sql: `SELECT r.id, r.designation_id, r.qualification_type_id, r.is_required, r.created_at, d.name AS designation_name, q.name AS qualification_name, CASE r.is_required WHEN 1 THEN 'Required' ELSE 'Optional' END AS requirement_type FROM Designation_Qualification_Requirement r LEFT JOIN Crew_Designation d ON d.id=r.designation_id LEFT JOIN Qualification_Type q ON q.id=r.qualification_type_id ORDER BY d.name,q.name LIMIT 500`,
    displayColumns: [
      "id",
      "designation_name",
      "qualification_name",
      "requirement_type",
      "created_at",
    ],
  },
  "flight-crew-audit": {
    sql: `SELECT a.id, a.flight_id, a.crew_member_id, a.designation_id, a.action, a.reason, a.actor_email_snapshot, a.created_at, coalesce(a.flight_number_snapshot,f.flight_number,'Unknown flight') AS flight_number, coalesce(a.crew_name_snapshot,trim(coalesce(u.first_name,'') || ' ' || coalesce(u.last_name,'')),'Unknown crew member') AS crew_name, coalesce(a.designation_snapshot,d.name,'Unknown designation') AS designation_name FROM Flight_Crew_Audit_Event a LEFT JOIN Flight f ON f.id=a.flight_id LEFT JOIN Crew_Member cm ON cm.id=a.crew_member_id LEFT JOIN User u ON u.id=cm.user_id LEFT JOIN Crew_Designation d ON d.id=a.designation_id ORDER BY a.created_at DESC LIMIT 500`,
    displayColumns: [
      "id",
      "flight_number",
      "crew_name",
      "designation_name",
      "action",
      "reason",
      "actor_email_snapshot",
      "created_at",
    ],
  },
  "flight-operations-settings": {
    sql: `SELECT s.id, s.setting_key, s.value_json, s.description, s.updated_at, s.setting_key AS setting, s.description AS setting_description FROM Flight_Operations_Setting s ORDER BY s.setting_key LIMIT 500`,
    displayColumns: [
      "id",
      "setting",
      "value_json",
      "setting_description",
      "updated_at",
    ],
  },
};

/** SQLite-only persistence boundary for Operations maintenance resources. */
export class SqliteMaintenanceResourceRepository {
  list(
    name: string,
    resource: MaintenanceResourceConfig,
  ): MaintenanceListResult {
    const db = getMaintenanceDb();
    try {
      const projection = projections[name];
      const rows = projection
        ? db.prepare(projection.sql).all()
        : db
            .prepare(
              `SELECT * FROM "${resource.table}" ORDER BY "${resource.id}" DESC LIMIT 500`,
            )
            .all();
      const options: MaintenanceListResult["options"] = {};
      return { rows, options, displayColumns: projection?.displayColumns };
    } finally {
      db.close();
    }
  }
  create(
    resource: MaintenanceResourceConfig,
    input: Record<string, unknown>,
  ): string {
    const db = getMaintenanceDb();
    try {
      const keys = Object.keys(input);
      if (!keys.length)
        throw new Error("Empty insert is not supported for this resource.");
      const cols = keys.map((key) => `"${key}"`).join(", ");
      const marks = keys.map(() => "?").join(", ");
      const values = keys.map((key) => (input[key] === "" ? null : input[key]));
      const result = db
        .prepare(`INSERT INTO "${resource.table}" (${cols}) VALUES (${marks})`)
        .run(...(values as (string | number | bigint | null)[]));
      return result.lastInsertRowid.toString();
    } finally {
      db.close();
    }
  }
  update(
    resource: MaintenanceResourceConfig,
    id: string,
    input: Record<string, unknown>,
  ): boolean {
    const db = getMaintenanceDb();
    try {
      const keys = Object.keys(input);
      if (!keys.length) return false;
      const set = keys.map((key) => `"${key}" = ?`).join(", ");
      const values = keys.map((key) => (input[key] === "" ? null : input[key]));
      const result = db
        .prepare(
          `UPDATE "${resource.table}" SET ${set}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE "${resource.id}" = ?`,
        )
        .run(...(values as (string | number | bigint | null)[]), id);
      return result.changes > 0;
    } finally {
      db.close();
    }
  }
}

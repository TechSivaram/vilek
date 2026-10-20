import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/** Allowlisted Flight Operations table maintenance. Audit/event tables are read-only. */
export const maintenanceResources = {
  "crew-designation-assignments": { table: "Crew_Member_Designation", label: "Crew designation assignments", id: "id", writable: true, required: ["crew_member_id", "designation_id"], columns: ["crew_member_id", "designation_id", "valid_from", "valid_until", "is_active"] },
  "qualification-types": { table: "Qualification_Type", label: "Qualification types", id: "id", writable: true, required: ["code", "name"], columns: ["code", "name", "expiry_required", "is_active"] },
  "crew-qualifications": { table: "Crew_Qualification", label: "Crew qualifications", id: "id", writable: true, required: ["crew_member_id", "qualification_type_id", "valid_from"], columns: ["crew_member_id", "qualification_type_id", "valid_from", "valid_until", "status", "replaced_by_id", "notes"] },
  "designation-qualification-requirements": { table: "Designation_Qualification_Requirement", label: "Designation qualification requirements", id: "id", writable: true, required: ["designation_id", "qualification_type_id"], columns: ["designation_id", "qualification_type_id", "is_required"] },
  "crew-complement-defaults": { table: "Flight_Crew_Complement_Default", label: "Default crew complement", id: "id", writable: true, required: ["designation_id", "required_count"], columns: ["designation_id", "required_count"] },
  "flight-crew-requirements": { table: "Flight_Crew_Requirement", label: "Flight-specific crew requirements", id: "id", writable: true, required: ["flight_id", "designation_id", "required_count"], columns: ["flight_id", "designation_id", "required_count", "reason"] },
  "flight-operations-settings": { table: "Flight_Operations_Setting", label: "Flight Operations settings", id: "id", writable: true, required: ["setting_key", "value_json"], columns: ["setting_key", "value_json", "description"] },
  "qualification-alerts": { table: "Qualification_Alert", label: "Qualification alerts", id: "id", writable: true, required: ["crew_qualification_id", "alert_interval_days", "due_at"], columns: ["crew_qualification_id", "alert_interval_days", "due_at", "state", "generated_at", "resolved_at"] },
  "audit-retention-policy": { table: "Audit_Retention_Policy", label: "Audit retention policy", id: "id", writable: true, required: ["id"], columns: ["id", "retention_days"] },
  "flight-crew-audit": { table: "Flight_Crew_Audit_Event", label: "Flight crew assignment audit (read-only)", id: "id", writable: false, columns: [] },
  "batch-requests": { table: "Flight_Crew_Batch_Request", label: "Crew batch requests (read-only operational log)", id: "id", writable: false, columns: [] },
  "audit-exports": { table: "Audit_Export_Event", label: "Audit export history (read-only)", id: "id", writable: false, columns: [] },
  "audit-retention-actions": { table: "Audit_Retention_Action", label: "Audit retention actions (read-only)", id: "id", writable: false, columns: [] },
} as const;
export type MaintenanceResource = keyof typeof maintenanceResources;
type ResourceConfig = { table: string; label: string; id: string; writable: boolean; required: readonly string[]; columns: readonly string[] };
export function maintenanceResourceConfig(name: string): ResourceConfig | null {
  return Object.prototype.hasOwnProperty.call(maintenanceResources, name) ? (maintenanceResources[name as MaintenanceResource] as ResourceConfig) : null;
}
export function getMaintenanceDb() {
  const configured = process.env.DATABASE_URL ?? "file:./data/vilek.db";
  if (!configured.startsWith("file:")) throw new Error("This build uses SQLite. Set DATABASE_URL=file:./data/vilek.db.");
  const filePath = configured.slice(5);
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const sqlite = new Database(absolutePath);
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

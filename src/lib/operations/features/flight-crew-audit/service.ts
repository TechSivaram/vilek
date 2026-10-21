import "server-only";
import type {
  FlightCrewAuditRowDto,
  FlightCrewAuditCollectionResponseDto,
} from "./dto";
import {
  FlightCrewAuditResourceConfig,
  FlightCrewAuditRepositoryImpl,
} from "./repository.impl";

const repository = new FlightCrewAuditRepositoryImpl();

function mapRow(value: unknown): FlightCrewAuditRowDto {
  const r =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    id: String(r.id ?? ""),
    flight_id: r.flight_id == null ? null : String(r.flight_id),
    crew_member_id: r.crew_member_id == null ? null : String(r.crew_member_id),
    designation_id: r.designation_id == null ? null : Number(r.designation_id),
    action: r.action == null ? null : String(r.action),
    reason: r.reason == null ? null : String(r.reason),
    actor_email_snapshot:
      r.actor_email_snapshot == null ? null : String(r.actor_email_snapshot),
    created_at: r.created_at == null ? null : String(r.created_at),
    flight_number: String(r.flight_number ?? "Unknown flight"),
    crew_name: String(r.crew_name ?? "Unknown crew member"),
    designation_name: String(r.designation_name ?? "Unknown designation"),
  };
}

export const flightcrewauditService = {
  list(): FlightCrewAuditCollectionResponseDto {
    const result = repository.list();
    return {
      resource: "flight-crew-audit",
      label: FlightCrewAuditResourceConfig.label,
      writable: false,
      columns: FlightCrewAuditResourceConfig.columns,
      displayColumns: result.displayColumns ?? [],
      rows: result.rows.map(mapRow),
      options: result.options,
    };
  },
};

import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  crewDesignations,
  flightCrewAuditEvents,
  flights,
  users,
  crewMembers,
} from "@/lib/db/schema";
import type { FlightCrewAuditRepository } from "./repository";

export const FlightCrewAuditResourceConfig = {
  label: "Flight crew assignment audit",
  columns: [] as string[],
} as const;

export class FlightCrewAuditRepositoryImpl implements FlightCrewAuditRepository {
  list() {
    const rows = db
      .select({
        id: flightCrewAuditEvents.id,
        flight_id: flightCrewAuditEvents.flightId,
        crew_member_id: flightCrewAuditEvents.crewMemberId,
        designation_id: flightCrewAuditEvents.designationId,
        action: flightCrewAuditEvents.action,
        reason: flightCrewAuditEvents.reason,
        actor_email_snapshot: flightCrewAuditEvents.actorEmailSnapshot,
        created_at: flightCrewAuditEvents.createdAt,
        flight_number_snapshot: flightCrewAuditEvents.flightNumberSnapshot,
        flight_number_current: flights.flightNumber,
        crew_name_snapshot: flightCrewAuditEvents.crewNameSnapshot,
        first_name: users.firstName,
        last_name: users.lastName,
        designation_snapshot: flightCrewAuditEvents.designationSnapshot,
        designation_name_current: crewDesignations.name,
      })
      .from(flightCrewAuditEvents)
      .leftJoin(flights, eq(flightCrewAuditEvents.flightId, flights.id))
      .leftJoin(
        crewMembers,
        eq(flightCrewAuditEvents.crewMemberId, crewMembers.id),
      )
      .leftJoin(users, eq(crewMembers.userId, users.id))
      .leftJoin(
        crewDesignations,
        eq(flightCrewAuditEvents.designationId, crewDesignations.id),
      )
      .orderBy(
        desc(flightCrewAuditEvents.createdAt),
        desc(flightCrewAuditEvents.id),
      )
      .limit(500)
      .all()
      .map((row) => ({
        id: row.id,
        flight_id: row.flight_id,
        crew_member_id: row.crew_member_id,
        designation_id: row.designation_id,
        action: row.action,
        reason: row.reason,
        actor_email_snapshot: row.actor_email_snapshot,
        created_at: row.created_at,
        flight_number:
          row.flight_number_snapshot ??
          row.flight_number_current ??
          "Unknown flight",
        crew_name:
          row.crew_name_snapshot ??
          ([row.first_name, row.last_name].filter(Boolean).join(" ") ||
            "Unknown crew member"),
        designation_name:
          row.designation_snapshot ??
          row.designation_name_current ??
          "Unknown designation",
      }));
    return {
      rows,
      options: {},
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
    };
  }
}

import "server-only";
import { maintenanceRepository } from "@/lib/operations/maintenance-repository";
import type {
  FlightCrewRequirementsCreateDto,
  FlightCrewRequirementsListResponseDto,
  FlightCrewListResponseDto,
} from "./dto";
import type { FlightCrewRequirementsRepository } from "./repository";

const flightOptionsSql = `SELECT f.id AS value, f.flight_number || ' — ' || coalesce(dep.iata_code,'?') || ' → ' || coalesce(arr.iata_code,'?') AS label FROM Flight f LEFT JOIN Airport dep ON dep.id=f.origin_airport_id LEFT JOIN Airport arr ON arr.id=f.destination_airport_id ORDER BY f.flight_number`;
const designationOptionsSql = `SELECT id AS value, name AS label FROM Crew_Designation ORDER BY name`;

export const flightCrewRequirementsRepository: FlightCrewRequirementsRepository =
  {
    list(flightId): FlightCrewRequirementsListResponseDto {
      const rows = maintenanceRepository.queryAll(
        `SELECT r.id, r.flight_id, r.designation_id, r.required_count, r.reason, r.created_at, f.flight_number, f.scheduled_departure, f.scheduled_arrival, a.name AS airline_name, coalesce(dep.iata_code,'?') || ' → ' || coalesce(arr.iata_code,'?') AS flight_route, d.name AS designation_name FROM Flight_Crew_Requirement r LEFT JOIN Flight f ON f.id=r.flight_id LEFT JOIN Airline a ON a.id=f.airline_id LEFT JOIN Airport dep ON dep.id=f.origin_airport_id LEFT JOIN Airport arr ON arr.id=f.destination_airport_id LEFT JOIN Crew_Designation d ON d.id=r.designation_id WHERE (? IS NULL OR r.flight_id = ?) ORDER BY d.name LIMIT 500`,
        [flightId, flightId],
      );
      return {
        rows,
        options: {
          flight_id: maintenanceRepository.queryAll(flightOptionsSql),
          designation_id: maintenanceRepository.queryAll(designationOptionsSql),
        },
      };
    },
    listFlights(search): FlightCrewListResponseDto {
      const where = search
        ? ` WHERE lower(coalesce(a.name,'') || ' ' || coalesce(f.flight_number,'') || ' ' || coalesce(dep.iata_code,'') || ' ' || coalesce(arr.iata_code,'')) LIKE ?`
        : "";
      const rows = maintenanceRepository.queryAll(
        `SELECT f.id AS flight_id, f.flight_number, f.scheduled_departure, f.scheduled_arrival, a.name AS airline_name, coalesce(dep.iata_code,'?') || ' → ' || coalesce(arr.iata_code,'?') AS flight_route, (SELECT COUNT(*) FROM Flight_Crew_Requirement r WHERE r.flight_id=f.id) AS requirement_count FROM Flight f LEFT JOIN Airline a ON a.id=f.airline_id LEFT JOIN Airport dep ON dep.id=f.origin_airport_id LEFT JOIN Airport arr ON arr.id=f.destination_airport_id${where} ORDER BY a.name, f.flight_number LIMIT 500`,
        search ? [`%${search.toLocaleLowerCase()}%`] : [],
      );
      return {
        rows,
        options: {
          flight_id: maintenanceRepository.queryAll(flightOptionsSql),
          designation_id: maintenanceRepository.queryAll(designationOptionsSql),
        },
      };
    },
    create(input: FlightCrewRequirementsCreateDto): string {
      return maintenanceRepository.insert("Flight_Crew_Requirement", input).id;
    },
    update(
      id: string,
      input: Partial<FlightCrewRequirementsCreateDto>,
    ): boolean {
      return maintenanceRepository.update(
        "Flight_Crew_Requirement",
        "id",
        id,
        input as Record<string, unknown>,
      );
    },
  };

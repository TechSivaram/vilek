import "server-only";
import { getMaintenanceDb } from "@/lib/operations/maintenance";
import { maintenanceRepository } from "@/lib/operations/maintenance-repository";
import type {
  CrewComplementDefaultsCreateDto,
  CrewComplementDefaultsUpdateDto,
  CrewComplementDefaultsResponseDto,
} from "./dto";
import type { CrewComplementDefaultsRepository } from "./repository";

/** SQLite persistence only; route handlers and services never issue SQL. */
export class SqliteCrewComplementDefaultsRepository implements CrewComplementDefaultsRepository {
  list() {
    const sqlite = getMaintenanceDb();
    try {
      const rows = sqlite
        .prepare(
          `SELECT c.id, c.designation_id, c.required_count, c.updated_at, d.name AS designation_name FROM Flight_Crew_Complement_Default c LEFT JOIN Crew_Designation d ON d.id=c.designation_id ORDER BY d.name LIMIT 500`,
        )
        .all() as CrewComplementDefaultsResponseDto[];
      const designations = sqlite
        .prepare(
          `SELECT id AS value, name AS label FROM Crew_Designation ORDER BY name`,
        )
        .all() as { value: string | number; label: string }[];
      return { rows, options: { designation_id: designations } };
    } finally {
      sqlite.close();
    }
  }
  create(input: CrewComplementDefaultsCreateDto): string {
    const sqlite = getMaintenanceDb();
    try {
      const result = sqlite
        .prepare(
          `INSERT INTO "Flight_Crew_Complement_Default" ("designation_id", "required_count") VALUES (?, ?)`,
        )
        .run(input.designation_id, input.required_count);
      return result.lastInsertRowid.toString();
    } finally {
      sqlite.close();
    }
  }
  update(id: string, input: CrewComplementDefaultsUpdateDto): boolean {
    return maintenanceRepository.update(
      "Flight_Crew_Complement_Default",
      "id",
      id,
      input as Record<string, unknown>,
    );
  }
}

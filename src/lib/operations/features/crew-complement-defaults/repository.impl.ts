import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  crewDesignations,
  flightCrewComplementDefaults,
} from "@/lib/db/schema";
import type {
  CrewComplementDefaultsCreateDto,
  CrewComplementDefaultsUpdateDto,
  CrewComplementDefaultsResponseDto,
} from "./dto";
import type { CrewComplementDefaultsRepository } from "./repository";

export class CrewComplementDefaultsRepositoryImpl implements CrewComplementDefaultsRepository {
  list() {
    const rows = db
      .select({
        id: flightCrewComplementDefaults.id,
        designation_id: flightCrewComplementDefaults.designationId,
        required_count: flightCrewComplementDefaults.requiredCount,
        updated_at: flightCrewComplementDefaults.updatedAt,
        designation_name: crewDesignations.name,
      })
      .from(flightCrewComplementDefaults)
      .leftJoin(
        crewDesignations,
        eq(flightCrewComplementDefaults.designationId, crewDesignations.id),
      )
      .orderBy(asc(crewDesignations.name), asc(flightCrewComplementDefaults.id))
      .limit(500)
      .all() as CrewComplementDefaultsResponseDto[];
    const designations = db
      .select({ value: crewDesignations.id, label: crewDesignations.name })
      .from(crewDesignations)
      .orderBy(asc(crewDesignations.name))
      .all();
    return { rows, options: { designation_id: designations } };
  }
  create(input: CrewComplementDefaultsCreateDto): string {
    const row = db
      .insert(flightCrewComplementDefaults)
      .values({
        designationId: input.designation_id,
        requiredCount: input.required_count,
      })
      .returning({ id: flightCrewComplementDefaults.id })
      .get();
    return String(row.id);
  }
  update(id: string, input: CrewComplementDefaultsUpdateDto): boolean {
    const values: Partial<typeof flightCrewComplementDefaults.$inferInsert> =
      {};
    if (input.designation_id !== undefined)
      values.designationId = input.designation_id;
    if (input.required_count !== undefined)
      values.requiredCount = input.required_count;
    if (!Object.keys(values).length)
      return (
        db
          .select({ id: flightCrewComplementDefaults.id })
          .from(flightCrewComplementDefaults)
          .where(eq(flightCrewComplementDefaults.id, Number(id)))
          .get() !== undefined
      );
    return (
      db
        .update(flightCrewComplementDefaults)
        .set({ ...values, updatedAt: new Date().toISOString() })
        .where(eq(flightCrewComplementDefaults.id, Number(id)))
        .returning({ id: flightCrewComplementDefaults.id })
        .all().length > 0
    );
  }
}

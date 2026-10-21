import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { flightOperationsSettings } from "@/lib/db/schema";
import type {
  FlightOperationsSettingsCreateDto,
  FlightOperationsSettingsUpdateDto,
} from "./dto";
import type { FlightOperationsSettingsRepository } from "./repository";

export const FlightOperationsSettingsResourceConfig = {
  label: "Flight Operations settings",
  writable: true,
  required: ["setting_key", "value_json"],
  columns: ["setting_key", "value_json", "description"],
} as const;

export class FlightOperationsSettingsRepositoryImpl implements FlightOperationsSettingsRepository {
  listWithMetadata() {
    const rows = db
      .select({
        id: flightOperationsSettings.id,
        setting_key: flightOperationsSettings.settingKey,
        value_json: flightOperationsSettings.valueJson,
        description: flightOperationsSettings.description,
        updated_at: flightOperationsSettings.updatedAt,
      })
      .from(flightOperationsSettings)
      .orderBy(
        asc(flightOperationsSettings.settingKey),
        asc(flightOperationsSettings.id),
      )
      .limit(500)
      .all()
      .map((row) => ({
        ...row,
        setting: row.setting_key,
        setting_description: row.description,
      }));
    return {
      rows,
      options: {},
      displayColumns: [
        "id",
        "setting",
        "value_json",
        "setting_description",
        "updated_at",
      ],
    };
  }

  create(input: FlightOperationsSettingsCreateDto): string {
    const created = db
      .insert(flightOperationsSettings)
      .values({
        settingKey: input.setting_key,
        valueJson: input.value_json,
        description: input.description ?? null,
      })
      .returning({ id: flightOperationsSettings.id })
      .get();
    return String(created.id);
  }

  update(id: string, input: FlightOperationsSettingsUpdateDto): boolean {
    const values: Partial<typeof flightOperationsSettings.$inferInsert> = {};
    if (input.setting_key !== undefined) values.settingKey = input.setting_key;
    if (input.value_json !== undefined) values.valueJson = input.value_json;
    if (input.description !== undefined) values.description = input.description;
    if (!Object.keys(values).length)
      return (
        db
          .select({ id: flightOperationsSettings.id })
          .from(flightOperationsSettings)
          .where(eq(flightOperationsSettings.id, Number(id)))
          .get() !== undefined
      );
    return (
      db
        .update(flightOperationsSettings)
        .set({ ...values, updatedAt: new Date().toISOString() })
        .where(eq(flightOperationsSettings.id, Number(id)))
        .returning({ id: flightOperationsSettings.id })
        .all().length > 0
    );
  }
}

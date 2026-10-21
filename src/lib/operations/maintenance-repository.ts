import "server-only";
import { getMaintenanceDb } from "@/lib/operations/maintenance";

type SqlValue = string | number | bigint | null | Uint8Array;
export type MaintenanceOption = { value: string | number; label: string };

/** All low-level SQLite access for legacy maintenance resources lives here. */
export const maintenanceRepository = {
  queryAll<T = Record<string, unknown>>(
    sql: string,
    params: SqlValue[] = [],
  ): T[] {
    const db = getMaintenanceDb();
    try {
      return db.prepare(sql).all(...params) as T[];
    } finally {
      db.close();
    }
  },

  insert(table: string, input: Record<string, unknown>): { id: string } {
    const db = getMaintenanceDb();
    try {
      const valuesByKey = { ...input };
      const keys = Object.keys(valuesByKey);
      if (keys.length === 0) throw new Error("Cannot insert an empty record.");
      const columns = keys.map((key) => `"${key}"`).join(", ");
      const placeholders = keys.map(() => "?").join(", ");
      const values = keys.map((key) =>
        valuesByKey[key] === "" ? null : valuesByKey[key],
      );
      const result = db
        .prepare(`INSERT INTO "${table}" (${columns}) VALUES (${placeholders})`)
        .run(...(values as SqlValue[]));
      return { id: String(result.lastInsertRowid) };
    } finally {
      db.close();
    }
  },

  update(
    table: string,
    idColumn: string,
    id: string | number,
    input: Record<string, unknown>,
  ): boolean {
    const db = getMaintenanceDb();
    try {
      const keys = Object.keys(input);
      if (keys.length === 0) {
        return Boolean(
          db
            .prepare(`SELECT 1 FROM "${table}" WHERE "${idColumn}" = ?`)
            .get(id),
        );
      }
      const set = keys.map((key) => `"${key}" = ?`).join(", ");
      const values = keys.map((key) => (input[key] === "" ? null : input[key]));
      const result = db
        .prepare(
          `UPDATE "${table}" SET ${set}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE "${idColumn}" = ?`,
        )
        .run(...(values as SqlValue[]), id);
      return result.changes > 0;
    } finally {
      db.close();
    }
  },
};

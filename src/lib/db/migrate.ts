import "dotenv/config";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { drizzle } from "drizzle-orm/better-sqlite3";

const configured = process.env.DATABASE_URL ?? "file:./data/vilek.db";
if (!configured.startsWith("file:"))
  throw new Error(
    "DATABASE_URL must use file:./path/to/database.db for SQLite.",
  );
const filePath = configured.slice(5);
const absolutePath = path.isAbsolute(filePath)
  ? filePath
  : path.resolve(process.cwd(), filePath);
fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

const sqlite = new Database(absolutePath);

try {
  // Migration 0001 rebuilds User. SQLite cannot change foreign_keys from inside
  // a transaction, so its PRAGMA foreign_keys=OFF statement alone is too late
  // when Drizzle wraps the migration in a transaction. Disable FK enforcement
  // before invoking the migrator, then validate the entire database afterward.
  sqlite.pragma("foreign_keys = OFF");

  migrate(drizzle(sqlite), {
    migrationsFolder: path.resolve(process.cwd(), "drizzle"),
  });

  // Re-enable enforcement and fail loudly if any migration left broken links.
  sqlite.pragma("foreign_keys = ON");
  const violations = sqlite.pragma("foreign_key_check") as Array<{
    table: string;
    rowid: number | null;
    parent: string;
    fkid: number;
  }>;
  if (violations.length > 0) {
    const details = violations
      .slice(0, 10)
      .map(
        (item) =>
          `${item.table} row ${item.rowid ?? "?"} -> ${item.parent} (fk ${item.fkid})`,
      )
      .join("; ");
    throw new Error(
      `Migration completed but SQLite foreign_key_check found ${violations.length} violation(s): ${details}`,
    );
  }

  console.log(`ViLek SQLite migrations applied: ${absolutePath}`);
} finally {
  // Ensure FK enforcement is restored even if a migration throws.
  if (sqlite.open) {
    sqlite.pragma("foreign_keys = ON");
    sqlite.close();
  }
}

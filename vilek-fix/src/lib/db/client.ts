import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

function resolveDatabasePath() {
  const configured = process.env.DATABASE_URL ?? "file:./data/vilek.db";
  if (configured.startsWith("file:")) {
    const filePath = configured.slice("file:".length);
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    return absolutePath;
  }
  // SQLite is the active adapter. Keep the setting explicit rather than silently
  // treating a future PostgreSQL URL as a local file path.
  throw new Error(
    "This build uses SQLite. Set DATABASE_URL=file:./data/vilek.db.",
  );
}

const globalForDb = globalThis as unknown as { sqlite?: Database.Database };
const sqlite = globalForDb.sqlite ?? new Database(resolveDatabasePath());
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("journal_mode = WAL");
if (process.env.NODE_ENV !== "production") globalForDb.sqlite = sqlite;

export const db = drizzle(sqlite, { schema });

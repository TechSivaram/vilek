import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export function getMaintenanceDb() {
  const configured = process.env.DATABASE_URL ?? "file:./data/vilek.db";
  if (!configured.startsWith("file:"))
    throw new Error(
      "This build uses SQLite. Set DATABASE_URL=file:./data/vilek.db.",
    );
  const filePath = configured.slice(5);
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const sqlite = new Database(absolutePath);
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

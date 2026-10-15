import "dotenv/config";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { drizzle } from "drizzle-orm/better-sqlite3";

const configured = process.env.DATABASE_URL ?? "file:./data/vilek.db";
if (!configured.startsWith("file:")) throw new Error("DATABASE_URL must use file:./path/to/database.db for SQLite.");
const filePath = configured.slice(5);
const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
const sqlite = new Database(absolutePath);
sqlite.pragma("foreign_keys = ON");
migrate(drizzle(sqlite), { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
sqlite.close();
console.log(`ViLek SQLite migrations applied: ${absolutePath}`);

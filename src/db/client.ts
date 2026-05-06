import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "@/db/schema";

const databasePath = resolveDatabasePath();
mkdirSync(path.dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
export { sqlite };

function resolveDatabasePath() {
  const configured = process.env.DATABASE_URL;

  if (configured?.startsWith("file:")) {
    return configured.slice("file:".length);
  }

  if (configured && configured !== ":memory:") {
    return configured;
  }

  return path.join(process.cwd(), "data", "privacyvault.sqlite");
}

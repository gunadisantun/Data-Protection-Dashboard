import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { executeRawSql, isOfflineDatabase } from "@/db/client";

let migrated = false;

export async function ensureOfflineMigrations() {
  if (!isOfflineDatabase || migrated) {
    return;
  }

  const migrationsDirectory = findMigrationsDirectory();
  if (!migrationsDirectory) {
    throw new Error("Offline database migrations not found.");
  }

  await executeRawSql(`
    create table if not exists "__privacyvault_migrations" (
      name text primary key,
      applied_at timestamp not null default now()
    )
  `);

  const migrationFiles = readdirSync(migrationsDirectory)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const exists = await hasMigration(file);
    if (exists) {
      continue;
    }

    const statements = readFileSync(path.join(migrationsDirectory, file), "utf8")
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      if (shouldSkipOfflineStatement(statement)) {
        continue;
      }

      await executeRawSql(statement);
    }

    await executeRawSql(
      `insert into "__privacyvault_migrations" (name) values ('${escapeSql(file)}')`,
    );
  }

  migrated = true;
}

function shouldSkipOfflineStatement(statement: string) {
  const normalized = statement.replace(/\s+/g, " ").toLowerCase();
  return normalized.startsWith('insert into "governance_settings"');
}

function findMigrationsDirectory() {
  const candidates = [
    path.join(process.cwd(), "drizzle"),
    path.join(process.cwd(), "..", "drizzle"),
    path.join(process.cwd(), "resources", "drizzle"),
  ];

  return candidates.find((candidate) => existsSync(candidate));
}

async function hasMigration(file: string) {
  try {
    const result = (await executeRawSql(
      `select name from "__privacyvault_migrations" where name = '${escapeSql(file)}'`,
    )) as { rows?: unknown[] }[] | { rows?: unknown[] };
    const rows = Array.isArray(result) ? result.flatMap((entry) => entry.rows ?? []) : (result.rows ?? []);
    return rows.length > 0;
  } catch {
    return false;
  }
}

function escapeSql(value: string) {
  return value.replace(/'/g, "''");
}

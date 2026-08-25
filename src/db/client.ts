import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { getOfflineDatabaseDir, isOfflineRuntime } from "@/lib/offline-runtime";

const connectionString = process.env.DATABASE_URL;
const offlineRuntime = isOfflineRuntime();

if (!offlineRuntime && !connectionString) {
  throw new Error(
    "DATABASE_URL is required. Add the Supabase pooled Postgres connection string to .env.local.",
  );
}

const globalForDb = globalThis as typeof globalThis & {
  privacyVaultSql?: postgres.Sql;
  privacyBroPglite?: PGlite;
};

export const queryClient =
  offlineRuntime
    ? (globalForDb.privacyBroPglite ?? new PGlite(ensureOfflineDatabaseDir()))
    : (globalForDb.privacyVaultSql ??
      postgres(connectionString!, {
        prepare: false,
        ssl: "require",
      }));

if (process.env.NODE_ENV !== "production") {
  if (offlineRuntime) {
    globalForDb.privacyBroPglite = queryClient as PGlite;
  } else {
    globalForDb.privacyVaultSql = queryClient as postgres.Sql;
  }
}

export const db = offlineRuntime
  ? drizzlePglite(queryClient as PGlite, { schema })
  : drizzlePostgres(queryClient as postgres.Sql, { schema });

export const isOfflineDatabase = offlineRuntime;

export async function executeRawSql(statement: string) {
  if (offlineRuntime) {
    return (queryClient as PGlite).exec(statement);
  }

  return (queryClient as postgres.Sql).unsafe(statement);
}

export async function closeQueryClient() {
  if (offlineRuntime) {
    await (queryClient as PGlite).close();
    return;
  }

  await (queryClient as postgres.Sql).end();
}

function ensureOfflineDatabaseDir() {
  const databaseDir = getOfflineDatabaseDir();
  mkdirSync(databaseDir, { recursive: true });
  return databaseDir;
}

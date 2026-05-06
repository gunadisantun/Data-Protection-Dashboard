import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is required. Add the Supabase pooled Postgres connection string to .env.local.",
  );
}

const globalForDb = globalThis as typeof globalThis & {
  privacyVaultSql?: postgres.Sql;
};

export const queryClient =
  globalForDb.privacyVaultSql ??
  postgres(connectionString, {
    prepare: false,
    ssl: "require",
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.privacyVaultSql = queryClient;
}

export const db = drizzle(queryClient, { schema });

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required for database migration.");
}

const sql = postgres(connectionString, {
  prepare: false,
  ssl: "require",
});

async function main() {
  const migrationsDirectory = path.join(process.cwd(), "drizzle");

  if (!existsSync(migrationsDirectory)) {
    throw new Error("No drizzle migration directory found. Run drizzle-kit generate first.");
  }

  await sql`
    create table if not exists "__privacyvault_migrations" (
      name text primary key,
      applied_at timestamp not null default now()
    )
  `;

  const migrationFiles = readdirSync(migrationsDirectory)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const [applied] = await sql`
      select name from "__privacyvault_migrations" where name = ${file}
    `;

    if (applied) {
      continue;
    }

    if (file.startsWith("0000_") && (await tableExists("departments"))) {
      await sql`
        insert into "__privacyvault_migrations" (name)
        values (${file})
        on conflict (name) do nothing
      `;
      console.log(`Marked existing baseline migration ${file}.`);
      continue;
    }

    const statements = readFileSync(path.join(migrationsDirectory, file), "utf8")
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);

    await sql.begin(async (transaction) => {
      for (const statement of statements) {
        await transaction.unsafe(statement);
      }

      await transaction`
        insert into "__privacyvault_migrations" (name) values (${file})
      `;
    });

    console.log(`Applied migration ${file}.`);
  }

  await sql.end();
}

async function tableExists(tableName: string) {
  const [row] = await sql`
    select to_regclass(${`public.${tableName}`}) as table_name
  `;

  return Boolean(row?.table_name);
}

main().catch(async (error) => {
  console.error(error);
  await sql.end({ timeout: 1 }).catch(() => {});
  process.exit(1);
});

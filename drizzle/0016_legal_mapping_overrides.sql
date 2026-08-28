CREATE TABLE IF NOT EXISTS "legal_mapping_overrides" (
  "id" text PRIMARY KEY NOT NULL,
  "entry_id" text NOT NULL,
  "patch" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" text NOT NULL,
  "updated_at" text NOT NULL,
  "updated_by" text,
  CONSTRAINT "legal_mapping_overrides_entry_id_unique" UNIQUE("entry_id"),
  CONSTRAINT "legal_mapping_overrides_updated_by_users_id_fk"
    FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id")
    ON DELETE SET NULL
);

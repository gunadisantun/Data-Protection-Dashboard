CREATE TABLE IF NOT EXISTS "privacy_map_overrides" (
  "id" text PRIMARY KEY NOT NULL,
  "jurisdiction_id" text NOT NULL,
  "patch" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" text NOT NULL,
  "updated_at" text NOT NULL,
  "updated_by" text,
  CONSTRAINT "privacy_map_overrides_jurisdiction_id_unique" UNIQUE("jurisdiction_id"),
  CONSTRAINT "privacy_map_overrides_updated_by_users_id_fk"
    FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id")
    ON DELETE SET NULL
);

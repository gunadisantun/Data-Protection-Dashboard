CREATE TABLE IF NOT EXISTS "demo_sessions" ("id" text PRIMARY KEY, "expires_at" text NOT NULL);
ALTER TABLE "self_assessments" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 0;
ALTER TABLE "self_assessments" ADD COLUMN IF NOT EXISTS "revision" integer NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS "self_assessment_revisions" (
  "id" text PRIMARY KEY,
  "assessment_id" text NOT NULL REFERENCES "self_assessments"("id") ON DELETE CASCADE,
  "revision" integer NOT NULL,
  "snapshot" jsonb NOT NULL,
  "pdf_base64" text NOT NULL,
  "finalized_at" text NOT NULL,
  UNIQUE ("assessment_id", "revision")
);
CREATE INDEX IF NOT EXISTS "self_assessments_unit_updated" ON "self_assessments" ("department_id", "updated_at");
CREATE INDEX IF NOT EXISTS "ropa_unit_created" ON "ropa_activities" ("department_id", "created_at");

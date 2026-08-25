CREATE TABLE IF NOT EXISTS "ai_impact_assessments" (
  "id" text PRIMARY KEY NOT NULL,
  "assessment_number" text NOT NULL UNIQUE,
  "primary_ropa_id" text REFERENCES "ropa_activities"("id") ON DELETE SET NULL,
  "related_ropa_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "related_dpia_id" text REFERENCES "assessments"("id") ON DELETE SET NULL,
  "related_lia_id" text REFERENCES "assessments"("id") ON DELETE SET NULL,
  "related_tia_id" text REFERENCES "assessments"("id") ON DELETE SET NULL,
  "department_id" text NOT NULL REFERENCES "departments"("id"),
  "status" text DEFAULT 'Draft' NOT NULL,
  "approval_status" text DEFAULT 'Not Started' NOT NULL,
  "owner_name" text DEFAULT '' NOT NULL,
  "ai_system" text NOT NULL,
  "business_owner" text DEFAULT '' NOT NULL,
  "intended_purpose" text DEFAULT '' NOT NULL,
  "provider_developer" text DEFAULT '' NOT NULL,
  "affected_persons" text DEFAULT '' NOT NULL,
  "jurisdictions" text DEFAULT '' NOT NULL,
  "intended_benefit" text DEFAULT '' NOT NULL,
  "foreseeable_misuse" text DEFAULT '' NOT NULL,
  "imported_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "provenance" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "impact_domains" jsonb NOT NULL,
  "fria_screening" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "fria_status" text DEFAULT 'FURTHER ASSESSMENT' NOT NULL,
  "fria_items" jsonb NOT NULL,
  "fria_completion" integer DEFAULT 0 NOT NULL,
  "data_protection" jsonb NOT NULL,
  "specialist_assessment" jsonb NOT NULL,
  "highest_residual_risk" text DEFAULT 'Incomplete' NOT NULL,
  "final_decision" text NOT NULL,
  "created_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" text NOT NULL,
  "updated_at" text NOT NULL
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_links" (
  "id" text PRIMARY KEY NOT NULL,
  "source_module" text NOT NULL,
  "source_id" text NOT NULL,
  "target_module" text NOT NULL,
  "target_id" text NOT NULL,
  "relation_type" text NOT NULL,
  "created_at" text NOT NULL,
  "created_by" text REFERENCES "users"("id") ON DELETE SET NULL
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_impact_department_idx" ON "ai_impact_assessments" ("department_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_impact_primary_ropa_idx" ON "ai_impact_assessments" ("primary_ropa_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_impact_status_idx" ON "ai_impact_assessments" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_links_source_idx" ON "assessment_links" ("source_module", "source_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_links_target_idx" ON "assessment_links" ("target_module", "target_id");

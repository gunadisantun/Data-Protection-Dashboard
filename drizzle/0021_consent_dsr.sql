CREATE TABLE IF NOT EXISTS "consent_templates" (
  "id" text PRIMARY KEY NOT NULL,
  "ropa_id" text NOT NULL REFERENCES "ropa_activities"("id"),
  "department_id" text NOT NULL REFERENCES "departments"("id"),
  "title" text NOT NULL,
  "purpose" text NOT NULL,
  "data_categories" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "body" text NOT NULL,
  "locale" text NOT NULL DEFAULT 'id',
  "version" integer NOT NULL DEFAULT 1,
  "status" text NOT NULL DEFAULT 'Draft',
  "effective_at" text,
  "created_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" text NOT NULL,
  "updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consent_records" (
  "id" text PRIMARY KEY NOT NULL,
  "template_id" text NOT NULL REFERENCES "consent_templates"("id"),
  "ropa_id" text NOT NULL REFERENCES "ropa_activities"("id"),
  "department_id" text NOT NULL REFERENCES "departments"("id"),
  "subject_reference" text NOT NULL,
  "status" text NOT NULL DEFAULT 'Granted',
  "granted_at" text,
  "withdrawn_at" text,
  "source_channel" text NOT NULL DEFAULT 'Manual',
  "version" integer NOT NULL DEFAULT 1,
  "notes" text NOT NULL DEFAULT '',
  "created_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consent_events" (
  "id" text PRIMARY KEY NOT NULL,
  "consent_record_id" text NOT NULL REFERENCES "consent_records"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "actor_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "event_at" text NOT NULL,
  "channel" text NOT NULL DEFAULT 'Manual',
  "note" text NOT NULL DEFAULT '',
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consent_tasks" (
  "id" text PRIMARY KEY NOT NULL,
  "consent_record_id" text NOT NULL REFERENCES "consent_records"("id") ON DELETE CASCADE,
  "task_type" text NOT NULL,
  "department_id" text NOT NULL REFERENCES "departments"("id"),
  "owner_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "supporting_owner" text NOT NULL DEFAULT '',
  "due_at" text,
  "status" text NOT NULL DEFAULT 'Open',
  "note" text NOT NULL DEFAULT '',
  "created_at" text NOT NULL,
  "completed_at" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consent_preference_tokens" (
  "id" text PRIMARY KEY NOT NULL,
  "consent_record_id" text NOT NULL REFERENCES "consent_records"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "purpose" text NOT NULL DEFAULT 'preference',
  "expires_at" text NOT NULL,
  "used_at" text,
  "revoked_at" text,
  "created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dsr_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "request_number" text NOT NULL UNIQUE,
  "subject_reference" text NOT NULL,
  "request_type" text NOT NULL,
  "ropa_id" text REFERENCES "ropa_activities"("id") ON DELETE SET NULL,
  "department_id" text REFERENCES "departments"("id") ON DELETE SET NULL,
  "status" text NOT NULL DEFAULT 'New',
  "identity_verification_status" text NOT NULL DEFAULT 'Unverified',
  "verification_method" text,
  "verified_at" text,
  "verified_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "verification_note" text NOT NULL DEFAULT '',
  "submitted_at" text NOT NULL,
  "due_at" text NOT NULL,
  "closed_at" text,
  "assigned_owner_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "response_channel" text NOT NULL,
  "subject_message" text NOT NULL,
  "internal_notes" text NOT NULL DEFAULT '',
  "response_body" text NOT NULL DEFAULT '',
  "response_locale" text NOT NULL DEFAULT 'id',
  "created_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dsr_events" (
  "id" text PRIMARY KEY NOT NULL,
  "request_id" text NOT NULL REFERENCES "dsr_requests"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "actor_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "timestamp" text NOT NULL,
  "note" text NOT NULL DEFAULT '',
  "previous_status" text,
  "next_status" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dsr_tasks" (
  "id" text PRIMARY KEY NOT NULL,
  "request_id" text NOT NULL REFERENCES "dsr_requests"("id") ON DELETE CASCADE,
  "task_type" text NOT NULL,
  "owner_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "supporting_owner" text NOT NULL DEFAULT '',
  "due_at" text,
  "status" text NOT NULL DEFAULT 'Open',
  "dependency" text NOT NULL DEFAULT '',
  "completion_note" text NOT NULL DEFAULT '',
  "evidence_reference" text NOT NULL DEFAULT '',
  "created_at" text NOT NULL,
  "completed_at" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dsr_public_tokens" (
  "id" text PRIMARY KEY NOT NULL,
  "request_id" text REFERENCES "dsr_requests"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "purpose" text NOT NULL,
  "expires_at" text NOT NULL,
  "used_at" text,
  "revoked_at" text,
  "created_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dsr_response_templates" (
  "id" text PRIMARY KEY NOT NULL,
  "request_type" text NOT NULL,
  "locale" text NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "body" text NOT NULL,
  "status" text NOT NULL DEFAULT 'Draft',
  "created_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" text NOT NULL,
  "updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consent_templates" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "consent_records" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "consent_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "consent_tasks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "consent_preference_tokens" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "dsr_requests" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "dsr_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "dsr_tasks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "dsr_public_tokens" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "dsr_response_templates" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "consent_records" ADD COLUMN IF NOT EXISTS "subject_name" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "consent_records" ADD COLUMN IF NOT EXISTS "subject_email" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "consent_records" ADD COLUMN IF NOT EXISTS "subject_phone" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "dsr_requests" ADD COLUMN IF NOT EXISTS "subject_name" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "dsr_requests" ADD COLUMN IF NOT EXISTS "subject_email" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "dsr_requests" ADD COLUMN IF NOT EXISTS "subject_phone" text NOT NULL DEFAULT '';

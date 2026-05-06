CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" text PRIMARY KEY NOT NULL,
	"ropa_id" text NOT NULL,
	"task_type" text NOT NULL,
	"status" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"reason" text NOT NULL,
	"notes" text NOT NULL,
	"due_date" text NOT NULL,
	"pic_name" text NOT NULL,
	"department_id" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"event_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"message" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ropa_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"activity_name" text NOT NULL,
	"process_description" text NOT NULL,
	"department_id" text NOT NULL,
	"pic_name" text NOT NULL,
	"pic_email" text NOT NULL,
	"legal_basis" text NOT NULL,
	"processing_purpose" text NOT NULL,
	"source_mechanism" text NOT NULL,
	"subject_categories" jsonb NOT NULL,
	"personal_data_types" jsonb NOT NULL,
	"recipients" text NOT NULL,
	"processor_contract_link" text NOT NULL,
	"data_receiver_role" text NOT NULL,
	"is_cross_border" boolean NOT NULL,
	"destination_country" text NOT NULL,
	"export_protection_mechanism" text NOT NULL,
	"transfer_mechanism" text NOT NULL,
	"storage_location" text NOT NULL,
	"retention_period" text NOT NULL,
	"technical_measures" text NOT NULL,
	"organizational_measures" text NOT NULL,
	"data_subject_rights" text NOT NULL,
	"risk_assessment_level" text NOT NULL,
	"high_risk_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_register_reference" text DEFAULT '' NOT NULL,
	"risk_likelihood" text DEFAULT 'Medium' NOT NULL,
	"risk_impact" text DEFAULT 'Medium' NOT NULL,
	"risk_context" text DEFAULT '' NOT NULL,
	"existing_controls" text DEFAULT '' NOT NULL,
	"residual_risk_level" text DEFAULT 'Medium' NOT NULL,
	"risk_mitigation_plan" text DEFAULT '' NOT NULL,
	"volume_level" text NOT NULL,
	"uses_automated_decision_making" boolean NOT NULL,
	"previous_process" text NOT NULL,
	"next_process" text NOT NULL,
	"status" text NOT NULL,
	"user_id" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"role" text DEFAULT 'PIC' NOT NULL,
	"department_id" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"department_id" text,
	"created_at" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_ropa_id_ropa_activities_id_fk" FOREIGN KEY ("ropa_id") REFERENCES "public"."ropa_activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ropa_activities" ADD CONSTRAINT "ropa_activities_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ropa_activities" ADD CONSTRAINT "ropa_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
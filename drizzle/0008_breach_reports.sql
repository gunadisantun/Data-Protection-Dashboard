create table if not exists "breach_reports" (
  "id" text primary key not null,
  "report_number" text not null unique,
  "title" text not null,
  "department_id" text references "departments"("id") on delete set null,
  "status" text not null default 'Draft',
  "answers" jsonb not null,
  "reported_by" text references "users"("id") on delete set null,
  "finalized_by" text references "users"("id") on delete set null,
  "finalized_at" text,
  "created_at" text not null,
  "updated_at" text not null
);

create table if not exists "risk_register_entries" (
  "id" text primary key,
  "risk_id" text not null,
  "risk_description" text not null,
  "potential_impact" text not null,
  "existing_control" text not null,
  "risk_level" text not null,
  "recommended_action" text not null,
  "risk_owner" text not null,
  "target_date" text not null,
  "status" text not null,
  "remarks" text not null default '',
  "source_assessment_id" text,
  "source_ropa_id" text,
  "department_id" text,
  "activity_name" text not null default '',
  "created_at" text not null,
  "updated_at" text not null
);

--> statement-breakpoint
do $$ begin
  alter table "risk_register_entries"
    add constraint "risk_register_entries_source_assessment_id_assessments_id_fk"
    foreign key ("source_assessment_id")
    references "public"."assessments"("id")
    on delete set null
    on update no action;
exception
  when duplicate_object then null;
end $$;

--> statement-breakpoint
do $$ begin
  alter table "risk_register_entries"
    add constraint "risk_register_entries_source_ropa_id_ropa_activities_id_fk"
    foreign key ("source_ropa_id")
    references "public"."ropa_activities"("id")
    on delete set null
    on update no action;
exception
  when duplicate_object then null;
end $$;

--> statement-breakpoint
do $$ begin
  alter table "risk_register_entries"
    add constraint "risk_register_entries_department_id_departments_id_fk"
    foreign key ("department_id")
    references "public"."departments"("id")
    on delete set null
    on update no action;
exception
  when duplicate_object then null;
end $$;

create table if not exists "faq_categories" (
  "id" text primary key,
  "name" text not null unique,
  "scope" text not null default '',
  "display_order" integer not null default 0,
  "created_at" text not null,
  "updated_at" text not null
);

--> statement-breakpoint
create table if not exists "faq_entries" (
  "id" text primary key,
  "category_id" text not null,
  "question" text not null,
  "answer" text not null,
  "legal_basis" text not null default '',
  "benchmark_support" text not null default '',
  "status" text not null default '',
  "display_order" integer not null default 0,
  "created_at" text not null,
  "updated_at" text not null,
  "created_by" text,
  "updated_by" text
);

--> statement-breakpoint
create table if not exists "faq_references" (
  "id" text primary key,
  "group_name" text not null,
  "title" text not null,
  "description" text not null default '',
  "url" text not null,
  "display_order" integer not null default 0,
  "created_at" text not null,
  "updated_at" text not null
);

--> statement-breakpoint
create table if not exists "sop_documents" (
  "id" text primary key,
  "title" text not null,
  "category" text not null,
  "summary" text not null default '',
  "file_name" text not null,
  "mime_type" text not null,
  "file_size" integer not null,
  "storage_bucket" text not null,
  "storage_path" text not null,
  "uploaded_by" text not null,
  "created_at" text not null,
  "updated_at" text not null
);

--> statement-breakpoint
do $$ begin
  alter table "faq_entries"
    add constraint "faq_entries_category_id_faq_categories_id_fk"
    foreign key ("category_id")
    references "public"."faq_categories"("id")
    on delete cascade
    on update no action;
exception
  when duplicate_object then null;
end $$;

--> statement-breakpoint
do $$ begin
  alter table "faq_entries"
    add constraint "faq_entries_created_by_users_id_fk"
    foreign key ("created_by")
    references "public"."users"("id")
    on delete set null
    on update no action;
exception
  when duplicate_object then null;
end $$;

--> statement-breakpoint
do $$ begin
  alter table "faq_entries"
    add constraint "faq_entries_updated_by_users_id_fk"
    foreign key ("updated_by")
    references "public"."users"("id")
    on delete set null
    on update no action;
exception
  when duplicate_object then null;
end $$;

--> statement-breakpoint
do $$ begin
  alter table "sop_documents"
    add constraint "sop_documents_uploaded_by_users_id_fk"
    foreign key ("uploaded_by")
    references "public"."users"("id")
    on delete restrict
    on update no action;
exception
  when duplicate_object then null;
end $$;

create table if not exists "module_column_settings" (
  "id" text primary key,
  "module" text not null unique,
  "visible_columns" jsonb not null,
  "created_at" text not null,
  "updated_at" text not null,
  "updated_by" text references "users"("id") on delete set null,
  constraint "module_column_settings_module_check"
    check ("module" in ('ropa', 'dpia', 'tia', 'lia'))
);

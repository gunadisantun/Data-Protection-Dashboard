alter table "module_column_settings"
  add column if not exists "custom_columns" jsonb not null default '[]'::jsonb;

alter table "self_assessments"
add column if not exists "data_map" jsonb not null default '[]'::jsonb;

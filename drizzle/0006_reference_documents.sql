alter table "faq_references"
  add column if not exists "file_name" text not null default '',
  add column if not exists "mime_type" text not null default 'application/pdf',
  add column if not exists "file_size" integer not null default 0,
  add column if not exists "storage_bucket" text not null default '',
  add column if not exists "storage_path" text not null default '';

alter table "faq_references"
  add column if not exists "file_content_base64" text not null default '';

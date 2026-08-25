create table if not exists "knowledge_chunks" (
  "id" text primary key,
  "source_type" text not null,
  "source_id" text not null,
  "title" text not null,
  "content" text not null,
  "url" text,
  "metadata" jsonb,
  "created_at" text not null,
  "updated_at" text not null
);

--> statement-breakpoint
create index if not exists "knowledge_chunks_source_idx"
  on "knowledge_chunks" ("source_type", "source_id");

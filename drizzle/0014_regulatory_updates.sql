create table if not exists "regulatory_updates" (
  "id" text primary key,
  "country" text not null,
  "iso2" text not null,
  "iso3" text not null,
  "region" text not null,
  "category" text not null,
  "requirement_type" text not null,
  "risk_level" text not null,
  "title" text not null,
  "summary" text not null,
  "key_change" text not null,
  "business_impact" text not null,
  "source_name" text not null,
  "source_url" text not null,
  "source_last_updated" text,
  "source_checked_at" text not null,
  "ai_confidence" integer,
  "review_status" text not null,
  "reviewer_note" text,
  "published_at" text,
  "created_at" text not null default now()::text,
  "updated_at" text not null default now()::text
);
--> statement-breakpoint
create index if not exists "regulatory_updates_country_idx" on "regulatory_updates" ("country");
--> statement-breakpoint
create index if not exists "regulatory_updates_iso2_idx" on "regulatory_updates" ("iso2");
--> statement-breakpoint
create index if not exists "regulatory_updates_iso3_idx" on "regulatory_updates" ("iso3");
--> statement-breakpoint
create index if not exists "regulatory_updates_region_idx" on "regulatory_updates" ("region");
--> statement-breakpoint
create index if not exists "regulatory_updates_category_idx" on "regulatory_updates" ("category");
--> statement-breakpoint
create index if not exists "regulatory_updates_requirement_type_idx" on "regulatory_updates" ("requirement_type");
--> statement-breakpoint
create index if not exists "regulatory_updates_risk_level_idx" on "regulatory_updates" ("risk_level");
--> statement-breakpoint
create index if not exists "regulatory_updates_review_status_idx" on "regulatory_updates" ("review_status");
--> statement-breakpoint
create index if not exists "regulatory_updates_published_at_idx" on "regulatory_updates" ("published_at");
--> statement-breakpoint
create table if not exists "regulatory_sources" (
  "id" text primary key,
  "country" text not null,
  "iso2" text not null,
  "iso3" text not null,
  "region" text not null,
  "source_name" text not null,
  "base_url" text not null,
  "topic" text not null,
  "generated_url" text not null,
  "is_active" boolean not null default true,
  "created_at" text not null default now()::text,
  "updated_at" text not null default now()::text
);
--> statement-breakpoint
create index if not exists "regulatory_sources_country_idx" on "regulatory_sources" ("country");
--> statement-breakpoint
create index if not exists "regulatory_sources_iso2_idx" on "regulatory_sources" ("iso2");
--> statement-breakpoint
create index if not exists "regulatory_sources_iso3_idx" on "regulatory_sources" ("iso3");
--> statement-breakpoint
create index if not exists "regulatory_sources_region_idx" on "regulatory_sources" ("region");
--> statement-breakpoint
create index if not exists "regulatory_sources_topic_idx" on "regulatory_sources" ("topic");
--> statement-breakpoint
insert into "regulatory_sources" (
  "id",
  "country",
  "iso2",
  "iso3",
  "region",
  "source_name",
  "base_url",
  "topic",
  "generated_url",
  "is_active",
  "created_at",
  "updated_at"
)
values (
  'reg-source-idn-law',
  'Indonesia',
  'ID',
  'IDN',
  'Asia',
  'External privacy law reference',
  '',
  'law',
  '',
  true,
  now()::text,
  now()::text
)
on conflict ("id") do nothing;
--> statement-breakpoint
insert into "regulatory_updates" (
  "id",
  "country",
  "iso2",
  "iso3",
  "region",
  "category",
  "requirement_type",
  "risk_level",
  "title",
  "summary",
  "key_change",
  "business_impact",
  "source_name",
  "source_url",
  "source_last_updated",
  "source_checked_at",
  "ai_confidence",
  "review_status",
  "reviewer_note",
  "published_at",
  "created_at",
  "updated_at"
)
values (
  'reg-update-idn-law-seed',
  'Indonesia',
  'ID',
  'IDN',
  'Asia',
  'Data Protection Law',
  'Law',
  'High',
  'Indonesia data protection law overview',
  'Indonesia has a comprehensive personal data protection framework under Law No. 27 of 2022 on Personal Data Protection. The law regulates personal data processing, controller and processor obligations, data subject rights, cross-border transfer, breach notification, sanctions, and institutional supervision.',
  'The source should be monitored for updates because Indonesia''s PDP framework may continue to develop through implementing regulations and supervisory guidance.',
  'Organizations processing personal data in Indonesia should maintain privacy notices, processing records, lawful basis assessment, data subject rights procedures, breach response procedures, vendor controls, and cross-border transfer assessment.',
  'External privacy law reference',
  '',
  null,
  now()::text,
  85,
  'Published',
  null,
  now()::text,
  now()::text,
  now()::text
)
on conflict ("id") do nothing;

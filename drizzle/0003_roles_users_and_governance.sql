alter table "users"
  add column if not exists "username" text,
  add column if not exists "pic_name" text,
  add column if not exists "pic_email" text;

--> statement-breakpoint
update "users"
set "username" = lower(regexp_replace(split_part("email", '@', 1), '[^a-zA-Z0-9_]+', '_', 'g'))
where "username" is null or trim("username") = '';

--> statement-breakpoint
update "users" set "username" = 'masteradmin' where "id" = 'user-admin';
update "users" set "username" = 'dpo' where "id" = 'user-dpo';
update "users" set "username" = 'user_finance' where "id" = 'user-finance';
update "users" set "username" = 'user_hr' where "id" = 'user-hr';
update "users" set "username" = 'user_legal' where "id" = 'user-legal';
update "users" set "username" = 'user_marketing' where "id" = 'user-marketing';
update "users" set "username" = 'user_product' where "id" = 'user-product';

--> statement-breakpoint
update "users"
set
  "pic_name" = coalesce(nullif(trim("full_name"), ''), 'PIC'),
  "pic_email" = coalesce(nullif(trim("email"), ''), 'unknown@privacyvault.local')
where
  "pic_name" is null or trim("pic_name") = '' or
  "pic_email" is null or trim("pic_email") = '';

--> statement-breakpoint
alter table "users"
  alter column "username" set not null,
  alter column "pic_name" set not null,
  alter column "pic_email" set not null;

--> statement-breakpoint
do $$ begin
  alter table "users" add constraint "users_username_unique" unique("username");
exception
  when duplicate_object then null;
end $$;

--> statement-breakpoint
update "users"
set "role" = case
  when lower("role") = 'pic' then 'User'
  when lower("role") = 'admin' and "id" = 'user-dpo' then 'DPO'
  when lower("role") = 'admin' then 'MasterAdmin'
  else "role"
end;

--> statement-breakpoint
update "user"
set "role" = case
  when lower("role") = 'pic' then 'User'
  when lower("role") = 'admin' and "id" = 'user-dpo' then 'DPO'
  when lower("role") = 'admin' then 'MasterAdmin'
  else "role"
end;

--> statement-breakpoint
alter table "user" alter column "role" set default 'User';

--> statement-breakpoint
create table if not exists "governance_settings" (
  "id" text primary key,
  "controller_processor_contacts" text not null,
  "dpo_contact" text not null,
  "created_at" text not null,
  "updated_at" text not null,
  "updated_by" text
);

--> statement-breakpoint
do $$ begin
  alter table "governance_settings"
    add constraint "governance_settings_updated_by_users_id_fk"
    foreign key ("updated_by")
    references "public"."users"("id")
    on delete no action
    on update no action;
exception
  when duplicate_object then null;
end $$;

--> statement-breakpoint
insert into "governance_settings" (
  "id",
  "controller_processor_contacts",
  "dpo_contact",
  "created_at",
  "updated_at",
  "updated_by"
)
select
  'singleton',
  'PT Data Protection Governance (Pengendali) - privacy@company.com',
  'dpo@company.com',
  now()::text,
  now()::text,
  'user-dpo'
where not exists (
  select 1 from "governance_settings" where "id" = 'singleton'
);

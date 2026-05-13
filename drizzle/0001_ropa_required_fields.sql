alter table "ropa_activities"
  add column if not exists "controller_processor_contacts" text not null default '',
  add column if not exists "dpo_contact" text not null default '',
  add column if not exists "transfer_purpose" text not null default '',
  add column if not exists "data_flow_mapping" text not null default '';

--> statement-breakpoint
update "ropa_activities"
set
  "controller_processor_contacts" = case
    when trim("controller_processor_contacts") <> '' then "controller_processor_contacts"
    when trim("recipients") <> '' then "recipients"
    else "pic_name" || ' (' || "pic_email" || ')'
  end,
  "dpo_contact" = case
    when trim("dpo_contact") <> '' then "dpo_contact"
    else "pic_email"
  end,
  "transfer_purpose" = case
    when trim("transfer_purpose") <> '' then "transfer_purpose"
    else "processing_purpose"
  end,
  "data_flow_mapping" = case
    when trim("data_flow_mapping") <> '' then "data_flow_mapping"
    else trim(coalesce("previous_process", '') || ' -> ' || coalesce("activity_name", '') || ' -> ' || coalesce("next_process", ''))
  end;

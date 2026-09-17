CREATE TABLE IF NOT EXISTS ropa_flow_assets (
  id text PRIMARY KEY,
  department_id text NOT NULL REFERENCES departments(id),
  created_by text NOT NULL REFERENCES users(id),
  kind text NOT NULL CHECK (kind IN ('SOURCE','SYSTEM','STORAGE','RECIPIENT')),
  name text NOT NULL,
  owner text NOT NULL DEFAULT '', location text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '', retention text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '', version integer NOT NULL DEFAULT 0,
  updated_at text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ropa_flow_assets_department_idx ON ropa_flow_assets(department_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS ropa_flow_links (
  id text PRIMARY KEY,
  source_ropa_id text REFERENCES ropa_activities(id) ON DELETE CASCADE,
  source_asset_id text REFERENCES ropa_flow_assets(id) ON DELETE CASCADE,
  target_ropa_id text REFERENCES ropa_activities(id) ON DELETE CASCADE,
  target_asset_id text REFERENCES ropa_flow_assets(id) ON DELETE CASCADE,
  label text NOT NULL, data_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text NOT NULL DEFAULT '', created_by text NOT NULL REFERENCES users(id),
  created_at text NOT NULL,
  CHECK ((source_ropa_id IS NULL) <> (source_asset_id IS NULL)),
  CHECK ((target_ropa_id IS NULL) <> (target_asset_id IS NULL)),
  CHECK (COALESCE('activity:' || source_ropa_id, 'asset:' || source_asset_id) <> COALESCE('activity:' || target_ropa_id, 'asset:' || target_asset_id))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ropa_flow_links_source_ropa_idx ON ropa_flow_links(source_ropa_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ropa_flow_links_target_ropa_idx ON ropa_flow_links(target_ropa_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS ropa_flow_links_pair_idx ON ropa_flow_links(
  COALESCE('activity:' || source_ropa_id, 'asset:' || source_asset_id),
  COALESCE('activity:' || target_ropa_id, 'asset:' || target_asset_id)
);

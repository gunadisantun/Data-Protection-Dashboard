ALTER TABLE ropa_flow_assets ALTER COLUMN created_by DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE ropa_flow_assets DROP CONSTRAINT IF EXISTS ropa_flow_assets_created_by_fkey;
--> statement-breakpoint
ALTER TABLE ropa_flow_assets ADD CONSTRAINT ropa_flow_assets_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE ropa_flow_links ALTER COLUMN created_by DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE ropa_flow_links DROP CONSTRAINT IF EXISTS ropa_flow_links_created_by_fkey;
--> statement-breakpoint
ALTER TABLE ropa_flow_links ADD CONSTRAINT ropa_flow_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE ropa_flow_assets ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE ropa_flow_links ENABLE ROW LEVEL SECURITY;

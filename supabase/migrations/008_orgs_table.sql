-- Orgs table — populated by the sync-engagement Edge Function from
-- BigQuery `dim_org`. Replaces deriving the POC Teams dropdown from
-- DISTINCT users.current_org_name, so orgs without any synced users
-- (e.g. brand-new POCs that only have Akkio internal accounts) still
-- appear in the Command Center.
CREATE TABLE IF NOT EXISTS orgs (
  project_id TEXT NOT NULL,
  org_name TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, org_name)
);

CREATE INDEX IF NOT EXISTS idx_orgs_project ON orgs(project_id);

INSERT INTO sync_metadata (project_id, sync_type) VALUES
  ('akkio-poc', 'orgs')
ON CONFLICT DO NOTHING;

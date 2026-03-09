-- Supabase migration: Create engagement tracking tables
-- These tables are populated by the sync-engagement Edge Function
-- which ETLs data from BigQuery hourly.
--
-- Every table includes a `project_id` column (the GCP project ID, e.g.
-- "akkio-demo-438920") so data from multiple BigQuery environments
-- (Demo, POC, Prod) can coexist without collisions.

-- Users (from BigQuery dim_user + users_clean)
-- A user_id can exist in multiple BQ projects, so the PK is composite.
CREATE TABLE IF NOT EXISTS users (
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  email TEXT,
  org_names JSONB,
  team_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(project_id, team_id);

-- Daily active minutes per user per page (from BigQuery daily_active_user_page_minutes)
CREATE TABLE IF NOT EXISTS daily_active_minutes (
  id BIGSERIAL PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  page_title TEXT,
  activity_date DATE,
  active_minutes NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id, page_title, activity_date),
  FOREIGN KEY (project_id, user_id) REFERENCES users(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_active_user ON daily_active_minutes(project_id, user_id, activity_date);

-- Chat events (from BigQuery fact_chat + Firestore chatHistory)
CREATE TABLE IF NOT EXISTS user_chats (
  project_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  chat_title TEXT,
  chat_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, chat_id),
  FOREIGN KEY (project_id, user_id) REFERENCES users(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chats_user ON user_chats(project_id, user_id, chat_timestamp);

-- Login events (from BigQuery fact_event login/logout)
CREATE TABLE IF NOT EXISTS login_events (
  id BIGSERIAL PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_name TEXT, -- 'login' or 'logout'
  event_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY (project_id, user_id) REFERENCES users(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_login_user ON login_events(project_id, user_id, event_timestamp);

-- Sync metadata: tracks when each data type was last synced, per project
CREATE TABLE IF NOT EXISTS sync_metadata (
  project_id TEXT NOT NULL,
  sync_type TEXT NOT NULL, -- 'active_minutes', 'chats', 'users', 'login_events'
  last_synced_at TIMESTAMPTZ DEFAULT '2020-01-01'::TIMESTAMPTZ,
  rows_synced INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, sync_type)
);

-- Seed default sync metadata for the POC project
INSERT INTO sync_metadata (project_id, sync_type) VALUES
  ('akkio-demo-438920', 'active_minutes'),
  ('akkio-demo-438920', 'chats'),
  ('akkio-demo-438920', 'users'),
  ('akkio-demo-438920', 'login_events')
ON CONFLICT DO NOTHING;

-- View: Pre-aggregated team engagement summary
-- This matches the shape the EngagementTab frontend expects.
-- Filter by project_id to scope to one environment.
CREATE OR REPLACE VIEW team_engagement_summary AS
SELECT
  u.project_id,
  u.user_id,
  u.email,
  u.team_id,
  COALESCE(ROUND(SUM(dam.active_minutes) / 60.0, 1), 0) AS total_hours,
  COALESCE(ROUND(
    SUM(CASE WHEN dam.activity_date >= CURRENT_DATE - INTERVAL '7 days' THEN dam.active_minutes ELSE 0 END) / 60.0,
    1
  ), 0) AS week_hours,
  COALESCE(chat_counts.total_chats, 0) AS total_chats
FROM users u
LEFT JOIN daily_active_minutes dam
  ON dam.project_id = u.project_id AND dam.user_id = u.user_id
LEFT JOIN (
  SELECT project_id, user_id, COUNT(*) AS total_chats
  FROM user_chats
  GROUP BY project_id, user_id
) chat_counts
  ON chat_counts.project_id = u.project_id AND chat_counts.user_id = u.user_id
GROUP BY u.project_id, u.user_id, u.email, u.team_id, chat_counts.total_chats;

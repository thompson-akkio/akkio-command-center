# Supabase + BigQuery Setup Guide

This document describes how to set up the engagement data pipeline that replaces
the old Cloud Functions → HubSpot flow.

## Architecture

```
BigQuery (raw GA4/Firebase events)
    ↓ BigQuery Scheduled Query (hourly rollup)
BigQuery rollup tables
    ↓ Supabase Edge Function (hourly cron ETL)
Supabase Postgres
    ↓ Supabase JS client + React Query
Command Center Frontend
```

## Step 1: Create Supabase Project

1. Go to https://supabase.com and create a new project
2. Note the **Project URL** and **Anon Key** from Settings → API
3. Create a `.env.local` in the repo root (see `.env.example`):
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

## Step 2: Run Database Migration

In the Supabase SQL Editor, run the contents of:
```
supabase/migrations/001_engagement_tables.sql
```

This creates:
- `users` table
- `daily_active_minutes` table
- `user_chats` table
- `login_events` table
- `sync_metadata` table
- `team_engagement_summary` view

## Step 3: Set Up BigQuery Scheduled Query

Move the rollup computation from the `active_session-fn` Cloud Function to a
native BigQuery Scheduled Query. This removes the need for a Cloud Function
just to run SQL.

1. Go to BigQuery Console → Scheduled Queries → Create
2. Schedule: Every 1 hour
3. Query: Copy the MERGE script from `active_session-fn/index.js`
   (the `buildMergeScriptPageOnly()` function output, with variables resolved)
4. Set the destination dataset if needed

This keeps the `daily_active_user_page_minutes` rollup table updated.

## Step 4: Deploy the Sync Edge Function

The Edge Function at `supabase/functions/sync-engagement/index.ts` handles
the hourly ETL from BigQuery → Supabase.

### Set secrets:
```bash
# Comma-separated list of GCP project IDs to sync.
# Start with just POC; add more later (e.g., "akkio-demo-438920,akkio-prod-456789")
supabase secrets set BQ_PROJECT_IDS=akkio-demo-438920
supabase secrets set BQ_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

The service account needs the `roles/bigquery.dataViewer` role on **every**
BigQuery project you list. When you add a new environment later, just update
the `BQ_PROJECT_IDS` secret and redeploy.

### Deploy:
```bash
supabase functions deploy sync-engagement
```

### Schedule (via Supabase Dashboard):
Go to Edge Functions → sync-engagement → Schedule → set to run every hour
(cron: `0 * * * *`).

Alternatively, add to `supabase/config.toml`:
```toml
[functions.sync-engagement]
schedule = "0 * * * *"
```

## Step 5: Decommission Cloud Functions

Once the Supabase pipeline is verified working:

1. Disable the Cloud Scheduler jobs that trigger the old functions
2. Delete or archive the Cloud Functions:
   - `active_session-fn` → replaced by BQ Scheduled Query + Edge Function
   - `user_chats-fn` → replaced by Edge Function `syncChats()`
   - `login-event-fn` → replaced by Edge Function `syncLoginEvents()`
   - `user_id-fn` → replaced by Edge Function `syncUsers()`
   - `org_id-fn` → replaced by Edge Function `syncUsers()` (merged)

## Verification

1. Trigger the Edge Function manually:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/sync-engagement \
     -H "Authorization: Bearer your-service-role-key"
   ```
2. Check that data appears in Supabase tables via the Table Editor
3. Run the frontend (`npm run dev`) and verify the Engagement tab shows data

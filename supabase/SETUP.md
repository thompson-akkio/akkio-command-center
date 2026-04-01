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

## Step 6: Set Up Document Uploads → Google Drive

The `upload-document` Edge Function receives file uploads from the Documents tab
and stores them in Google Drive under a per-team folder structure:

```
Command Center Uploads/        ← shared GDrive folder
├── Acme Corp/                 ← auto-created per team
│   ├── Data Dictionary.pdf
│   └── Use Case Brief.docx
├── Globex Inc/
│   └── ...
```

### 6a. Create a Google Cloud Service Account

1. Go to Google Cloud Console → IAM & Admin → Service Accounts
2. Create a service account (e.g. `command-center-uploads`)
3. No roles needed on the GCP project itself — Drive access is via folder sharing
4. Create a JSON key and download it

### 6b. Set Up the Google Drive Folder

1. In Google Drive, create a folder called **"Command Center Uploads"**
2. Right-click → Share → add the service account email
   (e.g. `command-center-uploads@your-project.iam.gserviceaccount.com`)
   with **Editor** access
3. Copy the folder ID from the URL: `https://drive.google.com/drive/folders/<FOLDER_ID>`

### 6c. Run the Documents Migration

In the Supabase SQL Editor, run:
```
supabase/migrations/002_documents_table.sql
```

### 6d. Set Secrets and Deploy

```bash
supabase secrets set GDRIVE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
supabase secrets set GDRIVE_PARENT_FOLDER_ID=your-folder-id-here
supabase functions deploy upload-document
```

### 6e. Verify

```bash
# Test with curl (replace values):
curl -X POST https://your-project.supabase.co/functions/v1/upload-document \
  -H "Authorization: Bearer your-anon-key" \
  -F "file=@test.pdf" \
  -F "teamId=team-1" \
  -F "teamName=Acme Corp" \
  -F "name=Test Document" \
  -F "category=additional" \
  -F "required=false" \
  -F "uploadedBy=Test User"
```

Check that:
1. A folder "Acme Corp" appears inside "Command Center Uploads" in Drive
2. The file appears in that folder
3. The `documents` table has a new row with `gdrive_file_id` populated

## Verification

1. Trigger the Edge Function manually:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/sync-engagement \
     -H "Authorization: Bearer your-service-role-key"
   ```
2. Check that data appears in Supabase tables via the Table Editor
3. Run the frontend (`npm run dev`) and verify the Engagement tab shows data

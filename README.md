# Akkio Command Center

Client-facing hub for tracking POCs. POC Journey, Engagement, and Documents views.

**Frontend:** Vite + React + TypeScript + shadcn/ui (Tailwind), TanStack Query, React Router. Auth via Supabase.

**Backend:** Supabase (Postgres + Auth + Edge Functions).

The app never queries BigQuery directly from the browser — edge functions broker access and write engagement snapshots into Postgres for the UI to read. Row-level security is enforced on all team-scoped tables; admins see all orgs, members see only their teams.

The app falls back to mock data when Supabase env vars are not set.

## Data flow

​```
BigQuery (akkio-poc)  --[sync-engagement]-->  Supabase Postgres  -->  React app
Client uploads        --[upload-document]-->  Supabase Postgres
​```
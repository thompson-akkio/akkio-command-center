-- ============================================================================
-- Documents table for POC Command Center
-- Each POC team has its own checklist of documents.
-- "standard" items are created by Akkio admins; "additional" items are created
-- when a client uploads a document under the "Other" option.
-- ============================================================================

create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  team_id     text not null,
  name        text not null,
  description text,
  required    boolean not null default false,
  uploaded    boolean not null default false,
  uploaded_by text,
  uploaded_at timestamptz,
  category    text not null default 'standard'
              check (category in ('standard', 'additional')),
  gdrive_file_id text,          -- populated after GDrive integration is wired up
  created_at  timestamptz not null default now(),
  created_by  text,              -- user id of whoever created the checklist item
  sort_order  int not null default 0
);

-- Index for fast lookups by team
create index if not exists idx_documents_team_id on public.documents (team_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- Enable RLS on the table
alter table public.documents enable row level security;

-- Allow both anon and authenticated access until auth is implemented.
-- The anon role is used by the Supabase JS client before a user logs in.
create policy "Allow read documents"
  on public.documents
  for select
  to anon, authenticated
  using (true);

create policy "Allow insert documents"
  on public.documents
  for insert
  to anon, authenticated
  with check (true);

create policy "Allow update documents"
  on public.documents
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Allow delete documents"
  on public.documents
  for delete
  to anon, authenticated
  using (true);

-- ============================================================================
-- TODO: Once auth is implemented, tighten these policies:
--   - Remove `anon` from all policies
--   - Admin-only operations: check auth.jwt() ->> 'is_admin' = 'true'
--   - Read access: check team membership
-- ============================================================================

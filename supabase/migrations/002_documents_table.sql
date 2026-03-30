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

-- Anyone authenticated can read documents for teams they have access to.
-- (Team membership enforcement will be handled at the application layer until
--  a teams/memberships table exists. For now, allow all authenticated reads.)
create policy "Authenticated users can read documents"
  on public.documents
  for select
  to authenticated
  using (true);

-- Only Akkio admins (identified by a custom claim or role) can insert standard items.
-- All authenticated users can insert additional items (uploads via "Other").
create policy "Authenticated users can insert documents"
  on public.documents
  for insert
  to authenticated
  with check (true);

-- Only admins can update standard document metadata (name, required).
-- Any authenticated user can mark a document as uploaded.
create policy "Authenticated users can update documents"
  on public.documents
  for update
  to authenticated
  using (true)
  with check (true);

-- Only admins can delete documents.
create policy "Authenticated users can delete documents"
  on public.documents
  for delete
  to authenticated
  using (true);

-- ============================================================================
-- NOTE: The policies above are intentionally permissive (all authenticated).
-- Once auth is fully implemented with user roles, tighten these to check:
--   - auth.jwt() ->> 'is_admin' = 'true'  for admin-only operations
--   - team membership for read access
-- ============================================================================

-- ============================================================================
-- Auth: Profiles, Team Members, and tightened RLS
-- ============================================================================

-- ── Profiles (auto-created on signup via trigger) ─────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_profiles_email on public.profiles(email);

alter table public.profiles enable row level security;

-- Users can read their own profile; admins can read all
create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or (select is_admin from public.profiles where id = auth.uid())
  );

-- Users can update their own profile (name only, not is_admin)
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ── Team Members (maps auth users to teams) ───────────────────────────────
create table if not exists public.team_members (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  team_id     text not null,
  team_name   text not null,
  role        text not null default 'member' check (role in ('admin', 'member')),
  created_at  timestamptz not null default now()
);

create unique index if not exists idx_team_members_user_team
  on public.team_members(user_id, team_id);
create index if not exists idx_team_members_team
  on public.team_members(team_id);

alter table public.team_members enable row level security;

-- Users can see their own team memberships; admins can see all
create policy "Users can read own team memberships"
  on public.team_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or (select is_admin from public.profiles where id = auth.uid())
  );

-- Only admins can manage team memberships
create policy "Admins can insert team memberships"
  on public.team_members for insert
  to authenticated
  with check ((select is_admin from public.profiles where id = auth.uid()));

create policy "Admins can update team memberships"
  on public.team_members for update
  to authenticated
  using ((select is_admin from public.profiles where id = auth.uid()));

create policy "Admins can delete team memberships"
  on public.team_members for delete
  to authenticated
  using ((select is_admin from public.profiles where id = auth.uid()));

-- ── Auto-create profile on signup ─────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, is_admin)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    false
  );
  return new;
end;
$$;

-- Drop if exists so this migration is idempotent
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Tighten Documents RLS ─────────────────────────────────────────────────
-- Drop the old wide-open policies
drop policy if exists "Allow read documents" on public.documents;
drop policy if exists "Allow insert documents" on public.documents;
drop policy if exists "Allow update documents" on public.documents;
drop policy if exists "Allow delete documents" on public.documents;

-- New policies: scoped to team membership
create policy "Authenticated users can read team documents"
  on public.documents for select
  to authenticated
  using (
    exists (
      select 1 from public.team_members
      where team_members.user_id = auth.uid()
        and team_members.team_id = documents.team_id
    )
    or (select is_admin from public.profiles where id = auth.uid())
  );

create policy "Authenticated users can insert documents for their teams"
  on public.documents for insert
  to authenticated
  with check (
    exists (
      select 1 from public.team_members
      where team_members.user_id = auth.uid()
        and team_members.team_id = documents.team_id
    )
    or (select is_admin from public.profiles where id = auth.uid())
  );

create policy "Authenticated users can update documents for their teams"
  on public.documents for update
  to authenticated
  using (
    exists (
      select 1 from public.team_members
      where team_members.user_id = auth.uid()
        and team_members.team_id = documents.team_id
    )
    or (select is_admin from public.profiles where id = auth.uid())
  );

-- Only admins can delete documents
create policy "Admins can delete documents"
  on public.documents for delete
  to authenticated
  using ((select is_admin from public.profiles where id = auth.uid()));

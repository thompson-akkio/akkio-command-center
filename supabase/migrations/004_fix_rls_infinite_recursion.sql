-- ============================================================================
-- Fix: Infinite recursion in RLS policies (error 42P17)
--
-- The profiles RLS policy referenced the profiles table to check is_admin,
-- which triggered the same policy again. Fix: use a SECURITY DEFINER
-- function that bypasses RLS to check admin status.
-- ============================================================================

-- ── Helper function: check if current user is admin ───────────────────────
-- SECURITY DEFINER runs as the function owner (postgres), bypassing RLS.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  )
$$;

-- ── Fix profiles policies ─────────────────────────────────────────────────
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

-- Users can read their own profile; admins can read all
create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ── Fix team_members policies ─────────────────────────────────────────────
drop policy if exists "Users can read own team memberships" on public.team_members;
drop policy if exists "Admins can insert team memberships" on public.team_members;
drop policy if exists "Admins can update team memberships" on public.team_members;
drop policy if exists "Admins can delete team memberships" on public.team_members;

create policy "Users can read own team memberships"
  on public.team_members for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "Admins can insert team memberships"
  on public.team_members for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update team memberships"
  on public.team_members for update
  to authenticated
  using (public.is_admin());

create policy "Admins can delete team memberships"
  on public.team_members for delete
  to authenticated
  using (public.is_admin());

-- ── Fix documents policies ────────────────────────────────────────────────
drop policy if exists "Authenticated users can read team documents" on public.documents;
drop policy if exists "Authenticated users can insert documents for their teams" on public.documents;
drop policy if exists "Authenticated users can update documents for their teams" on public.documents;
drop policy if exists "Admins can delete documents" on public.documents;

create policy "Authenticated users can read team documents"
  on public.documents for select
  to authenticated
  using (
    exists (
      select 1 from public.team_members
      where team_members.user_id = auth.uid()
        and team_members.team_id = documents.team_id
    )
    or public.is_admin()
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
    or public.is_admin()
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
    or public.is_admin()
  );

create policy "Admins can delete documents"
  on public.documents for delete
  to authenticated
  using (public.is_admin());

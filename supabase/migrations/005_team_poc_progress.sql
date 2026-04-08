-- ============================================================================
-- POC Journey: track each team's current stage (0-6)
-- ============================================================================

create table if not exists public.team_poc_progress (
  team_id     text primary key,
  stage       integer not null default 0 check (stage between 0 and 6),
  updated_by  uuid references public.profiles(id),
  updated_at  timestamptz not null default now()
);

alter table public.team_poc_progress enable row level security;

-- Team members + admins can read their team's progress
create policy "Users can read own team progress"
  on public.team_poc_progress for select
  to authenticated
  using (
    exists (
      select 1 from public.team_members
      where team_members.user_id = auth.uid()
        and team_members.team_id = team_poc_progress.team_id
    )
    or (select is_admin from public.profiles where id = auth.uid())
  );

-- Only admins can insert/update progress
create policy "Admins can insert poc progress"
  on public.team_poc_progress for insert
  to authenticated
  with check ((select is_admin from public.profiles where id = auth.uid()));

create policy "Admins can update poc progress"
  on public.team_poc_progress for update
  to authenticated
  using ((select is_admin from public.profiles where id = auth.uid()));

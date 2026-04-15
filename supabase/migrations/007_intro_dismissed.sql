-- Add flag so users can permanently dismiss the intro walkthrough
alter table public.profiles
  add column if not exists has_dismissed_intro boolean not null default false;

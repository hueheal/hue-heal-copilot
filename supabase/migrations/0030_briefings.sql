-- ============================================================================
-- Hue & Heal :: 0030 — briefings
-- A briefing is one message from the founder to every department lead at
-- once. Each lead answers with its own job, so the board shows who has
-- replied and the founder reads one thread. The latest briefing is read
-- into every run that day, so the whole org works from the same page.
-- ============================================================================
create table if not exists public.role_briefings (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brand_id    uuid not null references public.brand_profiles(id) on delete cascade,
  text        text not null,
  source      text not null default 'studio',   -- studio | telegram
  created_at  timestamptz not null default now()
);
create index if not exists role_briefings_idx on public.role_briefings (owner, brand_id, created_at desc);
alter table public.role_briefings enable row level security;
do $$ begin
  create policy "own role_briefings" on public.role_briefings for all using (owner = auth.uid()) with check (owner = auth.uid());
exception when duplicate_object then null; end $$;

alter table public.role_jobs add column if not exists briefing_id uuid references public.role_briefings(id) on delete set null;
create index if not exists role_jobs_briefing_idx on public.role_jobs (briefing_id);

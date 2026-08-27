-- ============================================================================
-- Hue & Heal :: 0026 — role operations (dashboards, cadence, ledger)
-- schedule on roles: {"cadence":"off"|"daily"|"weekdays"|"weekly","task":"…"}
-- kind on role_runs: 'task' (on-demand) | 'scheduled' | 'digest' (weekly)
-- role_items: the ledger a role raises to its controller — tool needs and
--   experiment proposals — with an approval lifecycle.
-- ============================================================================

alter table public.roles add column if not exists schedule jsonb not null default '{"cadence":"off"}'::jsonb;
alter table public.role_runs add column if not exists kind text not null default 'task';

create table if not exists public.role_items (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  role_id     uuid not null references public.roles(id) on delete cascade,
  run_id      uuid references public.role_runs(id) on delete set null,
  kind        text not null,                    -- 'need' | 'experiment'
  title       text not null,
  detail      text not null default '',
  status      text not null default 'open',     -- open | approved | declined | done
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists role_items_role_idx on public.role_items (owner, role_id, status, created_at desc);
alter table public.role_items enable row level security;
do $$ begin
  create policy "own role_items" on public.role_items for all using (owner = auth.uid()) with check (owner = auth.uid());
exception when duplicate_object then null; end $$;

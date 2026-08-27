-- ============================================================================
-- Hue & Heal :: 0025 — roles (persona agents per workspace)
-- roles: the agents a workspace employs (preset or custom): a CMO, an
--   editor-in-chief… each with a charter layered over brand voice + knowledge.
-- role_runs: every deliverable a role produces (structured JSONB), so each
--   role has a desk with history.
-- ============================================================================

create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brand_id    uuid references public.brand_profiles(id) on delete cascade,
  key         text not null default 'custom',  -- 'cmo' | 'editor' | 'social' | 'guardian' | 'custom'
  name        text not null,                   -- "CMO"
  title       text not null default '',        -- "Chief Marketing Officer"
  charter     text not null default '',        -- what this role owns and cares about
  instructions text not null default '',       -- user-added standing instructions
  enabled     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists roles_owner_idx on public.roles (owner, brand_id);
alter table public.roles enable row level security;
do $$ begin
  create policy "own roles" on public.roles for all using (owner = auth.uid()) with check (owner = auth.uid());
exception when duplicate_object then null; end $$;

create table if not exists public.role_runs (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  role_id     uuid not null references public.roles(id) on delete cascade,
  task        text not null,
  output      jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists role_runs_role_idx on public.role_runs (owner, role_id, created_at desc);
alter table public.role_runs enable row level security;
do $$ begin
  create policy "own role_runs" on public.role_runs for all using (owner = auth.uid()) with check (owner = auth.uid());
exception when duplicate_object then null; end $$;

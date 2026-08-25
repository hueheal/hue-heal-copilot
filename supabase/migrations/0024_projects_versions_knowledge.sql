-- ============================================================================
-- Hue & Heal :: 0024 — projects, version history, knowledge (redesign Phase 8+9)
-- 1. projects: the container for related work on one initiative.
-- 2. project_id on every content table (nullable; nothing moves).
-- 3. asset_versions: JSONB snapshots written on save, restorable.
-- 4. brand_profiles.knowledge: structured company context for generation.
-- All owner-scoped RLS, matching the existing tables.
-- ============================================================================

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brand_id    uuid references public.brand_profiles(id) on delete set null,
  name        text not null,
  description text not null default '',
  status      text not null default 'active', -- active | archived
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists projects_owner_idx on public.projects (owner, updated_at desc);
alter table public.projects enable row level security;
do $$ begin
  create policy "own projects" on public.projects for all using (owner = auth.uid()) with check (owner = auth.uid());
exception when duplicate_object then null; end $$;

alter table public.journal_articles add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.newsletters      add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.social_posts     add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.proposals        add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.invoices         add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.client_docs      add column if not exists project_id uuid references public.projects(id) on delete set null;

create table if not exists public.asset_versions (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  asset_table text not null,  -- 'social_posts' | 'journal_articles' | …
  asset_id    uuid not null,
  label       text not null default '',
  snapshot    jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists asset_versions_asset_idx on public.asset_versions (owner, asset_table, asset_id, created_at desc);
alter table public.asset_versions enable row level security;
do $$ begin
  create policy "own asset_versions" on public.asset_versions for all using (owner = auth.uid()) with check (owner = auth.uid());
exception when duplicate_object then null; end $$;

-- Retention: saves are frequent; keep the newest 30 snapshots per asset.
-- (Enforced app-side on write; this is the safety cap for runaway rows.)

alter table public.brand_profiles add column if not exists knowledge jsonb not null default '{}'::jsonb;

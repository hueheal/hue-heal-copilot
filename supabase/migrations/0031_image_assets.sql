-- ============================================================================
-- Hue & Heal :: 0031 — image assets
-- Images a seat generates through a connected tool (Higgsfield first). Each
-- one lands here pending the founder's review, with the prompt that made it
-- and the category and surface it was made for, so provenance is never lost.
-- Files live in the social-assets bucket under <owner>/library/<brand>/.
-- ============================================================================
create table if not exists public.image_assets (
  id            uuid primary key default gen_random_uuid(),
  owner         uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brand_id      uuid not null references public.brand_profiles(id) on delete cascade,
  dept          text,
  role_id       uuid references public.roles(id) on delete set null,
  run_id        uuid references public.role_runs(id) on delete set null,
  job_id        uuid references public.role_jobs(id) on delete set null,
  purpose       text not null default '',
  category      text not null default '',
  surface       text not null default '',
  prompt        text not null,
  aspect_ratio  text not null default '4:5',
  provider      text not null default 'higgsfield',
  request_id    text,
  storage_path  text not null,
  url           text not null,
  status        text not null default 'pending',   -- pending | approved | declined
  note          text,
  created_at    timestamptz not null default now(),
  decided_at    timestamptz
);
create index if not exists image_assets_brand_idx on public.image_assets (owner, brand_id, status, created_at desc);
alter table public.image_assets enable row level security;
do $$ begin
  create policy "own image_assets" on public.image_assets for all using (owner = auth.uid()) with check (owner = auth.uid());
exception when duplicate_object then null; end $$;

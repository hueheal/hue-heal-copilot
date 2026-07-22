-- ============================================================================
-- Hue & Heal — Studio Co-pilot :: Social Copilot schema
-- Run this once against your Supabase project (SQL editor, or `supabase db push`).
-- Everything is row-level-security'd to the authenticated owner (auth.uid()).
-- ============================================================================

-- ---- Enums --------------------------------------------------------------
do $$ begin
  create type post_format as enum ('carousel','story','quote','newsletter','linkedin','report');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sector as enum ('hospitality','food_beverage','health_fitness','education');
exception when duplicate_object then null; end $$;

do $$ begin
  create type accent as enum ('lime','terracotta','copper');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_status as enum ('draft','scheduled','published');
exception when duplicate_object then null; end $$;

-- ---- Brand kits ---------------------------------------------------------
-- One row per brand the studio manages (Hue & Heal itself, and clients later).
-- `tokens` holds the design-system values the copilot must stay on-brand with.
create table if not exists public.brand_kits (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name       text not null,
  tokens     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---- Social posts -------------------------------------------------------
create table if not exists public.social_posts (
  id            uuid primary key default gen_random_uuid(),
  owner         uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brand_kit_id  uuid references public.brand_kits(id) on delete set null,
  topic         text not null,
  format        post_format not null default 'carousel',
  sector        sector not null default 'hospitality',
  accent        accent not null default 'lime',
  status        post_status not null default 'draft',
  scheduled_for timestamptz,
  headline      text,
  caption       text,
  hashtags      text[] not null default '{}',
  slides        jsonb  not null default '[]'::jsonb,
  image_url     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists social_posts_owner_idx on public.social_posts (owner, created_at desc);
create index if not exists social_posts_status_idx on public.social_posts (owner, status, scheduled_for);

-- ---- Post assets (generated images, stored in the `social-assets` bucket) --
create table if not exists public.post_assets (
  id           uuid primary key default gen_random_uuid(),
  owner        uuid not null references auth.users(id) on delete cascade default auth.uid(),
  post_id      uuid not null references public.social_posts(id) on delete cascade,
  kind         text not null default 'background',
  storage_path text not null,
  created_at   timestamptz not null default now()
);

-- ---- updated_at trigger -------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists social_posts_touch on public.social_posts;
create trigger social_posts_touch before update on public.social_posts
  for each row execute function public.touch_updated_at();

-- ---- Row level security -------------------------------------------------
alter table public.brand_kits  enable row level security;
alter table public.social_posts enable row level security;
alter table public.post_assets enable row level security;

do $$ begin
  create policy "own brand_kits"  on public.brand_kits  for all using (owner = auth.uid()) with check (owner = auth.uid());
  create policy "own social_posts" on public.social_posts for all using (owner = auth.uid()) with check (owner = auth.uid());
  create policy "own post_assets"  on public.post_assets  for all using (owner = auth.uid()) with check (owner = auth.uid());
exception when duplicate_object then null; end $$;

-- ---- Storage bucket for generated assets --------------------------------
insert into storage.buckets (id, name, public)
  values ('social-assets','social-assets', true)
  on conflict (id) do nothing;

do $$ begin
  create policy "owner writes social-assets" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'social-assets' and (storage.foldername(name))[1] = auth.uid()::text);
  create policy "owner updates social-assets" on storage.objects
    for update to authenticated
    using (bucket_id = 'social-assets' and (storage.foldername(name))[1] = auth.uid()::text);
  create policy "public reads social-assets" on storage.objects
    for select using (bucket_id = 'social-assets');
exception when duplicate_object then null; end $$;

-- ---- Seed the Hue & Heal brand kit for each new user --------------------
-- Fires when a user signs up, so the copilot always has the house brand to work from.
create or replace function public.seed_hue_heal_brand()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.brand_kits (owner, name, tokens) values (
    new.id,
    'Hue & Heal',
    jsonb_build_object(
      'palette', jsonb_build_object(
        'anthracite','#1E1B18','copper','#B5632F','ember','#CE8A53',
        'monterey','#ECE6DA','bone','#F5F1E8','mushroom','#C6B7A2',
        'lime','#D2DC4E','terracotta','#9A4A26'
      ),
      'fonts', jsonb_build_object('serif','Fraunces','sans','Poppins','voice','Instrument Serif'),
      'tagline','Designing the future of wellness',
      'voice','Warm, editorial, grounded. Wellness experience design across hospitality, F&B, health & fitness and education.'
    )
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created_seed_brand on auth.users;
create trigger on_auth_user_created_seed_brand
  after insert on auth.users
  for each row execute function public.seed_hue_heal_brand();

-- ============================================================================
-- Hue & Heal — Studio Co-pilot :: migration 0005
-- Brand profiles: each brand (Hue & Heal, Remedae, a client) carries its
-- verbal identity (tone of voice + writing guidelines) and its visual identity
-- (image master prompt + negatives). Both the image generator and the
-- newsletter/copy writers read from the selected brand.
-- Run in Supabase → SQL Editor.
-- ============================================================================

create table if not exists public.brand_profiles (
  id                  uuid primary key default gen_random_uuid(),
  owner               uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name                text not null,
  -- verbal identity
  tone_of_voice       text not null default '',
  writing_guidelines  text not null default '',
  -- visual identity (image generation)
  image_master_prompt text not null default '',
  image_negatives     text not null default '',
  is_default          boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.brand_profiles enable row level security;

drop policy if exists "brand_profiles owner" on public.brand_profiles;
create policy "brand_profiles owner" on public.brand_profiles
  for all using (owner = auth.uid()) with check (owner = auth.uid());

create index if not exists brand_profiles_owner_idx on public.brand_profiles (owner, created_at desc);

drop trigger if exists brand_profiles_touch on public.brand_profiles;
create trigger brand_profiles_touch before update on public.brand_profiles
  for each row execute function public.touch_updated_at();

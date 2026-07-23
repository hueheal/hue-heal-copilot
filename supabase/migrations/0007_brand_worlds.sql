-- ============================================================================
-- Hue & Heal — Studio Co-pilot :: migration 0007  (BRAND WORLDS)
-- Turns brands into full workspaces: every record is scoped to a brand, brands
-- have members, and access is widened so brand members see the brand's data.
-- Self-contained: safe to run whether or not 0005 was run. Additive — the only
-- deletion is the auto-generated sample rows (owned by accounts other than the
-- studio owner). Run in Supabase → SQL Editor.
-- ============================================================================

-- 1. Brand profiles (create if absent; add the new visual-identity columns) ----
create table if not exists public.brand_profiles (
  id                  uuid primary key default gen_random_uuid(),
  owner               uuid,
  name                text not null,
  tone_of_voice       text not null default '',
  writing_guidelines  text not null default '',
  image_master_prompt text not null default '',
  image_negatives     text not null default '',
  is_default          boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.brand_profiles add column if not exists created_by   uuid;
alter table public.brand_profiles add column if not exists accent_color text not null default '#B5632F';
alter table public.brand_profiles add column if not exists logo_url     text;
alter table public.brand_profiles add column if not exists display_font text not null default 'poppins'; -- 'ivyora' | 'poppins'
alter table public.brand_profiles enable row level security;

drop trigger if exists brand_profiles_touch on public.brand_profiles;
create trigger brand_profiles_touch before update on public.brand_profiles
  for each row execute function public.touch_updated_at();

-- 2. Brand membership ---------------------------------------------------------
create table if not exists public.brand_members (
  id         uuid primary key default gen_random_uuid(),
  brand_id   uuid not null references public.brand_profiles(id) on delete cascade,
  user_id    uuid,
  email      text not null,
  role       text not null default 'member',   -- 'owner' | 'admin' | 'member'
  created_at timestamptz not null default now(),
  unique (brand_id, email)
);
alter table public.brand_members enable row level security;

-- SECURITY DEFINER so the check bypasses RLS internally (no policy recursion).
create or replace function public.is_brand_member(bid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.brand_members bm
    where bm.brand_id = bid
      and lower(bm.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 3. brand_id on every data table (nullable — app populates it) ---------------
alter table public.clients       add column if not exists brand_id uuid references public.brand_profiles(id) on delete cascade;
alter table public.proposals     add column if not exists brand_id uuid references public.brand_profiles(id) on delete cascade;
alter table public.invoices      add column if not exists brand_id uuid references public.brand_profiles(id) on delete cascade;
alter table public.social_posts  add column if not exists brand_id uuid references public.brand_profiles(id) on delete cascade;
alter table public.content_ideas add column if not exists brand_id uuid references public.brand_profiles(id) on delete cascade;
alter table public.newsletters   add column if not exists brand_id uuid references public.brand_profiles(id) on delete cascade;
alter table public.subscribers   add column if not exists brand_id uuid references public.brand_profiles(id) on delete cascade;

-- 4. RLS — brand profiles & members ------------------------------------------
drop policy if exists "brand_profiles owner"  on public.brand_profiles;
drop policy if exists "brand_profiles access" on public.brand_profiles;
create policy "brand_profiles access" on public.brand_profiles
  for all using (created_by = auth.uid() or public.is_brand_member(id))
  with check (created_by = auth.uid() or public.is_brand_member(id));

drop policy if exists "brand_members access" on public.brand_members;
create policy "brand_members access" on public.brand_members
  for all using (public.is_brand_member(brand_id) or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  with check (public.is_brand_member(brand_id));

-- 5. Widen data-table RLS: brand members gain access (additive to owner rules)-
do $$
declare t text;
begin
  foreach t in array array['clients','proposals','invoices','social_posts','content_ideas','newsletters','subscribers']
  loop
    execute format('drop policy if exists %I on public.%I', 'brand member access', t);
    execute format(
      'create policy %I on public.%I for all using (brand_id is null or public.is_brand_member(brand_id)) with check (brand_id is null or public.is_brand_member(brand_id))',
      'brand member access', t);
  end loop;
end $$;

-- 6. Seed the studio's worlds + migrate existing data -------------------------
do $$
declare
  owner_uid uuid;
  hh_id uuid;
  t text;
begin
  select id into owner_uid from auth.users where lower(email) = 'hello@hueandheal.com' limit 1;

  -- Hue & Heal (parent — Ivy Ora headlines). Reuse an existing one if present.
  select id into hh_id from public.brand_profiles where name = 'Hue & Heal' limit 1;
  if hh_id is null then
    insert into public.brand_profiles (name, is_default, display_font, accent_color, created_by, owner)
    values ('Hue & Heal', true, 'ivyora', '#B5632F', owner_uid, owner_uid)
    returning id into hh_id;
  else
    update public.brand_profiles set display_font = 'ivyora', is_default = true, created_by = coalesce(created_by, owner_uid) where id = hh_id;
  end if;

  -- Remedae (empty white-label world — Poppins).
  if not exists (select 1 from public.brand_profiles where name = 'Remedae') then
    insert into public.brand_profiles (name, display_font, accent_color, created_by, owner)
    values ('Remedae', 'poppins', '#3E5C4B', owner_uid, owner_uid);
  end if;

  -- Owner memberships.
  if owner_uid is not null then
    insert into public.brand_members (brand_id, user_id, email, role)
    select p.id, owner_uid, 'hello@hueandheal.com', 'owner' from public.brand_profiles p
    on conflict (brand_id, email) do nothing;

    -- Move the studio owner's real records into Hue & Heal.
    foreach t in array array['clients','proposals','invoices','social_posts','content_ideas','newsletters','subscribers']
    loop
      execute format('update public.%I set brand_id = %L where owner = %L and brand_id is null', t, hh_id, owner_uid);
      -- Drop sample rows created under other accounts.
      execute format('delete from public.%I where owner is not null and owner <> %L', t, owner_uid);
    end loop;
  end if;
end $$;

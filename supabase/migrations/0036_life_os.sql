-- ============================================================================
-- Hue & Heal :: 0036 — Copilot V2, the life OS
-- The founder's life sits above the businesses: mission, focus, milestones,
-- tasks, pipeline, calendar and the assistant's conversation. Everything is
-- owned by the signed-in user; brand_id is optional (null = life, not a
-- business). See docs/copilot-v2-life-os.md.
-- ============================================================================

create table if not exists public.life_profile (
  owner           uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  display_name    text not null default '',
  mission         text not null default '',
  purpose         text not null default '',
  values_list     text[] not null default '{}',
  focus_areas     jsonb not null default '[]',        -- [{ name, why }]
  weekly_focus    text not null default '',
  tender_keywords text[] not null default '{}',
  calendar_ics    text not null default '',           -- published Outlook/Google ICS link
  voice_replies   boolean not null default false,
  updated_at      timestamptz not null default now()
);

create table if not exists public.life_milestones (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brand_id    uuid references public.brand_profiles(id) on delete set null,
  title       text not null,
  detail      text not null default '',
  horizon     text not null default 'quarter',       -- week | quarter | year | someday
  due         date,
  status      text not null default 'planned',       -- planned | active | done | dropped
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.life_tasks (
  id            uuid primary key default gen_random_uuid(),
  owner         uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brand_id      uuid references public.brand_profiles(id) on delete set null,
  title         text not null,
  due           date,
  status        text not null default 'open',        -- open | done
  is_now        boolean not null default false,       -- the one thing to do first
  milestone_id  uuid references public.life_milestones(id) on delete set null,
  pipeline_id   uuid,
  source        text not null default 'manual',      -- manual | chat | voice
  created_at    timestamptz not null default now(),
  done_at       timestamptz
);

create table if not exists public.life_pipeline (
  id             uuid primary key default gen_random_uuid(),
  owner          uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brand_id       uuid references public.brand_profiles(id) on delete set null,
  kind           text not null default 'lead',       -- lead | deal | partnership | tender
  title          text not null,
  org            text not null default '',
  contact_name   text not null default '',
  contact_email  text not null default '',
  value_pence    bigint,
  stage          text not null default 'new',        -- new | contacted | meeting | proposal | won | lost | dismissed
  next_step      text not null default '',
  next_due       date,
  deadline       timestamptz,
  url            text not null default '',
  notes          text not null default '',
  source         text not null default 'manual',     -- manual | chat | tender_radar
  source_ref     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
-- Full (not partial) so upserts can target it; null refs never collide.
create unique index if not exists life_pipeline_ref_uq on public.life_pipeline (owner, source, source_ref);

create table if not exists public.life_events (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brand_id    uuid references public.brand_profiles(id) on delete set null,
  title       text not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  all_day     boolean not null default false,
  location    text not null default '',
  notes       text not null default '',
  source      text not null default 'manual',        -- manual | chat | ics
  ext_id      text,
  created_at  timestamptz not null default now()
);
create unique index if not exists life_events_ext_uq on public.life_events (owner, source, ext_id);
create index if not exists life_events_time_idx on public.life_events (owner, starts_at);

create table if not exists public.life_messages (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  role        text not null,                          -- user | assistant
  text        text not null default '',
  via         text not null default 'chat',           -- chat | voice
  actions     jsonb not null default '[]',            -- what the assistant did: [{ kind, summary, ref }]
  created_at  timestamptz not null default now()
);
create index if not exists life_messages_time_idx on public.life_messages (owner, created_at desc);

-- Anything that leaves the building waits here for the founder's yes.
create table if not exists public.life_actions (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brand_id    uuid references public.brand_profiles(id) on delete set null,
  kind        text not null,                          -- email | booking
  summary     text not null default '',
  payload     jsonb not null default '{}',            -- email: { to, subject, body, from }; booking: { what, when, where, notes }
  status      text not null default 'pending',        -- pending | approved | sent | declined | failed
  result      text,
  message_id  uuid references public.life_messages(id) on delete set null,
  created_at  timestamptz not null default now(),
  decided_at  timestamptz
);

do $$
declare t text;
begin
  foreach t in array array['life_profile','life_milestones','life_tasks','life_pipeline','life_events','life_messages','life_actions'] loop
    execute format('alter table public.%I enable row level security', t);
    begin
      execute format('create policy "own %s" on public.%I for all using (owner = auth.uid()) with check (owner = auth.uid())', t, t);
    exception when duplicate_object then null; end;
  end loop;
end $$;

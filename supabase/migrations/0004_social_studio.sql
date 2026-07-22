-- ============================================================================
-- Hue & Heal — Studio Co-pilot :: Social Studio + Newsletter
-- Adds: idea backlog, Instagram format/design fields, newsletters, subscribers.
-- Run once in the SQL editor. Depends on migrations 0001–0003.
-- ============================================================================

-- ---- New Instagram post formats (top-level; ADD VALUE can't run in a DO block) ----
alter type post_format add value if not exists 'square';
alter type post_format add value if not exists 'portrait';

-- ---- social_posts: platform + editable design state ----
alter table public.social_posts add column if not exists platform text not null default 'instagram';
alter table public.social_posts add column if not exists design jsonb not null default '{}'::jsonb;

-- ---- Idea backlog ----
create table if not exists public.content_ideas (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  theme      text not null default '',
  hook       text not null,
  angle      text not null default '',
  format     post_format,
  platform   text not null default 'instagram',
  status     text not null default 'backlog',   -- backlog | used | dismissed
  created_at timestamptz not null default now()
);
create index if not exists content_ideas_owner_idx on public.content_ideas (owner, created_at desc);

-- ---- Newsletters ----
create table if not exists public.newsletters (
  id               uuid primary key default gen_random_uuid(),
  owner            uuid not null references auth.users(id) on delete cascade default auth.uid(),
  subject          text not null default '',
  preheader        text not null default '',
  template         text not null default 'journal',
  blocks           jsonb not null default '[]'::jsonb,
  status           text not null default 'draft',  -- draft | sent
  sent_at          timestamptz,
  recipients_count integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists newsletters_owner_idx on public.newsletters (owner, created_at desc);

-- ---- Subscribers (in-app list) ----
create table if not exists public.subscribers (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  email      text not null,
  name       text not null default '',
  status     text not null default 'subscribed',  -- subscribed | unsubscribed
  created_at timestamptz not null default now(),
  unique (owner, email)
);
create index if not exists subscribers_owner_idx on public.subscribers (owner, created_at desc);

-- ---- updated_at trigger for newsletters ----
drop trigger if exists newsletters_touch on public.newsletters;
create trigger newsletters_touch before update on public.newsletters
  for each row execute function public.touch_updated_at();

-- ---- Row level security ----
alter table public.content_ideas enable row level security;
alter table public.newsletters   enable row level security;
alter table public.subscribers   enable row level security;

do $$ begin
  create policy "own content_ideas" on public.content_ideas for all using (owner = auth.uid()) with check (owner = auth.uid());
  create policy "own newsletters"   on public.newsletters   for all using (owner = auth.uid()) with check (owner = auth.uid());
  create policy "own subscribers"   on public.subscribers   for all using (owner = auth.uid()) with check (owner = auth.uid());
exception when duplicate_object then null; end $$;

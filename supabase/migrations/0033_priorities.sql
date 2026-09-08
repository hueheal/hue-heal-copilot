-- ============================================================================
-- Hue & Heal :: 0033 — the founder's priorities
-- One ordered list per workspace, owned by the founder. Shown at the top of
-- Home and Team, and read into every seat's run so the whole org works to
-- the same order. A priority can be handed to a department, marked done, or
-- parked with a reason.
-- ============================================================================
create table if not exists public.priorities (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brand_id    uuid not null references public.brand_profiles(id) on delete cascade,
  position    integer not null default 0,
  title       text not null,
  detail      text not null default '',
  dept        text,                                   -- owning department key, optional
  status      text not null default 'active',        -- active | done | parked
  note        text,                                   -- why parked, or what closed it
  due         date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  decided_at  timestamptz
);
create index if not exists priorities_brand_idx on public.priorities (owner, brand_id, status, position);
alter table public.priorities enable row level security;
do $$ begin
  create policy "own priorities" on public.priorities for all using (owner = auth.uid()) with check (owner = auth.uid());
exception when duplicate_object then null; end $$;

-- ============================================================================
-- Hue & Heal :: 0027 — org coordination + channels
--
-- Three things:
--   1. role_notes — handoffs between roles inside ONE workspace. A role that
--      needs something owned by another role writes to them instead of
--      overruling them; the note lands in the recipient's inbox and is read
--      into its next run.
--   2. brand_id on role_runs / role_items — defence in depth so a role's
--      history and ledger are scoped to a brand world, not just to a role,
--      and cross-role reads can filter by workspace directly.
--   3. org_channels — a linked messaging channel (Telegram) per workspace,
--      so the founder can talk to the org from their phone. Paired with a
--      one-time code; a chat is only ever bound to one owner + brand.
-- ============================================================================

/* ---- 1. Handoffs ------------------------------------------------------- */
create table if not exists public.role_notes (
  id           uuid primary key default gen_random_uuid(),
  owner        uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brand_id     uuid references public.brand_profiles(id) on delete cascade,
  from_role_id uuid not null references public.roles(id) on delete cascade,
  to_role_id   uuid references public.roles(id) on delete cascade,  -- null = addressed to a seat that isn't filled
  to_name      text not null default '',
  run_id       uuid references public.role_runs(id) on delete set null,
  subject      text not null,
  body         text not null default '',
  status       text not null default 'open',   -- open | acknowledged
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists role_notes_to_idx on public.role_notes (owner, to_role_id, status, created_at desc);
create index if not exists role_notes_from_idx on public.role_notes (owner, from_role_id, created_at desc);
alter table public.role_notes enable row level security;
do $$ begin
  create policy "own role_notes" on public.role_notes for all using (owner = auth.uid()) with check (owner = auth.uid());
exception when duplicate_object then null; end $$;

/* ---- 2. Workspace scoping on run history + ledger ---------------------- */
alter table public.role_runs  add column if not exists brand_id uuid references public.brand_profiles(id) on delete cascade;
alter table public.role_items add column if not exists brand_id uuid references public.brand_profiles(id) on delete cascade;

update public.role_runs  r set brand_id = ro.brand_id from public.roles ro where ro.id = r.role_id  and r.brand_id is null;
update public.role_items i set brand_id = ro.brand_id from public.roles ro where ro.id = i.role_id and i.brand_id is null;

create index if not exists role_runs_brand_idx  on public.role_runs  (owner, brand_id, created_at desc);
create index if not exists role_items_brand_idx on public.role_items (owner, brand_id, status, created_at desc);

-- A role with no brand world would read across every workspace. Once every
-- existing row is tagged, make that impossible.
do $$ begin
  if not exists (select 1 from public.roles where brand_id is null) then
    alter table public.roles alter column brand_id set not null;
  end if;
end $$;

/* ---- 3. Messaging channels -------------------------------------------- */
create table if not exists public.org_channels (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brand_id    uuid references public.brand_profiles(id) on delete cascade,
  provider    text not null default 'telegram',
  chat_id     text,                              -- set when the pairing completes
  chat_label  text not null default '',          -- who linked it, for display
  pair_code   text,                              -- one-time code, cleared on pair
  paired_at   timestamptz,
  push        boolean not null default true,     -- send scheduled deliverables + digests here
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists org_channels_chat_idx on public.org_channels (provider, chat_id) where chat_id is not null;
create unique index if not exists org_channels_code_idx on public.org_channels (pair_code) where pair_code is not null;
create index if not exists org_channels_owner_idx on public.org_channels (owner, brand_id);
alter table public.org_channels enable row level security;
do $$ begin
  create policy "own org_channels" on public.org_channels for all using (owner = auth.uid()) with check (owner = auth.uid());
exception when duplicate_object then null; end $$;

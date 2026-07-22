-- ============================================================================
-- Hue & Heal — Studio Co-pilot :: Clients + Proposals + Invoices (studio ops)
-- Run once in the Supabase SQL editor. RLS-scoped to the authenticated owner.
-- Depends on migration 0001 (reuses public.touch_updated_at()).
-- ============================================================================

-- ---- Enums --------------------------------------------------------------
do $$ begin
  create type client_stage as enum ('lead','proposal','active','delivered');
exception when duplicate_object then null; end $$;

do $$ begin
  create type proposal_status as enum ('draft','sent','viewed','accepted','declined');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_status as enum ('draft','sent','paid','overdue');
exception when duplicate_object then null; end $$;

-- ---- Clients ------------------------------------------------------------
-- `value_gbp` is the engagement value in whole pounds (null for un-priced leads).
create table if not exists public.clients (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name       text not null,
  sector     text not null default '',
  stage      client_stage not null default 'lead',
  value_gbp  integer,
  note       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists clients_owner_idx on public.clients (owner, stage, created_at desc);

-- ---- Proposals ----------------------------------------------------------
create table if not exists public.proposals (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id  uuid references public.clients(id) on delete set null,
  client_name text not null default '',
  title      text not null,
  amount_gbp integer not null default 0,
  status     proposal_status not null default 'draft',
  phases     jsonb not null default '[]'::jsonb,
  sent_at    timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists proposals_owner_idx on public.proposals (owner, created_at desc);

-- ---- Invoices -----------------------------------------------------------
create table if not exists public.invoices (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id   uuid references public.clients(id) on delete set null,
  proposal_id uuid references public.proposals(id) on delete set null,
  client_name text not null default '',
  title       text not null,
  amount_gbp  integer not null default 0,
  status      invoice_status not null default 'draft',
  due_date    date,
  issued_at   date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists invoices_owner_idx on public.invoices (owner, created_at desc);

-- ---- updated_at triggers (reuse the fn from migration 0001) -------------
drop trigger if exists clients_touch on public.clients;
create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();

drop trigger if exists proposals_touch on public.proposals;
create trigger proposals_touch before update on public.proposals
  for each row execute function public.touch_updated_at();

drop trigger if exists invoices_touch on public.invoices;
create trigger invoices_touch before update on public.invoices
  for each row execute function public.touch_updated_at();

-- ---- Row level security -------------------------------------------------
alter table public.clients   enable row level security;
alter table public.proposals enable row level security;
alter table public.invoices  enable row level security;

do $$ begin
  create policy "own clients"   on public.clients   for all using (owner = auth.uid()) with check (owner = auth.uid());
  create policy "own proposals" on public.proposals for all using (owner = auth.uid()) with check (owner = auth.uid());
  create policy "own invoices"  on public.invoices  for all using (owner = auth.uid()) with check (owner = auth.uid());
exception when duplicate_object then null; end $$;

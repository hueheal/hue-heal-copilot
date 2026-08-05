-- ============================================================================
-- Hue & Heal :: migration 0015
-- Client rooms: per-client documents (contracts, onboarding, brand guidelines,
-- sprint showcases, research, discovery and other design docs) plus the client
-- portal plumbing — a per-client share token, and share flags so only what you
-- explicitly share appears in the client-facing space.
-- Run in Supabase -> SQL editor.
-- ============================================================================

-- Portal space token (private link) per client.
alter table public.clients
  add column if not exists share_token uuid not null default gen_random_uuid();

-- Share flags: proposals and invoices can be shared into the space too.
alter table public.proposals add column if not exists shared boolean not null default false;
alter table public.invoices  add column if not exists shared boolean not null default false;

-- Client documents. Content docs use blocks; form docs (onboarding, discovery)
-- use form steps and collect responses from the portal.
create table if not exists public.client_docs (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brand_id   uuid references public.brand_profiles(id) on delete cascade,
  client_id  uuid not null references public.clients(id) on delete cascade,
  kind       text not null default 'note',
  title      text not null default '',
  dek        text not null default '',
  blocks     jsonb not null default '[]'::jsonb,
  form       jsonb not null default '[]'::jsonb,
  responses  jsonb not null default '[]'::jsonb,
  is_form    boolean not null default false,
  shared     boolean not null default false,
  status     text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_docs_client_idx on public.client_docs (client_id, created_at desc);
create index if not exists client_docs_owner_idx  on public.client_docs (owner, created_at desc);

alter table public.client_docs enable row level security;

do $$ begin
  create policy "client_docs access" on public.client_docs
    for all using (owner = auth.uid() or public.is_brand_member(brand_id))
    with check (owner = auth.uid() or public.is_brand_member(brand_id));
exception when duplicate_object then null; end $$;

drop trigger if exists client_docs_touch on public.client_docs;
create trigger client_docs_touch before update on public.client_docs
  for each row execute function public.touch_updated_at();

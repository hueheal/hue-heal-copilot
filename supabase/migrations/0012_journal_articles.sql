-- ============================================================================
-- Hue & Heal :: migration 0012
-- Long-form Journal articles written by the copilot, ready to publish to the
-- new website's Journal section. Body is stored as markdown; takeaways as an
-- array so the site can render them as a distinct block.
-- Run in Supabase -> SQL editor.
-- ============================================================================

create table if not exists public.journal_articles (
  id           uuid primary key default gen_random_uuid(),
  owner        uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brand_id     uuid references public.brand_profiles(id) on delete cascade,
  title        text not null default '',
  dek          text not null default '',
  reading_time text not null default '',
  body_md      text not null default '',
  takeaways    text[] not null default '{}',
  slug         text not null default '',
  status       text not null default 'draft',  -- draft | published
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists journal_articles_owner_idx on public.journal_articles (owner, created_at desc);
create index if not exists journal_articles_brand_idx on public.journal_articles (brand_id, created_at desc);

alter table public.journal_articles enable row level security;

do $$ begin
  create policy "journal access" on public.journal_articles
    for all using (owner = auth.uid() or public.is_brand_member(brand_id))
    with check (owner = auth.uid() or public.is_brand_member(brand_id));
exception when duplicate_object then null; end $$;

drop trigger if exists journal_articles_touch on public.journal_articles;
create trigger journal_articles_touch before update on public.journal_articles
  for each row execute function public.touch_updated_at();

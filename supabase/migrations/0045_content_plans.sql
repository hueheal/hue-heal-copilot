-- ============================================================================
-- Hue & Heal :: 0045 — the weekly content plan
-- Friday is planning day: the Friday digest proposes next week's posts,
-- journal pieces and newsletters for each company, weighing what is trending
-- and what the research found against each brand's social strategy. The
-- founder shapes it in Copilot (/v2/week): keeps, drops, edits, adds notes,
-- asks for a rework, approves. Monday is action mode: the plan is the week's
-- brief, each day's digest posts follow it, and the journal and newsletter
-- items become dated tasks. A plan not approved by Monday morning is taken
-- as proposed (auto_approved), and Monday's digest says so.
--
-- items: [{ id, day, company, channel (instagram|journal|newsletter), format,
--           topic, angle, why_now, pillar, sources: [{ title, url }], keep }]
-- ============================================================================
create table if not exists public.content_plans (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  status text not null default 'proposed' check (status in ('proposed', 'approved')),
  summary text,
  items jsonb not null default '[]'::jsonb,
  input text,
  auto_approved boolean not null default false,
  digest_id uuid references public.founder_digests(id) on delete set null,
  usage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  unique (owner, week_start)
);
alter table public.content_plans enable row level security;
drop policy if exists "own content_plans" on public.content_plans;
create policy "own content_plans" on public.content_plans for all using (owner = auth.uid()) with check (owner = auth.uid());

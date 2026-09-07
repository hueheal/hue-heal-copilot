-- ============================================================================
-- Hue & Heal :: 0029 — departments
-- The org grows from a flat list of roles into departments. Each department
-- has one lead (the seat the founder talks to) and members the lead briefs.
-- Seats are defined in org/**/*.md; this migration only adds what the
-- database must know: which department a role sits in, whether it is the
-- lead, and the per-workspace state a department accumulates (its playbook,
-- its budget, the tools it has been granted).
--
-- Jobs learn two things: the department they belong to, and whether the
-- deliverable needs the founder's approval before anything leaves the
-- building. Runs learn what they cost.
-- ============================================================================

alter table public.roles add column if not exists dept text;
alter table public.roles add column if not exists seat text not null default 'lead';  -- lead | member

-- Existing hires move into Growth: the old CMO becomes the Head of Growth,
-- the Editor and Social strategist report to it, the Brand guardian's remit
-- folds into the Editor and its seat is retired.
update public.roles set key = 'growth', name = 'Head of Growth', title = 'Sales and marketing lead', dept = 'growth', seat = 'lead' where key = 'cmo';
update public.roles set dept = 'growth', seat = 'member' where key in ('editor', 'social');
delete from public.roles where key = 'guardian';
update public.roles set dept = 'growth', seat = 'lead' where dept is null and key = 'custom';

create index if not exists roles_dept_idx on public.roles (owner, brand_id, dept, seat);

-- Per-workspace department state. One row per (owner, brand, dept).
create table if not exists public.dept_state (
  id            uuid primary key default gen_random_uuid(),
  owner         uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brand_id      uuid not null references public.brand_profiles(id) on delete cascade,
  dept          text not null,
  playbook      text not null default '',
  playbook_updated_at timestamptz,
  budget_pence  integer not null default 5000,          -- a light monthly budget, £50
  tools         jsonb not null default '[]'::jsonb,     -- granted tool keys
  updated_at    timestamptz not null default now(),
  unique (owner, brand_id, dept)
);
alter table public.dept_state enable row level security;
do $$ begin
  create policy "own dept_state" on public.dept_state for all using (owner = auth.uid()) with check (owner = auth.uid());
exception when duplicate_object then null; end $$;

-- What a run cost, so budgets mean something.
alter table public.role_runs add column if not exists job_id uuid;
alter table public.role_runs add column if not exists tokens_in integer not null default 0;
alter table public.role_runs add column if not exists tokens_out integer not null default 0;
alter table public.role_runs add column if not exists cost_pence numeric(10,2) not null default 0;
create index if not exists role_runs_brand_month_idx on public.role_runs (owner, brand_id, created_at desc);

-- Jobs: department, approval gate, the delegation plan, and cost.
alter table public.role_jobs add column if not exists dept text;
alter table public.role_jobs add column if not exists approval text not null default 'none';  -- none | pending | approved | declined
alter table public.role_jobs add column if not exists decided_at timestamptz;
alter table public.role_jobs add column if not exists plan jsonb;
alter table public.role_jobs add column if not exists cost_pence numeric(10,2) not null default 0;
update public.role_jobs j set dept = r.dept from public.roles r where r.id = j.role_id and j.dept is null;
create index if not exists role_jobs_dept_idx on public.role_jobs (owner, brand_id, dept, created_at desc);

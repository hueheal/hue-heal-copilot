-- ============================================================================
-- Hue & Heal :: 0028 — role jobs
-- A job is a task handed to a role. Assigning one returns immediately: the
-- row is the receipt, the work happens server side, and the studio watches the
-- row rather than holding a request open. Every run a role does gets a job,
-- whoever asked for it (the studio, the phone, or its own schedule), so the
-- controller has one place to see what is in progress and what is waiting to
-- be reviewed.
--
--   queued  -> the work is claimed but not started
--   running -> a worker has it
--   done    -> deliverable written; sits in "to review" until you read it
--   failed  -> error kept on the row so it can be retried or explained
-- ============================================================================

create table if not exists public.role_jobs (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brand_id    uuid references public.brand_profiles(id) on delete cascade,
  role_id     uuid not null references public.roles(id) on delete cascade,
  task        text not null,
  source      text not null default 'studio',    -- studio | telegram | schedule
  status      text not null default 'queued',    -- queued | running | done | failed
  run_id      uuid references public.role_runs(id) on delete set null,
  error       text,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz
);
create index if not exists role_jobs_role_idx on public.role_jobs (owner, role_id, created_at desc);
create index if not exists role_jobs_open_idx on public.role_jobs (status, created_at) where status in ('queued', 'running');
alter table public.role_jobs enable row level security;
do $$ begin
  create policy "own role_jobs" on public.role_jobs for all using (owner = auth.uid()) with check (owner = auth.uid());
exception when duplicate_object then null; end $$;

-- Safety net: the studio kicks the worker off itself, so a job normally starts
-- within a second. This sweep catches anything left behind (a closed laptop, a
-- dropped request) within the minute. The command is derived from the existing
-- daily cron so the shared secret stays in the database and is never written
-- into a migration.
do $$
declare cmd text;
begin
  select command into cmd from cron.job where jobname = 'daily-posts-8am';
  if cmd is null then
    raise notice 'daily-posts-8am cron not found: schedule role-jobs-sweep by hand';
  else
    perform cron.unschedule('role-jobs-sweep') where exists (select 1 from cron.job where jobname = 'role-jobs-sweep');
    perform cron.schedule('role-jobs-sweep', '* * * * *', replace(cmd, '/daily-posts', '/role-worker'));
  end if;
end $$;

-- Work handed out from a priority stays linked to it, so the priority's
-- detail view shows what has been done against it.
alter table public.role_jobs add column if not exists priority_id uuid references public.priorities(id) on delete set null;
create index if not exists role_jobs_priority_idx on public.role_jobs (priority_id, created_at desc);

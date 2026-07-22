-- ============================================================================
-- Hue & Heal — Studio Co-pilot :: migration 0006
-- Product-level access approval. Signing in with a magic link is no longer
-- enough — the email must be an APPROVED member. Admins manage the list in-app.
-- Run in Supabase → SQL Editor.  EDIT THE SEED EMAILS at the bottom first.
-- ============================================================================

create table if not exists public.app_members (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  role        text not null default 'member',   -- 'admin' | 'member'
  status      text not null default 'approved',  -- 'approved' | 'pending'
  created_at  timestamptz not null default now()
);

alter table public.app_members enable row level security;

-- SECURITY DEFINER helpers bypass RLS *inside* the check, avoiding policy
-- recursion (a policy on app_members that itself queries app_members).
create or replace function public.is_app_member()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.app_members m
    where lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', '')) and m.status = 'approved'
  );
$$;

create or replace function public.is_app_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.app_members m
    where lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and m.status = 'approved' and m.role = 'admin'
  );
$$;

-- Approved members can read the roster; only admins can change it.
drop policy if exists "app_members read"   on public.app_members;
drop policy if exists "app_members insert" on public.app_members;
drop policy if exists "app_members update" on public.app_members;
drop policy if exists "app_members delete" on public.app_members;
create policy "app_members read"   on public.app_members for select using (public.is_app_member());
create policy "app_members insert" on public.app_members for insert with check (public.is_app_admin());
create policy "app_members update" on public.app_members for update using (public.is_app_admin());
create policy "app_members delete" on public.app_members for delete using (public.is_app_admin());

-- Seed the studio's admins so you are never locked out. EDIT / ADD your emails.
insert into public.app_members (email, role, status) values
  ('mariavaliji@gmail.com', 'admin', 'approved'),
  ('maria@hueandheal.com',  'admin', 'approved'),
  ('hello@hueandheal.com',  'admin', 'approved')
on conflict (email) do nothing;

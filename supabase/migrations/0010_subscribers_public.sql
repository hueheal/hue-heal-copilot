-- ============================================================================
-- Hue & Heal — Studio Co-pilot :: migration 0010
-- Self-serve subscribe support: segment subscribers into groups, and give each
-- a stable token for one-click unsubscribe links in newsletters.
-- Run in Supabase → SQL Editor.
-- ============================================================================

alter table public.subscribers
  add column if not exists groups     text[] not null default '{}',
  add column if not exists unsub_token uuid   not null default gen_random_uuid();

-- ============================================================================
-- Hue & Heal :: migration 0016
-- Client documents belong to a design phase (Engage, Research, Discovery,
-- Design, Deliver) and carry a format: 1920x1080 deck, A4 portrait document,
-- or step-by-step form.
-- Run in Supabase -> SQL editor.
-- ============================================================================

alter table public.client_docs
  add column if not exists phase  text not null default 'engage',
  add column if not exists format text not null default 'deck'; -- deck | a4 | form

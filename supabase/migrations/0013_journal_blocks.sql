-- ============================================================================
-- Hue & Heal :: migration 0013
-- Journal articles become block-based (like newsletters): an ordered list of
-- heading / text / image blocks you can reorder and configure, plus images.
-- body_md is kept as a derived plain-text form for search and the teaser.
-- Run in Supabase -> SQL editor.
-- ============================================================================

alter table public.journal_articles
  add column if not exists blocks jsonb not null default '[]'::jsonb;

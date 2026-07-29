-- ============================================================================
-- Hue & Heal :: migration 0014
-- Reports join the Journal as authored publications. Same document shape
-- (title, standfirst, blocks, takeaways), distinguished by kind.
-- Run in Supabase -> SQL editor.
-- ============================================================================

alter table public.journal_articles
  add column if not exists kind text not null default 'article'; -- article | report

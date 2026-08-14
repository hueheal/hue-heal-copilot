-- ============================================================================
-- Hue & Heal :: 0021 — journal hero image
-- Each article carries a dedicated hero image (full-bleed cover treatment on
-- remedae.app and in the editor preview). Run in the COPILOT project.
-- ============================================================================

alter table public.journal_articles add column if not exists hero_image text not null default '';

-- ============================================================================
-- Hue & Heal — Studio Co-pilot :: migration 0008
-- Per-brand copilot modules. Each brand world enables a set of modules chosen
-- during onboarding; the sidebar menu is built from these. Existing brands get
-- the full set (via the column default) so nothing disappears.
-- Run in Supabase → SQL Editor.
-- ============================================================================

alter table public.brand_profiles
  add column if not exists modules text[] not null
  default array['calendar','clients','proposals','social','newsletter','reports']::text[];

-- ============================================================================
-- Hue & Heal — Studio Co-pilot :: migration 0009
-- Per-brand social style profile. Drives the social template engine so each
-- brand world renders a distinct look (background treatment, text tone, headline
-- font, motif, tagline) instead of inheriting the Hue & Heal art direction.
-- Null = fall back to smart per-brand defaults. Run in Supabase → SQL Editor.
-- ============================================================================

alter table public.brand_profiles
  add column if not exists social_style jsonb;

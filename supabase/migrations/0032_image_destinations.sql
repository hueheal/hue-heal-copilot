-- ============================================================================
-- Hue & Heal :: 0032 — where an approved image lives
-- Images made for a brand's own site go to that site's library on approval
-- (Remedae's Supabase bucket, through its studio endpoint); images made for
-- posts stay in the studio. The composed prompt is kept in parts so the
-- sidecar beside every library file can be written exactly as the imagery
-- guide asks.
-- ============================================================================
alter table public.image_assets add column if not exists destination text not null default 'studio';  -- studio | remedae
alter table public.image_assets add column if not exists library_url text;
alter table public.image_assets add column if not exists library_path text;
alter table public.image_assets add column if not exists parts jsonb;
alter table public.image_assets add column if not exists published_at timestamptz;

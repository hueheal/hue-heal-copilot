-- ============================================================================
-- Hue & Heal :: 0022 — per-workspace Instagram connection
-- Each brand world posts to its own Instagram Business/Creator account.
-- Stored on the brand profile (already RLS-scoped to the brand's members).
-- Fields: { user_id, access_token, username?, connected_at? }
-- Run in the COPILOT project.
-- ============================================================================

alter table public.brand_profiles add column if not exists instagram jsonb not null default '{}'::jsonb;

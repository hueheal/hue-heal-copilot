-- ============================================================================
-- Hue & Heal :: 0017 — Archive stage in the client pipeline
-- Adds an 'archive' column after Delivered so finished or dormant clients
-- can leave the working board without being deleted.
-- Run this statement on its own (ALTER TYPE ... ADD VALUE cannot be used
-- inside the same transaction that reads the new value).
-- ============================================================================

alter type client_stage add value if not exists 'archive';

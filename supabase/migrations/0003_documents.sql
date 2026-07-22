-- ============================================================================
-- Hue & Heal — Studio Co-pilot :: proposal & invoice document content
-- Adds the structured document bodies. Run once in the SQL editor.
-- Depends on migration 0002.
-- ============================================================================

-- Proposal narrative sections (intro / approach / timeline / terms).
-- Phases (with per-phase fees) continue to live in proposals.phases.
alter table public.proposals
  add column if not exists content jsonb not null default '{}'::jsonb;

-- Invoice line items + free-text notes (payment terms / bank details).
alter table public.invoices
  add column if not exists line_items jsonb not null default '[]'::jsonb;
alter table public.invoices
  add column if not exists notes text not null default '';

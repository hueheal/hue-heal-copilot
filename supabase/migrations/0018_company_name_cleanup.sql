-- ============================================================================
-- Hue & Heal :: 0018 — company name cleanup (data fix, no schema change)
-- The studio is 'Hue & Heal'. An imported document (the Helius SOW) carried
-- 'Hue and Heals' from its source file; this sweeps every content table and
-- corrects any 'Hue and Heals' / 'Hue and Heal' to 'Hue & Heal'.
-- Safe to re-run: the WHERE clauses only touch rows that still contain it.
-- ============================================================================

update public.client_docs set
  title  = replace(replace(title,  'Hue and Heals', 'Hue & Heal'), 'Hue and Heal', 'Hue & Heal'),
  dek    = replace(replace(coalesce(dek, ''), 'Hue and Heals', 'Hue & Heal'), 'Hue and Heal', 'Hue & Heal'),
  blocks = replace(replace(blocks::text, 'Hue and Heals', 'Hue & Heal'), 'Hue and Heal', 'Hue & Heal')::jsonb
where title like '%Hue and Heal%' or coalesce(dek, '') like '%Hue and Heal%' or blocks::text like '%Hue and Heal%';

update public.proposals set
  title   = replace(replace(title, 'Hue and Heals', 'Hue & Heal'), 'Hue and Heal', 'Hue & Heal'),
  content = replace(replace(content::text, 'Hue and Heals', 'Hue & Heal'), 'Hue and Heal', 'Hue & Heal')::jsonb
where title like '%Hue and Heal%' or content::text like '%Hue and Heal%';

update public.invoices set
  title      = replace(replace(title, 'Hue and Heals', 'Hue & Heal'), 'Hue and Heal', 'Hue & Heal'),
  line_items = replace(replace(line_items::text, 'Hue and Heals', 'Hue & Heal'), 'Hue and Heal', 'Hue & Heal')::jsonb
where title like '%Hue and Heal%' or line_items::text like '%Hue and Heal%';

update public.journal_articles set
  title  = replace(replace(title, 'Hue and Heals', 'Hue & Heal'), 'Hue and Heal', 'Hue & Heal'),
  blocks = replace(replace(blocks::text, 'Hue and Heals', 'Hue & Heal'), 'Hue and Heal', 'Hue & Heal')::jsonb
where title like '%Hue and Heal%' or blocks::text like '%Hue and Heal%';

update public.newsletters set
  subject = replace(replace(subject, 'Hue and Heals', 'Hue & Heal'), 'Hue and Heal', 'Hue & Heal'),
  blocks  = replace(replace(blocks::text, 'Hue and Heals', 'Hue & Heal'), 'Hue and Heal', 'Hue & Heal')::jsonb
where subject like '%Hue and Heal%' or blocks::text like '%Hue and Heal%';

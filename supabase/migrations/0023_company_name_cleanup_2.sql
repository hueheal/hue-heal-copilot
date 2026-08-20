-- ============================================================================
-- Hue & Heal :: 0023 — company name cleanup, second sweep (data fix)
-- Re-runs the 0018 correction for anything written since (the writers now
-- sanitise at generation time, but existing rows may still carry it), and
-- adds the social tables 0018 did not cover. 'Hue and Heals' / 'Hue and Heal'
-- / 'Hue & Heals' all become 'Hue & Heal'. Safe to re-run.
-- ============================================================================

create or replace function pg_temp.fix_name(t text) returns text language sql immutable as $$
  -- Preserves NULLs: a row updated for one bad column must not blank another.
  select replace(replace(replace(t,
    'Hue and Heals', 'Hue & Heal'),
    'Hue and Heal',  'Hue & Heal'),
    'Hue & Heals',   'Hue & Heal')
$$;

update public.client_docs set
  title = pg_temp.fix_name(title), dek = pg_temp.fix_name(dek),
  blocks = pg_temp.fix_name(blocks::text)::jsonb
where title like '%Hue and Heal%' or coalesce(dek, '') like '%Hue and Heal%'
   or blocks::text like '%Hue and Heal%' or blocks::text like '%Hue & Heals%' or title like '%Hue & Heals%';

update public.proposals set
  title = pg_temp.fix_name(title), content = pg_temp.fix_name(content::text)::jsonb
where title like '%Hue and Heal%' or content::text like '%Hue and Heal%' or content::text like '%Hue & Heals%';

update public.invoices set
  title = pg_temp.fix_name(title), line_items = pg_temp.fix_name(line_items::text)::jsonb
where title like '%Hue and Heal%' or line_items::text like '%Hue and Heal%' or line_items::text like '%Hue & Heals%';

update public.journal_articles set
  title = pg_temp.fix_name(title), blocks = pg_temp.fix_name(blocks::text)::jsonb
where title like '%Hue and Heal%' or blocks::text like '%Hue and Heal%' or blocks::text like '%Hue & Heals%';

update public.newsletters set
  subject = pg_temp.fix_name(subject), blocks = pg_temp.fix_name(blocks::text)::jsonb
where subject like '%Hue and Heal%' or blocks::text like '%Hue and Heal%' or blocks::text like '%Hue & Heals%';

update public.social_posts set
  topic = pg_temp.fix_name(topic),
  headline = pg_temp.fix_name(headline),
  caption = pg_temp.fix_name(caption),
  slides = pg_temp.fix_name(slides::text)::jsonb,
  design = pg_temp.fix_name(design::text)::jsonb
where topic like '%Hue and Heal%' or coalesce(headline, '') like '%Hue and Heal%'
   or coalesce(caption, '') like '%Hue and Heal%' or slides::text like '%Hue and Heal%'
   or design::text like '%Hue and Heal%' or coalesce(caption, '') like '%Hue & Heals%';

update public.content_ideas set
  theme = pg_temp.fix_name(theme), hook = pg_temp.fix_name(hook), angle = pg_temp.fix_name(angle)
where theme like '%Hue and Heal%' or hook like '%Hue and Heal%' or angle like '%Hue and Heal%';

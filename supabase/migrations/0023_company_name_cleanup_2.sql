-- ============================================================================
-- Hue & Heal :: 0023 — company name cleanup, second sweep (data fix)
-- Re-runs the 0018 correction for anything written since (the writers now
-- sanitise at generation time, but existing rows may still carry it), and
-- adds the social tables 0018 did not cover. 'Hue and Heals' / 'Hue and Heal'
-- / 'Hue & Heals' all become 'Hue & Heal'. Safe to re-run.
-- ============================================================================

create or replace function pg_temp.fix_name(t text) returns text language sql immutable as $$
  -- Preserves NULLs: a row updated for one bad column must not blank another.
  select replace(replace(replace(replace(replace(replace(replace(t,
    'Hue and Heals', 'Hue & Heal'),
    'Hue and Heal',  'Hue & Heal'),
    'Hue & Heals',   'Hue & Heal'),
    'hue and heals', 'Hue & Heal'),
    'hue and heal',  'Hue & Heal'),
    'hue & heals',   'Hue & Heal'),
    'hue & heal',    'Hue & Heal')
$$;

update public.client_docs set
  title = pg_temp.fix_name(title), dek = pg_temp.fix_name(dek),
  blocks = pg_temp.fix_name(blocks::text)::jsonb
where title ilike '%hue and heal%' or coalesce(dek, '') ilike '%hue and heal%'
   or blocks::text ilike '%hue and heal%' or blocks::text ilike '%hue & heals%' or title ilike '%hue & heals%';

update public.proposals set
  title = pg_temp.fix_name(title), content = pg_temp.fix_name(content::text)::jsonb
where title ilike '%hue and heal%' or content::text ilike '%hue and heal%' or content::text ilike '%hue & heals%';

update public.invoices set
  title = pg_temp.fix_name(title), line_items = pg_temp.fix_name(line_items::text)::jsonb
where title ilike '%hue and heal%' or line_items::text ilike '%hue and heal%' or line_items::text ilike '%hue & heals%';

update public.journal_articles set
  title = pg_temp.fix_name(title), blocks = pg_temp.fix_name(blocks::text)::jsonb
where title ilike '%hue and heal%' or blocks::text ilike '%hue and heal%' or blocks::text ilike '%hue & heals%';

update public.newsletters set
  subject = pg_temp.fix_name(subject), blocks = pg_temp.fix_name(blocks::text)::jsonb
where subject ilike '%hue and heal%' or blocks::text ilike '%hue and heal%' or blocks::text ilike '%hue & heals%';

update public.social_posts set
  topic = pg_temp.fix_name(topic),
  headline = pg_temp.fix_name(headline),
  caption = pg_temp.fix_name(caption),
  slides = pg_temp.fix_name(slides::text)::jsonb,
  design = pg_temp.fix_name(design::text)::jsonb
where topic ilike '%hue and heal%' or coalesce(headline, '') ilike '%hue and heal%'
   or coalesce(caption, '') ilike '%hue and heal%' or slides::text ilike '%hue and heal%'
   or design::text ilike '%hue and heal%' or coalesce(caption, '') ilike '%hue & heals%';

update public.content_ideas set
  theme = pg_temp.fix_name(theme), hook = pg_temp.fix_name(hook), angle = pg_temp.fix_name(angle)
where theme ilike '%hue and heal%' or hook ilike '%hue and heal%' or angle ilike '%hue and heal%';

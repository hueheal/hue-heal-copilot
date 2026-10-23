-- ============================================================================
-- Hue & Heal :: 0040 — the website reads published journal pieces
-- The new hueandheal.com (Astro, on Netlify) pulls journal_articles with
-- status 'published' at build time, using the public anon key, and serves
-- them at /journal/<slug>. Drafts stay private. Published pieces are public on
-- the website anyway; this only lets the site's build fetch them.
-- (From the site repo: docs/supabase/public-journal-read.sql.)
-- ============================================================================
do $$ begin
  create policy "published journal is public"
    on public.journal_articles
    for select
    to anon
    using (status = 'published');
exception when duplicate_object then null; end $$;

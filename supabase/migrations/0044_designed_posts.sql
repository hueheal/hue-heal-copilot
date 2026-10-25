-- ============================================================================
-- Hue & Heal :: 0044 — designed posts in the Founder's Digest
-- Each digest post is drawn in its brand's own post family on the Mac
-- (scripts/post-render), between the cover photos and the send: stage 'render'.
-- social_posts.slide_urls holds the finished slides (JPEG, Instagram-ready).
-- ============================================================================
alter table public.founder_digests drop constraint if exists founder_digests_stage_check;
alter table public.founder_digests add constraint founder_digests_stage_check
  check (stage in ('mac','news','write','filed','images','render','send','sent','failed'));
alter table public.social_posts add column if not exists slide_urls text[];

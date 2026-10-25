-- ============================================================================
-- Hue & Heal :: 0043 — the Founder's Digest, and the end of the daily posts
-- One branded email a day for the founder: today's three, industry news, one
-- ready-to-post piece for each of Hue & Heal, Remedae and Moss Island, a
-- coaching lesson, and dated next steps per company.
--
-- life_profile.digest_lens  what the digest is about and when it arrives
-- founder_digests           one row per founder per day; the row is also the
--                           job: stage moves mac|news -> write -> filed ->
--                           images -> send -> sent (or failed)
-- social_posts.digest_id    the posts each digest drafted
--
-- The daily-posts cron (paused in 0039) is removed here. The shared cron
-- secret now lives in the founder-digest-tick job, which later migrations
-- read instead of daily-posts-8am.
-- ============================================================================

alter table public.life_profile add column if not exists digest_lens jsonb;

update public.life_profile set digest_lens = jsonb_build_object(
  'enabled', true,
  'send_at', '07:30',
  'prep_at', '06:30',
  'to', null,
  'mac', true,
  'allow_video', false,
  'coaching_next', 0,
  'interests', jsonb_build_array(
    'Wellness experience design across physical and digital spaces',
    'Healthy technology and digital wellbeing',
    'Gaming and play as wellbeing, and what game design can learn from it',
    'Child development, family life and family technology',
    'Traditional medicine, herbal and kitchen remedies: evidence and regulation',
    'Women''s health',
    'AI agents and running a lean company with AI',
    'Consumer subscriptions: pricing, conversion and retention',
    'Social media growth, creators and community',
    'Paid ads, growth experiments and lead generation',
    'UK early-stage funding: SEIS and EIS, grants, angels and wellness investors',
    'Wellness in hospitality, retail, travel and the workplace'
  ),
  'companies', jsonb_build_object(
    'Hue & Heal', 'Wellness experience design studio in London, founded by Maria Valiji. Three rooms on the new website: Studio (for founders building in wellness: experience design, brand and digital product), Lab (the ventures it builds: Remedae and Moss Island) and Mind (coaching, designed: decks such as Design Your Next Chapter, £19). The new site is live at hueandheal.netlify.app and moves to hueandheal.com soon. The Journal publishes essays (recent: Gaming is becoming healthy). The Letter is the newsletter. The Commercial Engine radar looks for studio work, founder contracts, venture funding and outbound leads; not NHS-heavy. Instagram @hue_and_heal is not connected to Copilot yet, so posts are made ready and posted by hand.',
    'Remedae', 'remedae.app: a library of traditional and kitchen remedies told as the written record, with research panes and interaction notes (never "interaction checking"). Strict dosing policy: no pharmacological doses as instructions. Plan of record (Sept 2026): correct claims, measure return on the published remedies, name a clinical advisor, rebuild the model from the real starting position, raise in early 2027. Pilot testers are live. Instagram @remedae.app is connected to Copilot. Women''s health is framed as traditions in the written record, never "nobody has studied this". Never name a condition in an email subject.',
    'Moss Island', 'mossislandgame.com: a game where children do quests in real life, each designed to build a real skill; a grown-up approves each quest once it is complete. 400+ quests across 33 skills for children aged 5 to 15, grounded in child development and behavioural psychology. A calm game. Family plan £4.99 a month or £34.99 a year with a 30-day no-card trial; 200 everyday cards free. Live since October 2026 with the game open to Founding Families (a free year). Imagery: real-life photos showing many backgrounds, faceless, tied to real quests. Instagram is not connected to Copilot yet.'
  )
) where digest_lens is null;

create table if not exists public.founder_digests (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  digest_date date not null,
  stage text not null default 'news' check (stage in ('mac','news','write','filed','images','send','sent','failed')),
  source text not null default 'cloud' check (source in ('mac','cloud')),
  context text,
  state jsonb not null default '{}'::jsonb,
  content jsonb,
  usage jsonb not null default '{}'::jsonb,
  error text,
  attempts int not null default 0,
  lock_until timestamptz,
  send_after timestamptz not null default now(),
  force_send boolean not null default false,
  sent_to text,
  sent_at timestamptz,
  resend_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner, digest_date)
);
alter table public.founder_digests enable row level security;
drop policy if exists "own founder_digests" on public.founder_digests;
create policy "own founder_digests" on public.founder_digests for select using (owner = auth.uid());

alter table public.social_posts add column if not exists digest_id uuid references public.founder_digests(id) on delete set null;

-- The tick: every five minutes through the morning (UTC, so it covers both
-- 07:30 GMT and 07:30 BST). The function decides what is due from London time.
do $$
declare cmd text; secret text; base text;
begin
  select command into cmd from cron.job where jobname = 'daily-posts-8am';
  if cmd is null then select command into cmd from cron.job where jobname = 'role-scheduler-daily'; end if;
  secret := substring(cmd from 'x-cron-secret''\s*,\s*''([^'']+)''');
  base := substring(cmd from '(https://[^'']+/functions/v1/)');
  if secret is null or base is null then raise exception 'cron secret not found; schedule founder-digest-tick by hand'; end if;
  perform cron.unschedule(jobname) from cron.job where jobname = 'founder-digest-tick';
  perform cron.schedule('founder-digest-tick', '*/5 4-11 * * *',
    format('select net.http_post(url := %L, headers := jsonb_build_object(%L, %L, %L, %L), body := %L::jsonb)',
      base || 'founder-digest', 'content-type', 'application/json', 'x-cron-secret', secret, '{"op":"tick"}'));
  -- The daily Instagram posts are retired: the digest carries one post per company instead.
  perform cron.unschedule(jobname) from cron.job where jobname = 'daily-posts-8am';
end $$;

-- Lets the Mac runner (and the founder, through SQL) call the function with
-- the cron secret without the secret ever leaving the database. Service role
-- and the database owner only.
create or replace function public.founder_digest_call(body jsonb default '{"op":"tick"}'::jsonb) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare cmd text; secret text; base text;
begin
  select command into cmd from cron.job where jobname = 'founder-digest-tick';
  secret := substring(cmd from 'x-cron-secret''\s*,\s*''([^'']+)''');
  base := substring(cmd from '(https://[^'']+/functions/v1/)');
  return net.http_post(url := base || 'founder-digest', headers := jsonb_build_object('content-type','application/json','x-cron-secret',secret), body := body);
end $$;
revoke all on function public.founder_digest_call(jsonb) from public, anon, authenticated;

-- ============================================================================
-- Hue & Heal :: 0041 — the portfolio connector
-- The copilot watches and runs what Hue & Heal makes and serves: its own site,
-- its ventures (Remedae, Moss Island) and its clients. Each one is a workspace
-- (brand_profiles) or a client (clients) with connections: the live website,
-- where it is hosted, its code, its email and its data. A connection holds
-- public identifiers only; any key it needs is a Supabase secret named in
-- secret_name, never stored here. The portfolio function checks every
-- connection twice a day and on demand, and keeps each check so changes over
-- time (a failed deploy, new sign ups) can be reported.
-- ============================================================================

-- Moss Island joins as a workspace.
insert into public.brand_profiles (owner, created_by, name, tagline, website, accent_color, modules, is_default)
select '1ed286c9-f2b9-4dc5-9967-c67fa66853ad', '1ed286c9-f2b9-4dc5-9967-c67fa66853ad', 'Moss Island',
  'Quests children do in real life, approved by a grown-up.', 'mossislandgame.com', '#559EA4',
  array['social', 'newsletter', 'calendar', 'reports'], false
where not exists (select 1 from public.brand_profiles where name = 'Moss Island');

create table if not exists public.connections (
  id           uuid primary key default gen_random_uuid(),
  owner        uuid not null references auth.users(id) on delete cascade default auth.uid(),
  brand_id     uuid references public.brand_profiles(id) on delete cascade,
  client_id    uuid references public.clients(id) on delete cascade,
  label        text not null,                      -- "Website", "Hosting", "Code", "Email", "Data"
  kind         text not null check (kind in ('website', 'hosting', 'repo', 'email', 'database', 'analytics', 'payments', 'social')),
  provider     text not null check (provider in ('web', 'netlify', 'vercel', 'github', 'resend', 'supabase', 'plausible', 'stripe', 'instagram')),
  config       jsonb not null default '{}'::jsonb, -- public identifiers: url, site_id, project_id, team_id, repo, branch, domain, metrics
  secret_name  text not null default '',           -- the Supabase secret holding this provider's key, if any
  status       text not null default 'unchecked' check (status in ('ok', 'warn', 'down', 'needs_key', 'unchecked')),
  summary      text not null default '',           -- one line for the founder: "Live, 240 ms", "Deploy failed 2 h ago"
  detail       jsonb not null default '{}'::jsonb,
  checked_at   timestamptz,
  position     int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (brand_id is not null or client_id is not null)
);
create index if not exists connections_owner_idx on public.connections (owner, brand_id, client_id, position);

create table if not exists public.connection_checks (
  id             bigint generated always as identity primary key,
  connection_id  uuid not null references public.connections(id) on delete cascade,
  owner          uuid not null references auth.users(id) on delete cascade,
  status         text not null,
  summary        text not null default '',
  metrics        jsonb not null default '{}'::jsonb,
  checked_at     timestamptz not null default now()
);
create index if not exists connection_checks_conn_idx on public.connection_checks (connection_id, checked_at desc);

alter table public.connections enable row level security;
alter table public.connection_checks enable row level security;
do $$ begin
  create policy "own connections" on public.connections for all using (owner = auth.uid()) with check (owner = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own connection_checks" on public.connection_checks for select using (owner = auth.uid());
exception when duplicate_object then null; end $$;

-- What is connected today (identifiers only).
do $$
declare
  me uuid := '1ed286c9-f2b9-4dc5-9967-c67fa66853ad';
  hh uuid; rem uuid; moss uuid;
begin
  select id into hh from public.brand_profiles where name = 'Hue & Heal' limit 1;
  select id into rem from public.brand_profiles where name = 'Remedae' limit 1;
  select id into moss from public.brand_profiles where name = 'Moss Island' limit 1;
  if exists (select 1 from public.connections where owner = me) then return; end if;
  insert into public.connections (owner, brand_id, label, kind, provider, config, secret_name, position) values
    (me, hh,   'Website',      'website',  'web',     '{"url":"https://hueandheal.netlify.app"}', '', 0),
    (me, hh,   'Hosting',      'hosting',  'netlify', '{"site_id":"b643e791-ddaa-499a-904b-92862d11c893","name":"hueandheal"}', 'NETLIFY_TOKEN', 1),
    (me, hh,   'Code',         'repo',     'github',  '{"repo":"hueheal/HueandHeal-Website","branch":"claude/hue-heal-redesign-bhgogt"}', 'GITHUB_TOKEN', 2),
    (me, hh,   'Email',        'email',    'resend',  '{"domain":"hueandheal.com"}', 'RESEND_API_KEY', 3),
    (me, hh,   'Copilot app',  'website',  'web',     '{"url":"https://copilotadmin.hueandheal.com"}', '', 4),
    (me, hh,   'Copilot code', 'repo',     'github',  '{"repo":"hueheal/hue-heal-copilot","branch":"main"}', 'GITHUB_TOKEN', 5),
    (me, rem,  'Website',      'website',  'web',     '{"url":"https://remedae.app"}', '', 0),
    (me, rem,  'Hosting',      'hosting',  'vercel',  '{"project_id":"prj_hn4jcBSeZPMcvI5PgqCOcXVcqT3B","team_id":"team_fFY8sxcmA8wGgG2vtGB1MWjh","name":"remedae"}', 'VERCEL_TOKEN', 1),
    (me, rem,  'Code',         'repo',     'github',  '{"repo":"hueheal/remedae","branch":"main"}', 'GITHUB_TOKEN', 2),
    (me, rem,  'Email',        'email',    'resend',  '{"domain":"remedae.app"}', 'RESEND_API_KEY_REMEDAE', 3),
    (me, moss, 'Website',      'website',  'web',     '{"url":"https://mossislandgame.com"}', '', 0),
    (me, moss, 'Hosting',      'hosting',  'netlify', '{"site_id":"f6c66832-8fb0-4e55-9bec-155fae321a70","name":"mossislandgame"}', 'NETLIFY_TOKEN', 1),
    (me, moss, 'Code',         'repo',     'github',  '{"repo":"hueheal/MossIsland","branch":"main"}', 'GITHUB_TOKEN', 2);
end $$;

-- Checks twice a day (06:10 and 13:10 UTC). The shared secret is read from the
-- existing daily cron so it is never written into a migration.
do $$
declare cmd text; secret text; base text;
begin
  select command into cmd from cron.job where jobname = 'daily-posts-8am';
  secret := substring(cmd from 'x-cron-secret''\s*,\s*''([^'']+)''');
  base := substring(cmd from '(https://[^'']+/functions/v1/)');
  if secret is null or base is null then raise notice 'schedule portfolio-check by hand'; return; end if;
  perform cron.unschedule(jobname) from cron.job where jobname = 'portfolio-check';
  perform cron.schedule('portfolio-check', '10 6,13 * * *',
    format('select net.http_post(url := %L, headers := jsonb_build_object(%L, %L, %L, %L), body := %L::jsonb)',
      base || 'portfolio', 'content-type', 'application/json', 'x-cron-secret', secret, '{"op":"check"}'));
end $$;

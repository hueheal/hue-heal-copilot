-- ============================================================================
-- Hue & Heal :: 0037 — the Commercial Engine
-- The business-development system behind the Opportunity Radar. Four
-- pipelines (lanes) are searched twice a day by radar-engine:
--   studio    -> paid Hue & Heal projects: tenders, RFPs, briefs, commissions
--   contracts -> founder contracts: freelance, contract and fractional work
--   venture   -> non-dilutive funding and pilots for the founder's products
--   outbound  -> organisations showing buying signals, before any brief exists
-- Every opportunity is scored 1 to 5 on the Hue & Heal Fit Meter and given one
-- action. The founder's pursue, watch and pass decisions (with reasons) are fed
-- back to the engine so its judgement sharpens over time.
--
-- A run is a set of jobs (one per lane, then the brief). Each job advances one
-- model call per step and keeps its conversation on the row, so no single
-- edge function invocation has to outlast the platform's time limit.
-- ============================================================================

-- The lens: what Hue & Heal is and what the engine hunts for. Editable in the app.
alter table public.life_profile add column if not exists radar_lens jsonb not null default '{}'::jsonb;

create table if not exists public.radar_opportunities (
  id             uuid primary key default gen_random_uuid(),
  owner          uuid not null references auth.users(id) on delete cascade default auth.uid(),
  lane           text not null check (lane in ('studio', 'contracts', 'venture', 'outbound')),
  category       text not null default 'other',   -- tender | rfp | brief | commission | contract | fractional | role | grant | competition | accelerator | pilot | signal | partnership | other
  title          text not null,
  org            text not null default '',
  summary        text not null default '',
  fit            smallint check (fit between 1 and 5),            -- null: not scored yet
  fit_detail     jsonb not null default '{}'::jsonb,              -- sector, scope, ambition, capability, access (1 to 5 each)
  action         text check (action in ('pursue_now', 'outreach_now', 'partner', 'product_funding', 'watch', 'pass')),
  why            text not null default '',
  angle          text not null default '',
  money          text not null default '',                        -- as the source states it
  value_pence    bigint,
  deadline       timestamptz,
  deadline_note  text not null default '',
  location       text not null default '',
  signal_date    date,
  product        text not null default '',                        -- venture lane: which product it serves
  source_name    text not null default '',
  url            text not null default '',
  source         text not null default 'engine',                  -- engine | contracts_finder | chat
  source_ref     text not null,
  status         text not null default 'open' check (status in ('open', 'closed', 'expired', 'tracked', 'watching', 'passed')),
  closed_reason  text not null default '',
  decision_note  text not null default '',
  change_note    text not null default '',
  pipeline_id    uuid references public.life_pipeline(id) on delete set null,
  run_id         uuid,
  first_seen     timestamptz not null default now(),
  changed_at     timestamptz,
  last_checked   timestamptz not null default now(),
  decided_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index if not exists radar_opp_ref_uq on public.radar_opportunities (owner, source, source_ref);
create index if not exists radar_opp_open_idx on public.radar_opportunities (owner, status, fit desc nulls last);

create table if not exists public.radar_runs (
  id           uuid primary key default gen_random_uuid(),
  owner        uuid not null references auth.users(id) on delete cascade default auth.uid(),
  trigger      text not null default 'schedule',   -- schedule | manual
  status       text not null default 'running',    -- running | done | failed
  brief        jsonb,                              -- priorities, verdict, insight
  usage        jsonb not null default '{}'::jsonb, -- tokens, searches, fetches, usd
  error        text,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz
);
create index if not exists radar_runs_owner_idx on public.radar_runs (owner, started_at desc);

create table if not exists public.radar_jobs (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.radar_runs(id) on delete cascade,
  owner       uuid not null references auth.users(id) on delete cascade,
  lane        text not null check (lane in ('studio', 'contracts', 'venture', 'outbound', 'brief')),
  status      text not null default 'queued',      -- queued | running | done | failed
  messages    jsonb not null default '[]'::jsonb,
  steps       int not null default 0,
  attempts    int not null default 0,
  filed       int not null default 0,
  closed      int not null default 0,
  usage       jsonb not null default '{}'::jsonb,
  lock_until  timestamptz,
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists radar_jobs_open_idx on public.radar_jobs (status, created_at) where status in ('queued', 'running');
create unique index if not exists radar_jobs_run_lane_uq on public.radar_jobs (run_id, lane);

alter table public.radar_opportunities enable row level security;
alter table public.radar_runs enable row level security;
alter table public.radar_jobs enable row level security;
do $$ begin
  create policy "own radar_opportunities" on public.radar_opportunities for all using (owner = auth.uid()) with check (owner = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own radar_runs" on public.radar_runs for select using (owner = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own radar_jobs" on public.radar_jobs for select using (owner = auth.uid());
exception when duplicate_object then null; end $$;

-- The founder's lens, from the instructions she wrote for the radar.
update public.life_profile set radar_lens = jsonb_build_object(
  'identity', 'Hue & Heal is not a generic UX agency or an NHS service-design consultancy. It brings entertainment-grade product and experience design, storytelling, immersive and digital-physical thinking, service design and UX/UI into wellness, wellbeing, healthtech, hospitality, education, children and family, longevity and future-facing human experiences. A small senior studio, founder-led.',
  'look_for', 'Zero-to-one products, new services, consumer experiences, experiential wellness, immersive environments, future learning, behavioural design, spatial and digital journeys, premium member and guest experiences, and organisations trying to rethink a category.',
  'buyers', 'Startups, scaleups, funded ventures, innovative established brands, wellness operators, hospitality groups, future-facing education organisations, cultural destinations and museums, children''s brands and innovation programmes outrank conventional procurement.',
  'down_rank', 'NHS, university and public-sector work only scores well with genuine product creation, transformation, immersive scope, experimentation or unusual design ambition. Generic websites, ordinary service-design work, care-home and school procurement, and IT framework lots score poorly.',
  'geography', 'UK-first, not UK-only. Include international work a UK studio can realistically do remotely, through a partner, as a consultant or by bidding.',
  'contracts', 'Senior, lead or principal product, experience, service or UX design; design lead and fractional head of design roles. Contract and freelance first, with day rates stated where known. Health, wellness, learning, hospitality, entertainment and consumer products preferred.',
  'ventures', jsonb_build_array(
    jsonb_build_object('product', 'Remedae', 'direction', 'A consumer app of the world''s traditional healing knowledge, presented as written record with careful safety framing; women''s health is a strong thread. Pilot programme running, raising early 2027. Fits: health-literacy, consumer-health, women''s-health and digital-health innovation funding, pilots and partnerships.'),
    jsonb_build_object('product', 'Mazzi Summer Showdown', 'direction', 'A summer quest game for children aged 5 to 15 with parent setup, played across real-world challenges. Fits: children''s play, family wellbeing, active-play and creative-learning funding, pilots and partnerships.')
  ),
  'venture_rule', 'Only recommend funding that fits the product''s existing direction. Never reshape a product to chase a grant.'
) where radar_lens = '{}'::jsonb;

-- The old tender radar filed straight into the pipeline. Its untouched notices
-- move to the radar, unscored, and leave the pipeline; anything the founder
-- tracked stays where it is.
insert into public.radar_opportunities (owner, lane, category, title, org, summary, value_pence, deadline, url, source, source_ref, source_name, location)
select owner, 'studio', 'tender', title, org, notes, value_pence, deadline, url, 'contracts_finder', source_ref, 'Contracts Finder', 'UK'
from public.life_pipeline where source = 'tender_radar' and stage = 'new'
on conflict (owner, source, source_ref) do nothing;
delete from public.life_pipeline where source = 'tender_radar' and stage = 'new';

-- Schedules. The shared secret is read from the existing daily cron so it
-- stays in the database and is never written into a migration.
--   radar-morning / radar-afternoon: start a run for every founder with a lens
--   (05:30 and 12:30 UTC: 06:30 and 13:30 in British Summer Time).
--   radar-tick: every minute, but it only calls out while a job is waiting.
do $$
declare cmd text; secret text; base text; hdr text;
begin
  select command into cmd from cron.job where jobname = 'daily-posts-8am';
  secret := substring(cmd from 'x-cron-secret''\s*,\s*''([^'']+)''');
  base := substring(cmd from '(https://[^'']+/functions/v1/)');
  if secret is null or base is null then
    raise notice 'daily-posts-8am cron not found: schedule the radar by hand';
    return;
  end if;
  hdr := format('jsonb_build_object(%L, %L, %L, %L)', 'content-type', 'application/json', 'x-cron-secret', secret);
  perform cron.unschedule(jobname) from cron.job where jobname in ('radar-morning', 'radar-afternoon', 'radar-tick');
  perform cron.schedule('radar-morning', '30 5 * * *',
    format('select net.http_post(url := %L, headers := %s, body := %L::jsonb)', base || 'radar-engine', hdr, '{"op":"start"}'));
  perform cron.schedule('radar-afternoon', '30 12 * * *',
    format('select net.http_post(url := %L, headers := %s, body := %L::jsonb)', base || 'radar-engine', hdr, '{"op":"start"}'));
  perform cron.schedule('radar-tick', '* * * * *',
    format('select net.http_post(url := %L, headers := %s, body := %L::jsonb) where exists (select 1 from public.radar_jobs where status in (''queued'', ''running'') and (lock_until is null or lock_until < now()))',
      base || 'radar-engine', hdr, '{"op":"tick"}'));
end $$;

-- The founder's decision on an opportunity, from the app or the assistant.
-- pursue: files it in the pipeline (once) with a first next step; watch, pass
-- and reopen change its status. Runs as the caller, so row security applies.
create or replace function public.radar_decide(opp uuid, decision text, note text default '')
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  o public.radar_opportunities;
  pid uuid;
  bid uuid;
  due date;
begin
  select * into o from public.radar_opportunities where id = opp;
  if not found then raise exception 'Opportunity not found'; end if;
  if decision not in ('pursue', 'watch', 'pass', 'reopen') then raise exception 'Unknown decision %', decision; end if;

  if decision = 'pursue' then
    pid := o.pipeline_id;
    if pid is null then
      select id into bid from public.brand_profiles
       where owner = o.owner and ((o.lane = 'venture' and o.product <> '' and lower(name) = lower(o.product))
          or (o.lane in ('studio', 'outbound') and name ilike 'hue%heal%'))
       limit 1;
      due := case when o.deadline is null then current_date + 2
                  else greatest(current_date, least((o.deadline at time zone 'Europe/London')::date - 3, current_date + 2)) end;
      insert into public.life_pipeline (owner, brand_id, kind, title, org, value_pence, stage, next_step, next_due, deadline, url, notes, source, source_ref)
      values (o.owner, bid,
        case when o.lane = 'studio' and o.category in ('tender', 'rfp') then 'tender' when o.lane = 'venture' then 'partnership' when o.lane = 'outbound' then 'lead' else 'deal' end,
        o.title, o.org, o.value_pence, 'new',
        case o.action when 'outreach_now' then 'Send the first note' when 'partner' then 'Line up a delivery partner'
                      when 'product_funding' then 'Check eligibility and start the application' else 'Apply or bid' end,
        due, o.deadline, o.url,
        concat_ws(E'\n', nullif(o.why, ''), 'Angle: ' || nullif(o.angle, ''), nullif(note, '')),
        'radar', o.id::text)
      on conflict (owner, source, source_ref) do update set updated_at = now()
      returning id into pid;
    end if;
    update public.radar_opportunities set status = 'tracked', pipeline_id = pid, decision_note = coalesce(nullif(note, ''), decision_note), decided_at = now(), updated_at = now() where id = opp;
    return pid;
  end if;

  update public.radar_opportunities
     set status = case decision when 'watch' then 'watching' when 'pass' then 'passed' else 'open' end,
         decision_note = coalesce(nullif(note, ''), decision_note), decided_at = now(), updated_at = now()
   where id = opp;
  return null;
end $$;
grant execute on function public.radar_decide(uuid, text, text) to authenticated;

#!/usr/bin/env node
// ============================================================================
// The Commercial Engine, run on the founder's Mac by a scheduled Claude task,
// so the daily scan comes out of her Claude plan instead of per-use API
// billing. The Claude session does the searching and judging itself (web
// search and fetch); this script is its hands on the database: it hands out
// each lane's brief and files what the session found, with the same rules
// and the same validation as the cloud engine (supabase/functions/radar-engine).
//
//   node scripts/radar-local.mjs start                 open a run, print its id
//   node scripts/radar-local.mjs context <lane>        rules + lens + what is on the radar
//   node scripts/radar-local.mjs file <lane> <json> --run <id>
//   node scripts/radar-local.mjs brief-context         what the brief is written from
//   node scripts/radar-local.mjs brief <json> --run <id>   save the brief, close the run
//   node scripts/radar-local.mjs fail --run <id> "why"
// lanes: studio | contracts | venture | outbound
// Auth: the Supabase CLI token from the macOS keychain, used in-process only.
// ============================================================================
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import RULES from '../supabase/functions/_shared/radar-rules.json' with { type: 'json' }

const PROJECT = 'dxniwcwoacyrjlyhymoh'
const TZ = 'Europe/London'
const LANES = ['studio', 'contracts', 'venture', 'outbound']
const token = execSync('security find-generic-password -s "Supabase CLI" -w', { encoding: 'utf8' }).trim()
const [cmd, ...rest] = process.argv.slice(2)
const flag = (name) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined }
const args = rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && rest[i - 1].startsWith('--')))

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ query }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.message ?? `Database ${res.status}`)
  return body
}
// Dollar-quote a value so any text is safe inside SQL.
const q = (v) => { if (v === null || v === undefined) return 'null'; const tag = `q${Math.random().toString(36).slice(2, 8)}`; return `$${tag}$${String(v)}$${tag}$` }
const cut = (v, n) => String(v ?? '').replace(/[–—]/g, ', ').replace(/\s+/g, ' ').trim().slice(0, n)
const isoDate = (v) => { const m = String(v ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : null }
const clamp = (n) => { const x = Math.round(Number(n)); return x >= 1 && x <= 5 ? x : null }
const todayLong = () => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
function refOf(url, org, title) {
  try {
    const u = new URL(url)
    const keep = ['id', 'noticeid', 'jobid', 'job', 'gh_jid', 'currentjobid', 'ref']
    const qs = [...u.searchParams].filter(([k]) => keep.includes(k.toLowerCase())).map(([k, v]) => `${k}=${v}`).join('&')
    return `${u.hostname.replace(/^www\./, '').toLowerCase()}${u.pathname.replace(/\/+$/, '').toLowerCase()}${qs ? `?${qs}` : ''}`
  } catch { return `${org} ${title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 160) }
}

const [{ owner } = {}] = await sql("select owner from public.life_profile where radar_lens <> '{}'::jsonb order by updated_at desc limit 1")
if (!owner) { console.error('No founder has a radar lens yet.'); process.exit(1) }
const O = q(owner)

const FILE_SHAPE = `Write the results as a JSON file shaped like this (the same fields as the cloud engine's file_opportunities tool):
{
  "opportunities": [{
    "existing_id": "only when updating or scoring an item listed above",
    "title": "", "org": "", "category": one of ${JSON.stringify(RULES.categories)},
    "summary": "two sentences at most", "fit": 1-5,
    "fit_detail": { "sector": 1-5, "scope": 1-5, "ambition": 1-5, "capability": 1-5, "access": 1-5 },
    "action": one of ${JSON.stringify(RULES.actions)},
    "why": "", "angle": "", "money": "as the source states it", "value_gbp": number or omit,
    "deadline": "YYYY-MM-DD", "deadline_note": "", "location": "", "signal_date": "YYYY-MM-DD",
    "product": "venture lane only", "source_name": "", "url": "the original source", "change_note": "updates only"
  }],
  "closed": [{ "id": "an id listed above", "reason": "" }]
}
Where the rules say "call file_opportunities", write this file and run the file command instead.`

/* ---- commands ---- */
if (cmd === 'start') {
  const [busy] = await sql(`select id from public.radar_runs where owner = ${O} and status = 'running' and started_at > now() - interval '3 hours' limit 1`)
  if (busy) { console.log(`RUN ${busy.id} (already open)`); process.exit(0) }
  await sql(`update public.radar_opportunities set status = 'expired', closed_reason = 'The deadline passed.', changed_at = now()
    where owner = ${O} and status in ('open', 'watching') and deadline < now()`)
  const [run] = await sql(`insert into public.radar_runs (owner, trigger, usage) values (${O}, 'local', '{"plan":"claude"}'::jsonb) returning id`)
  console.log(`RUN ${run.id}\n\n${RULES.system}`)
}

else if (cmd === 'context') {
  const lane = args[0]
  if (!LANES.includes(lane)) throw new Error(`Lane must be one of ${LANES.join(', ')}`)
  const [prof] = await sql(`select radar_lens, weekly_focus from public.life_profile where owner = ${O}`)
  const existing = await sql(`select id, title, org, fit, action, deadline, url, last_checked from public.radar_opportunities
    where owner = ${O} and lane = ${q(lane)} and status in ('open', 'watching', 'tracked') and fit is not null order by fit desc limit 30`)
  const unscored = lane === 'studio' ? await sql(`select id, title, org, value_pence, deadline, summary from public.radar_opportunities
    where owner = ${O} and fit is null and status = 'open' order by first_seen limit 20`) : []
  const decisions = await sql(`select title, org, lane, fit, status, decision_note from public.radar_opportunities
    where owner = ${O} and status in ('tracked', 'watching', 'passed') and decided_at is not null order by decided_at desc limit 25`)
  const lens = prof?.radar_lens ?? {}
  const out = [`TODAY: ${todayLong()} (${TZ}).`, '', RULES.lanes[lane], '', "THE FOUNDER'S LENS",
    `What Hue & Heal is: ${cut(lens.identity, 900)}`, `Look hardest for: ${cut(lens.look_for, 700)}`, `Buyers to favour: ${cut(lens.buyers, 700)}`,
    `Score down: ${cut(lens.down_rank, 700)}`, `Geography: ${cut(lens.geography, 400)}`]
  if (lane === 'contracts') out.push(`Contracts wanted: ${cut(lens.contracts, 700)}`)
  if (lane === 'venture') out.push('VENTURES:', ...(lens.ventures ?? []).map((v) => `- ${cut(v.product, 80)}: ${cut(v.direction, 700)}`), `Rule: ${cut(lens.venture_rule, 300)}`)
  if (prof?.weekly_focus) out.push(`The founder's focus this week: ${cut(prof.weekly_focus, 300)}`)
  out.push('', 'ALREADY ON THE RADAR IN THIS LANE (do not file these again as new; use existing_id for a material change, and list any you find closed):',
    ...(existing.length ? existing.map((o) => `- [${o.id}] fit ${o.fit}, ${o.action}: ${cut(o.title, 110)} / ${cut(o.org, 60)}${o.deadline ? `, closes ${String(o.deadline).slice(0, 10)}` : ''}, checked ${String(o.last_checked).slice(0, 10)}, ${cut(o.url, 160)}`) : ['(nothing yet)']))
  if (unscored.length) out.push('', 'UNSCORED CONTRACTS FINDER NOTICES (score each with existing_id; no need to search for them):',
    ...unscored.map((o) => `- [${o.id}] ${cut(o.title, 140)} / ${cut(o.org, 80)}${o.value_pence ? `, £${Math.round(Number(o.value_pence) / 100).toLocaleString('en-GB')}` : ''}${o.deadline ? `, closes ${String(o.deadline).slice(0, 10)}` : ''}: ${cut(o.summary, 420)}`))
  if (decisions.length) out.push('', "THE FOUNDER'S RECENT DECISIONS (calibrate your scoring to these):",
    ...decisions.map((d) => `- ${d.status === 'tracked' ? 'PURSUED' : d.status === 'passed' ? 'PASSED' : 'WATCHING'} (${d.lane}, scored ${d.fit}): ${cut(d.title, 90)} / ${cut(d.org, 50)}${d.decision_note ? `. Her reason: "${cut(d.decision_note, 160)}"` : ''}`))
  out.push('', FILE_SHAPE, '', `Then: node scripts/radar-local.mjs file ${lane} <path-to-json> --run <RUN id>`)
  console.log(out.join('\n'))
}

else if (cmd === 'file') {
  const [lane, path] = args
  const run = flag('run')
  if (!LANES.includes(lane) || !path || !run) throw new Error('Usage: file <lane> <json> --run <id>')
  const input = JSON.parse(readFileSync(path, 'utf8'))
  const opps = Array.isArray(input.opportunities) ? input.opportunities.slice(0, 30) : []
  const closed = Array.isArray(input.closed) ? input.closed.slice(0, 30) : []
  let filed = 0, shut = 0
  const problems = []
  for (const o of opps) {
    const fit = clamp(o.fit)
    const action = RULES.actions.includes(String(o.action)) ? String(o.action) : null
    const title = cut(o.title, 300)
    if (!title || !fit || !action) { problems.push(`skipped "${title || 'untitled'}": title, fit and action are required`); continue }
    const fd = o.fit_detail ?? {}
    const url = /^https?:\/\//.test(String(o.url ?? '')) ? String(o.url).slice(0, 800) : ''
    const dl = isoDate(o.deadline), sd = isoDate(o.signal_date)
    const f = {
      category: RULES.categories.includes(String(o.category)) ? String(o.category) : 'other', title, org: cut(o.org, 200), fit, action,
      fit_detail: JSON.stringify({ sector: clamp(fd.sector), scope: clamp(fd.scope), ambition: clamp(fd.ambition), capability: clamp(fd.capability), access: clamp(fd.access) }),
      why: cut(o.why, 600), angle: cut(o.angle, 700), money: cut(o.money, 120), value_pence: Number(o.value_gbp) > 0 ? Math.round(Number(o.value_gbp) * 100) : null,
      deadline_note: cut(o.deadline_note, 200), location: cut(o.location, 120), product: cut(o.product, 80), source_name: cut(o.source_name, 120),
    }
    const sets = [`category = ${q(f.category)}`, `title = ${q(f.title)}`, `org = ${q(f.org)}`, `fit = ${fit}`, `action = ${q(action)}`, `fit_detail = ${q(f.fit_detail)}::jsonb`,
      `why = ${q(f.why)}`, `angle = ${q(f.angle)}`, `money = ${q(f.money)}`, `value_pence = ${f.value_pence ?? 'null'}`, `deadline_note = ${q(f.deadline_note)}`,
      `location = ${q(f.location)}`, `product = ${q(f.product)}`, `source_name = ${q(f.source_name)}`, 'last_checked = now()', 'updated_at = now()']
    if (cut(o.summary, 600)) sets.push(`summary = ${q(cut(o.summary, 600))}`)
    if (dl) sets.push(`deadline = ${q(`${dl}T17:00:00Z`)}::timestamptz`)
    if (sd) sets.push(`signal_date = ${q(sd)}::date`)
    if (url) sets.push(`url = ${q(url)}`)
    const exId = String(o.existing_id ?? '').trim()
    if (/^[0-9a-f-]{36}$/i.test(exId)) {
      const [prev] = await sql(`select fit, action, deadline, money from public.radar_opportunities where id = ${q(exId)} and owner = ${O}`)
      if (prev) {
        const material = prev.fit !== null && (prev.fit !== fit || prev.action !== action || (dl && String(prev.deadline ?? '').slice(0, 10) !== dl) || (f.money && prev.money !== f.money))
        if (material) sets.push('changed_at = now()', `change_note = ${q(cut(o.change_note, 240) || 'Details changed since the last scan.')}`)
        await sql(`update public.radar_opportunities set ${sets.join(', ')} where id = ${q(exId)} and owner = ${O}`)
        filed++
        continue
      }
    }
    const ref = refOf(url, f.org, title)
    await sql(`insert into public.radar_opportunities (owner, lane, run_id, source, source_ref, title) values (${O}, ${q(lane)}, ${q(run)}::uuid, 'engine', ${q(ref)}, ${q(title)})
      on conflict (owner, source, source_ref) do nothing`)
    await sql(`update public.radar_opportunities set ${sets.join(', ')} where owner = ${O} and source = 'engine' and source_ref = ${q(ref)}`)
    filed++
  }
  for (const c of closed) {
    if (!/^[0-9a-f-]{36}$/i.test(String(c.id ?? ''))) continue
    const out = await sql(`update public.radar_opportunities set status = 'closed', closed_reason = ${q(cut(c.reason, 240) || 'Closed at the source.')}, changed_at = now(), last_checked = now()
      where id = ${q(c.id)} and owner = ${O} and status in ('open', 'watching') returning id`)
    shut += out.length
  }
  await sql(`update public.radar_runs set usage = usage || jsonb_build_object(${q(lane)}, ${filed}) where id = ${q(run)}::uuid`)
  console.log(`${lane}: ${filed} filed, ${shut} closed.${problems.length ? ` ${problems.join('; ')}` : ''}`)
}

else if (cmd === 'brief-context') {
  const live = await sql(`select id, lane, category, title, org, fit, action, why, angle, money, deadline, deadline_note, location, product, first_seen, changed_at, change_note, status
    from public.radar_opportunities where owner = ${O} and status in ('open', 'watching') and fit >= 3 order by fit desc limit 60`)
  const closed = await sql(`select title, org, closed_reason from public.radar_opportunities where owner = ${O} and status in ('closed', 'expired') and changed_at > now() - interval '36 hours' limit 15`)
  const pipe = await sql(`select title, org, stage, next_step from public.life_pipeline where owner = ${O} and stage not in ('won', 'lost', 'dismissed') limit 20`)
  const [prof] = await sql(`select display_name, mission, weekly_focus from public.life_profile where owner = ${O}`)
  const since = Date.now() - 36 * 3600_000
  const fresh = (o) => (new Date(o.first_seen).getTime() > since ? 'NEW ' : o.changed_at && new Date(o.changed_at).getTime() > since ? 'UPDATED ' : '')
  const urgent = (o) => (o.deadline && new Date(o.deadline).getTime() - Date.now() < 7 * 86400_000 ? 'URGENT ' : '')
  console.log([RULES.brief_system, '', `TODAY: ${todayLong()}.`,
    `FOUNDER: ${cut(prof?.display_name, 40) || 'the founder'}. Mission: ${cut(prof?.mission, 300) || '(not written yet)'}. This week: ${cut(prof?.weekly_focus, 200) || '(not set)'}.`,
    '', 'LIVE OPPORTUNITIES (fit 3 and above):',
    ...live.map((o) => `- [${o.id}] ${fresh(o)}${urgent(o)}${o.lane}/${o.category} fit ${o.fit} ${o.action}${o.status === 'watching' ? ' (she is watching)' : ''}: ${cut(o.title, 110)} / ${cut(o.org, 60)}; ${cut(o.money, 60)}${o.deadline ? `; closes ${String(o.deadline).slice(0, 10)}` : ''}${o.deadline_note ? ` (${cut(o.deadline_note, 80)})` : ''}; ${cut(o.location, 40)}${o.product ? `; for ${o.product}` : ''}. Why: ${cut(o.why, 200)} Angle: ${cut(o.angle, 200)}${o.change_note ? ` Changed: ${cut(o.change_note, 120)}` : ''}`),
    '', 'CLOSED OR EXPIRED SINCE YESTERDAY:', ...closed.map((c) => `- ${cut(c.title, 90)} / ${cut(c.org, 50)}: ${cut(c.closed_reason, 120)}`),
    '', 'ALREADY IN HER PIPELINE:', ...pipe.map((p) => `- ${cut(p.title, 80)} / ${cut(p.org, 40)}: ${p.stage}${p.next_step ? `, next: ${cut(p.next_step, 60)}` : ''}`),
    '', 'Write the brief as a JSON file: {"priorities":[{"text":"","opportunity_id":"an id above or empty"}],"verdict":[{"label":"","text":"","opportunity_id":""}],"insight":""}',
    'Then: node scripts/radar-local.mjs brief <path-to-json> --run <RUN id>'].join('\n'))
}

else if (cmd === 'brief') {
  const [path] = args
  const run = flag('run')
  if (!path || !run) throw new Error('Usage: brief <json> --run <id>')
  const b = JSON.parse(readFileSync(path, 'utf8'))
  const ids = new Set((await sql(`select id from public.radar_opportunities where owner = ${O} and status in ('open', 'watching', 'closed')`)).map((r) => r.id))
  const link = (id) => (ids.has(String(id)) ? String(id) : null)
  const brief = {
    priorities: (b.priorities ?? []).slice(0, 3).map((p) => ({ text: cut(p.text, 400), opportunity_id: link(p.opportunity_id) })),
    verdict: (b.verdict ?? []).slice(0, 5).map((v) => ({ label: cut(v.label, 60), text: cut(v.text, 300), opportunity_id: link(v.opportunity_id) })),
    insight: cut(b.insight, 900),
  }
  await sql(`update public.radar_runs set brief = ${q(JSON.stringify(brief))}::jsonb, status = 'done', finished_at = now() where id = ${q(run)}::uuid and owner = ${O}`)
  console.log(`Brief saved: ${brief.priorities.length} priorities. The run is closed.`)
}

else if (cmd === 'fail') {
  const run = flag('run')
  await sql(`update public.radar_runs set status = 'failed', error = ${q(cut(args[0] ?? 'The Mac run stopped.', 600))}, finished_at = now() where id = ${q(run)}::uuid and owner = ${O}`)
  console.log('Run marked failed.')
}

else {
  console.log('Commands: start | context <lane> | file <lane> <json> --run <id> | brief-context | brief <json> --run <id> | fail --run <id> "why"')
}

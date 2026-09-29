// ============================================================================
// radar-engine: the Hue & Heal Commercial Engine behind the Opportunity Radar.
//
// Four lanes, one per pipeline, each searched by Claude with live web search:
//   studio    paid Hue & Heal projects (tenders, RFPs, briefs, commissions)
//   contracts founder contracts (freelance, contract, fractional)
//   venture   non-dilutive funding and pilots for the founder's products
//   outbound  organisations showing buying signals before any brief exists
// then a brief: at most three priorities, the verdict and one insight.
//
// A run is a row in radar_runs with one job per lane. Each job advances one
// model call per step and keeps its conversation on the row, so no single
// invocation has to outlast the platform's 150 second limit. Steps chain
// themselves; the every-minute radar-tick cron is the safety net.
//
// POST, cron (x-cron-secret):  { op: 'start' }  a run for every founder with a lens
//                              { op: 'tick' }   advance waiting jobs
// POST, founder (Bearer jwt):  { op: 'run' }    start a run now
// Secrets: ANTHROPIC_API_KEY, CRON_SECRET.
// ============================================================================
import Anthropic from 'npm:@anthropic-ai/sdk@0.129.0'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'
import RULES from '../_shared/radar-rules.json' with { type: 'json' }

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const LANE_MODEL = 'claude-sonnet-5-5'
const BRIEF_MODEL = 'claude-opus-5-5'
const TZ = 'Europe/London'
const STEP_TIMEOUT_MS = 118_000
const LOCK_SECONDS = 170
const MAX_STEPS = 5
const MAX_ATTEMPTS = 3
const LANES = ['studio', 'contracts', 'venture', 'outbound'] as const
type Lane = (typeof LANES)[number]

// Per million tokens, and per web search. Used to show the founder what a run cost.
const PRICE: Record<string, { in: number; out: number; cacheRead: number; cacheWrite: number }> = {
  [LANE_MODEL]: { in: 2, out: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  [BRIEF_MODEL]: { in: 4, out: 20, cacheRead: 0.2, cacheWrite: 5 },
}
const SEARCH_USD = 0.01

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '', maxRetries: 0, timeout: STEP_TIMEOUT_MS })
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void }

type Json = Record<string, unknown>

/* ---- The engine's instructions: one file, shared with the Mac runner ---- */
const SYSTEM: string = RULES.system
const LANE_BRIEF = RULES.lanes as Record<Lane, string>
const CATEGORIES: string[] = RULES.categories
const ACTIONS: string[] = RULES.actions
const score = { type: 'integer', minimum: 1, maximum: 5 }
const s = { type: 'string' }

const FILE_TOOL = {
  name: 'file_opportunities',
  description: 'File this lane\'s results on the radar, once, when searching is finished: new opportunities, updates or scores for existing ones (existing_id), and existing ones found closed.',
  input_schema: {
    type: 'object',
    properties: {
      opportunities: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            existing_id: { type: 'string', description: 'Id from ALREADY ON THE RADAR or UNSCORED, when this updates or scores that item.' },
            title: s, org: s,
            category: { type: 'string', enum: CATEGORIES },
            summary: { type: 'string', description: 'What it is, two sentences at most.' },
            fit: score,
            fit_detail: { type: 'object', properties: { sector: score, scope: score, ambition: score, capability: score, access: score }, required: ['sector', 'scope', 'ambition', 'capability', 'access'] },
            action: { type: 'string', enum: ACTIONS },
            why: s, angle: s,
            money: { type: 'string', description: 'As the source states it, e.g. "£650,000" or "£500 to £600 a day". Empty if unknown.' },
            value_gbp: { type: 'number', description: 'Total value in pounds when stated as a total.' },
            deadline: { type: 'string', description: 'YYYY-MM-DD when applications or bids close.' },
            deadline_note: { type: 'string', description: 'Other dates that matter, e.g. "clarification questions close 1 Oct".' },
            location: s, signal_date: { type: 'string', description: 'YYYY-MM-DD of the buying signal or posting.' },
            product: { type: 'string', description: 'Venture lane: which product this serves.' },
            source_name: s, url: { type: 'string', description: 'The original source.' },
            change_note: { type: 'string', description: 'For an update: what changed, in one line.' },
          },
          required: ['title', 'org', 'category', 'fit', 'fit_detail', 'action', 'why', 'angle'],
        },
      },
      closed: {
        type: 'array',
        items: { type: 'object', properties: { id: s, reason: { type: 'string', description: 'e.g. "The original post says it is no longer accepting applications."' } }, required: ['id', 'reason'] },
      },
    },
    required: ['opportunities'],
  },
}

/* ---- Small helpers ---- */
const cut = (v: unknown, n: number) => String(v ?? '').replace(/[–—]/g, ', ').replace(/\s+/g, ' ').trim().slice(0, n)
const isoDate = (v: unknown) => { const m = String(v ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : null }
const todayLong = () => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
const clamp = (n: unknown) => { const x = Math.round(Number(n)); return x >= 1 && x <= 5 ? x : null }
function refOf(url: string, org: string, title: string): string {
  try {
    const u = new URL(url)
    const keep = ['id', 'noticeid', 'jobid', 'job', 'gh_jid', 'currentjobid', 'ref']
    const q = [...u.searchParams].filter(([k]) => keep.includes(k.toLowerCase())).map(([k, v]) => `${k}=${v}`).join('&')
    return `${u.hostname.replace(/^www\./, '').toLowerCase()}${u.pathname.replace(/\/+$/, '').toLowerCase()}${q ? `?${q}` : ''}`
  } catch {
    return `${org} ${title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 160)
  }
}
function addUsage(total: Json, model: string, u: Json | undefined) {
  if (!u) return total
  const p = PRICE[model]
  const input = Number(u.input_tokens ?? 0), output = Number(u.output_tokens ?? 0)
  const cr = Number(u.cache_read_input_tokens ?? 0), cw = Number(u.cache_creation_input_tokens ?? 0)
  const stu = (u.server_tool_use ?? {}) as Json
  const searches = Number(stu.web_search_requests ?? 0), fetches = Number(stu.web_fetch_requests ?? 0)
  const usd = (input * p.in + output * p.out + cr * p.cacheRead + cw * p.cacheWrite) / 1e6 + searches * SEARCH_USD
  return {
    input_tokens: Number(total.input_tokens ?? 0) + input + cr + cw, output_tokens: Number(total.output_tokens ?? 0) + output,
    searches: Number(total.searches ?? 0) + searches, fetches: Number(total.fetches ?? 0) + fetches,
    usd: Math.round((Number(total.usd ?? 0) + usd) * 10000) / 10000,
  }
}

/* ---- Starting a run ---- */
async function startRun(admin: SupabaseClient, owner: string, trigger: 'schedule' | 'manual'): Promise<{ runId?: string; note?: string }> {
  const recent = new Date(Date.now() - 25 * 60_000).toISOString()
  const { data: busy } = await admin.from('radar_runs').select('id').eq('owner', owner).eq('status', 'running').gt('started_at', recent).limit(1)
  if (busy?.length) return { runId: busy[0].id, note: 'Already scanning.' }
  // Anything whose deadline has passed leaves the live radar before the run.
  await admin.from('radar_opportunities').update({ status: 'expired', closed_reason: 'The deadline passed.', changed_at: new Date().toISOString() })
    .eq('owner', owner).in('status', ['open', 'watching']).lt('deadline', new Date().toISOString())
  const { data: run, error } = await admin.from('radar_runs').insert({ owner, trigger }).select('id').single()
  if (error || !run) throw new Error(error?.message ?? 'Could not start a run')
  await admin.from('radar_jobs').insert(LANES.map((lane) => ({ run_id: run.id, owner, lane })))
  return { runId: run.id }
}

/* ---- What each lane is told ---- */
async function laneContext(admin: SupabaseClient, owner: string, lane: Lane): Promise<string> {
  const [prof, existing, unscored, decisions] = await Promise.all([
    admin.from('life_profile').select('radar_lens, mission, weekly_focus').eq('owner', owner).maybeSingle(),
    admin.from('radar_opportunities').select('id, title, org, fit, action, deadline, url, last_checked, category').eq('owner', owner).eq('lane', lane)
      .in('status', ['open', 'watching', 'tracked']).not('fit', 'is', null).order('fit', { ascending: false }).limit(30),
    lane === 'studio'
      ? admin.from('radar_opportunities').select('id, title, org, money, value_pence, deadline, summary').eq('owner', owner).is('fit', null).in('status', ['open']).order('first_seen').limit(20)
      : Promise.resolve({ data: [] as Json[] }),
    admin.from('radar_opportunities').select('title, org, lane, fit, status, decision_note').eq('owner', owner).in('status', ['tracked', 'watching', 'passed'])
      .not('decided_at', 'is', null).order('decided_at', { ascending: false }).limit(25),
  ])
  const lens = (prof.data?.radar_lens ?? {}) as Json
  const ventures = ((lens.ventures as { product: string; direction: string }[] | undefined) ?? [])
  const lines = [
    `TODAY: ${todayLong()} (${TZ}).`,
    '',
    LANE_BRIEF[lane],
    '',
    'THE FOUNDER\'S LENS',
    `What Hue & Heal is: ${cut(lens.identity, 900)}`,
    `Look hardest for: ${cut(lens.look_for, 700)}`,
    `Buyers to favour: ${cut(lens.buyers, 700)}`,
    `Score down: ${cut(lens.down_rank, 700)}`,
    `Geography: ${cut(lens.geography, 400)}`,
  ]
  if (lane === 'contracts') lines.push(`Contracts wanted: ${cut(lens.contracts, 700)}`)
  if (lane === 'venture') {
    lines.push('VENTURES:', ...ventures.map((v) => `- ${cut(v.product, 80)}: ${cut(v.direction, 700)}`), `Rule: ${cut(lens.venture_rule, 300)}`)
  }
  if (prof.data?.weekly_focus) lines.push(`The founder's focus this week: ${cut(prof.data.weekly_focus, 300)}`)
  lines.push('', 'ALREADY ON THE RADAR IN THIS LANE (do not file these again as new; use existing_id for a material change, and list any you find closed):')
  const ex = (existing.data ?? []) as Json[]
  lines.push(...(ex.length ? ex.map((o) => `- [${o.id}] fit ${o.fit}, ${o.action}: ${cut(o.title, 110)} / ${cut(o.org, 60)}${o.deadline ? `, closes ${String(o.deadline).slice(0, 10)}` : ''}, checked ${String(o.last_checked).slice(0, 10)}, ${cut(o.url, 160)}`) : ['(nothing yet)']))
  const un = (unscored.data ?? []) as Json[]
  if (un.length) {
    lines.push('', 'UNSCORED CONTRACTS FINDER NOTICES (score each with existing_id; no need to search for them):',
      ...un.map((o) => `- [${o.id}] ${cut(o.title, 140)} / ${cut(o.org, 80)}${o.value_pence ? `, £${Math.round(Number(o.value_pence) / 100).toLocaleString('en-GB')}` : ''}${o.deadline ? `, closes ${String(o.deadline).slice(0, 10)}` : ''}: ${cut(o.summary, 420)}`))
  }
  const dec = (decisions.data ?? []) as Json[]
  if (dec.length) {
    lines.push('', 'THE FOUNDER\'S RECENT DECISIONS (calibrate your scoring to these):',
      ...dec.map((d) => `- ${d.status === 'tracked' ? 'PURSUED' : d.status === 'passed' ? 'PASSED' : 'WATCHING'} (${d.lane}, you scored ${d.fit}): ${cut(d.title, 90)} / ${cut(d.org, 50)}${d.decision_note ? `. Her reason: "${cut(d.decision_note, 160)}"` : ''}`))
  }
  lines.push('', 'Search now. When finished, call file_opportunities once.')
  return lines.join('\n')
}

/* ---- Filing a lane's results ---- */
async function fileResults(admin: SupabaseClient, owner: string, lane: Lane, runId: string, input: Json): Promise<{ filed: number; closed: number; note: string }> {
  const now = new Date().toISOString()
  const opps = Array.isArray(input.opportunities) ? (input.opportunities as Json[]).slice(0, 30) : []
  const closed = Array.isArray(input.closed) ? (input.closed as Json[]).slice(0, 30) : []
  let filed = 0, shut = 0
  const problems: string[] = []
  for (const o of opps) {
    const fit = clamp(o.fit)
    const action = ACTIONS.includes(String(o.action)) ? String(o.action) : null
    const title = cut(o.title, 300)
    if (!title || !fit || !action) { problems.push(`skipped "${title || 'untitled'}": title, fit and action are required`); continue }
    const fd = (o.fit_detail ?? {}) as Json
    const url = /^https?:\/\//.test(String(o.url ?? '')) ? String(o.url).slice(0, 800) : ''
    const fields: Json = {
      category: CATEGORIES.includes(String(o.category)) ? String(o.category) : 'other',
      title, org: cut(o.org, 200), fit, action,
      fit_detail: { sector: clamp(fd.sector), scope: clamp(fd.scope), ambition: clamp(fd.ambition), capability: clamp(fd.capability), access: clamp(fd.access) },
      why: cut(o.why, 600), angle: cut(o.angle, 700), money: cut(o.money, 120),
      value_pence: Number(o.value_gbp) > 0 ? Math.round(Number(o.value_gbp) * 100) : null,
      deadline_note: cut(o.deadline_note, 200), location: cut(o.location, 120), product: cut(o.product, 80),
      source_name: cut(o.source_name, 120), last_checked: now, updated_at: now,
    }
    if (cut(o.summary, 600)) fields.summary = cut(o.summary, 600)
    const dl = isoDate(o.deadline); if (dl) fields.deadline = `${dl}T17:00:00Z`
    const sd = isoDate(o.signal_date); if (sd) fields.signal_date = sd
    if (url) fields.url = url
    const exId = String(o.existing_id ?? '').trim()
    if (exId) {
      const { data: prev } = await admin.from('radar_opportunities').select('id, fit, action, deadline, money').eq('id', exId).eq('owner', owner).maybeSingle()
      if (prev) {
        const material = prev.fit !== null && (prev.fit !== fit || prev.action !== action || (dl && String(prev.deadline ?? '').slice(0, 10) !== dl) || (fields.money && prev.money !== fields.money))
        if (material) { fields.changed_at = now; fields.change_note = cut(o.change_note, 240) || 'Details changed since the last scan.' }
        const { error } = await admin.from('radar_opportunities').update(fields).eq('id', exId).eq('owner', owner)
        if (error) problems.push(error.message); else filed++
        continue
      }
    }
    const row = { ...fields, owner, lane, run_id: runId, source: 'engine', source_ref: refOf(url, String(fields.org), title) }
    const { error } = await admin.from('radar_opportunities').upsert(row, { onConflict: 'owner,source,source_ref' })
    if (error) problems.push(error.message); else filed++
  }
  for (const c of closed) {
    const { data } = await admin.from('radar_opportunities').update({ status: 'closed', closed_reason: cut(c.reason, 240) || 'Closed at the source.', changed_at: now, last_checked: now })
      .eq('id', String(c.id)).eq('owner', owner).in('status', ['open', 'watching']).select('id')
    shut += (data ?? []).length
  }
  return { filed, closed: shut, note: problems.length ? problems.slice(0, 5).join('; ') : 'Filed.' }
}

/* ---- One step of a lane job ---- */
interface JobRow { id: string; run_id: string; owner: string; lane: Lane | 'brief'; status: string; messages: Anthropic.Beta.BetaMessageParam[]; steps: number; attempts: number; filed: number; closed: number; usage: Json }

async function laneStep(admin: SupabaseClient, job: JobRow): Promise<Partial<JobRow> & { status: string; error?: string | null }> {
  const lane = job.lane as Lane
  const messages = job.messages.length ? job.messages : [{ role: 'user' as const, content: await laneContext(admin, job.owner, lane) }]
  const res = await anthropic.beta.messages.create({
    model: LANE_MODEL,
    max_tokens: 16000,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    tools: [
      { type: 'web_search_20250305', name: 'web_search', max_uses: 12, user_location: { type: 'approximate', country: 'GB', city: 'London', timezone: TZ } },
      { type: 'web_fetch_20250910', name: 'web_fetch', max_uses: 8, max_content_tokens: 7000 },
      FILE_TOOL,
    ],
    messages,
    output_config: { effort: 'medium' },
    // The plain search and fetch tools put results straight into context, one
    // call at a time, which suits verify-then-file better than batch filtering.
    betas: ['web-fetch-2025-09-10'],
  } as never) as Anthropic.Beta.BetaMessage

  const usage = addUsage(job.usage ?? {}, LANE_MODEL, res.usage as unknown as Json)
  const steps = job.steps + 1
  if (res.stop_reason === 'refusal') return { status: 'failed', error: 'The model declined this search.', usage, steps, messages }
  messages.push({ role: 'assistant', content: res.content as never })
  if (res.stop_reason === 'pause_turn') return { status: steps >= MAX_STEPS ? 'done' : 'running', usage, steps, messages }

  // A tool input cut off at max_tokens can still parse; never file half a list.
  if (res.stop_reason === 'max_tokens') return { status: 'failed', error: 'The results were cut off before they could be filed.', usage, steps, messages }
  const uses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use' && b.name === 'file_opportunities')
  if (res.stop_reason !== 'tool_use' || !uses.length) return { status: 'done', usage, steps, messages }

  // Filing is the lane's last act, so the job ends here without another call.
  let filed = job.filed, closed = job.closed
  const notes: string[] = []
  for (const u of uses) {
    const r = await fileResults(admin, job.owner, lane, job.run_id, (u.input ?? {}) as Json)
    filed += r.filed; closed += r.closed
    if (r.note !== 'Filed.') notes.push(r.note)
  }
  return { status: 'done', usage, steps, messages, filed, closed, error: notes.length ? cut(notes.join('; '), 300) : null }
}

/* ---- The brief: priorities, verdict, insight ---- */
const BRIEF_SCHEMA = {
  type: 'object',
  properties: {
    priorities: { type: 'array', items: { type: 'object', properties: { text: s, opportunity_id: s }, required: ['text', 'opportunity_id'], additionalProperties: false } },
    verdict: { type: 'array', items: { type: 'object', properties: { label: s, text: s, opportunity_id: s }, required: ['label', 'text', 'opportunity_id'], additionalProperties: false } },
    insight: s,
  },
  required: ['priorities', 'verdict', 'insight'],
  additionalProperties: false,
}

async function briefStep(admin: SupabaseClient, job: JobRow): Promise<Partial<JobRow> & { status: string; error?: string | null }> {
  const since = new Date(Date.now() - 36 * 3600_000).toISOString()
  const [prof, live, closed, pipe] = await Promise.all([
    admin.from('life_profile').select('display_name, mission, weekly_focus').eq('owner', job.owner).maybeSingle(),
    admin.from('radar_opportunities').select('id, lane, category, title, org, fit, action, why, angle, money, deadline, deadline_note, location, signal_date, product, first_seen, changed_at, change_note, status')
      .eq('owner', job.owner).in('status', ['open', 'watching']).gte('fit', 3).order('fit', { ascending: false }).limit(60),
    admin.from('radar_opportunities').select('title, org, closed_reason').eq('owner', job.owner).in('status', ['closed', 'expired']).gte('changed_at', since).limit(15),
    admin.from('life_pipeline').select('title, org, stage, next_step').not('stage', 'in', '(won,lost,dismissed)').eq('owner', job.owner).limit(20),
  ])
  const day = (iso: unknown) => (iso ? String(iso).slice(0, 10) : '')
  const fresh = (o: Json) => (String(o.first_seen) > since ? 'NEW ' : o.changed_at && String(o.changed_at) > since ? 'UPDATED ' : '')
  const urgent = (o: Json) => (o.deadline && new Date(String(o.deadline)).getTime() - Date.now() < 7 * 86400_000 ? 'URGENT ' : '')
  const items = (live.data ?? []) as Json[]
  const prompt = [
    `TODAY: ${todayLong()}.`,
    `FOUNDER: ${cut(prof.data?.display_name, 40) || 'the founder'}. Mission: ${cut(prof.data?.mission, 300) || '(not written yet)'}. This week: ${cut(prof.data?.weekly_focus, 200) || '(not set)'}.`,
    '', 'LIVE OPPORTUNITIES (fit 3 and above):',
    ...items.map((o) => `- [${o.id}] ${fresh(o)}${urgent(o)}${o.lane}/${o.category} fit ${o.fit} ${o.action}${o.status === 'watching' ? ' (she is watching)' : ''}: ${cut(o.title, 110)} / ${cut(o.org, 60)}; ${cut(o.money, 60)}${o.deadline ? `; closes ${day(o.deadline)}` : ''}${o.deadline_note ? ` (${cut(o.deadline_note, 80)})` : ''}; ${cut(o.location, 40)}${o.product ? `; for ${o.product}` : ''}. Why: ${cut(o.why, 200)} Angle: ${cut(o.angle, 200)}${o.change_note ? ` Changed: ${cut(o.change_note, 120)}` : ''}`),
    '', 'CLOSED OR EXPIRED SINCE YESTERDAY:', ...((closed.data ?? []) as Json[]).map((c) => `- ${cut(c.title, 90)} / ${cut(c.org, 50)}: ${cut(c.closed_reason, 120)}`),
    '', 'ALREADY IN HER PIPELINE:', ...((pipe.data ?? []) as Json[]).map((p) => `- ${cut(p.title, 80)} / ${cut(p.org, 40)}: ${p.stage}${p.next_step ? `, next: ${cut(p.next_step, 60)}` : ''}`),
  ].join('\n')
  const res = await anthropic.beta.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 6000,
    system: RULES.brief_system,
    messages: [{ role: 'user', content: prompt }],
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: BRIEF_SCHEMA } },
  } as never) as Anthropic.Beta.BetaMessage
  const usage = addUsage(job.usage ?? {}, BRIEF_MODEL, res.usage as unknown as Json)
  const text = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text).join('')
  let brief: Json
  try { brief = JSON.parse(text) } catch { return { status: 'failed', error: 'The brief did not come back as JSON.', usage, steps: job.steps + 1 } }
  const ids = new Set(items.map((o) => String(o.id)))
  const link = (id: unknown) => (ids.has(String(id)) ? String(id) : null)
  const clean = {
    priorities: ((brief.priorities as Json[]) ?? []).slice(0, 3).map((p) => ({ text: cut(p.text, 400), opportunity_id: link(p.opportunity_id) })),
    verdict: ((brief.verdict as Json[]) ?? []).slice(0, 5).map((v) => ({ label: cut(v.label, 60), text: cut(v.text, 300), opportunity_id: link(v.opportunity_id) })),
    insight: cut(brief.insight, 900),
  }
  await admin.from('radar_runs').update({ brief: clean }).eq('id', job.run_id)
  return { status: 'done', usage, steps: job.steps + 1 }
}

/* ---- The tick: claim waiting jobs, run one step each, chain ---- */
async function tick(admin: SupabaseClient): Promise<Json> {
  const now = new Date()
  // Runs that have been going far too long are called what they are.
  const stale = new Date(now.getTime() - 45 * 60_000).toISOString()
  const { data: old } = await admin.from('radar_runs').select('id').eq('status', 'running').lt('started_at', stale)
  for (const r of old ?? []) {
    await admin.from('radar_jobs').update({ status: 'failed', error: 'The run did not finish in time.' }).eq('run_id', r.id).in('status', ['queued', 'running'])
    await finishRun(admin, r.id)
  }
  const { data: cand } = await admin.from('radar_jobs').select('id').in('status', ['queued', 'running'])
    .or(`lock_until.is.null,lock_until.lt.${now.toISOString()}`).order('created_at').limit(4)
  const claimed: JobRow[] = []
  for (const c of cand ?? []) {
    const { data } = await admin.from('radar_jobs').update({ lock_until: new Date(now.getTime() + LOCK_SECONDS * 1000).toISOString(), status: 'running', updated_at: now.toISOString() })
      .eq('id', c.id).or(`lock_until.is.null,lock_until.lt.${now.toISOString()}`).select('*').maybeSingle()
    if (data) claimed.push(data as JobRow)
  }
  const out: Json = {}
  await Promise.all(claimed.map(async (job) => {
    let patch: Partial<JobRow> & { status: string; error?: string | null }
    try {
      patch = job.lane === 'brief' ? await briefStep(admin, job) : await laneStep(admin, job)
    } catch (e) {
      const attempts = job.attempts + 1
      const msg = e instanceof Anthropic.APIError ? `${e.status}: ${e.message}` : (e as Error).message
      console.error('radar step', job.lane, msg)
      patch = { status: attempts >= MAX_ATTEMPTS ? 'failed' : 'running', attempts, error: cut(msg, 300) }
    }
    await admin.from('radar_jobs').update({ ...patch, lock_until: null, updated_at: new Date().toISOString() }).eq('id', job.id)
    out[`${job.lane}`] = patch.status
    if (patch.status === 'done' || patch.status === 'failed') await afterJob(admin, job)
  }))
  const { count } = await admin.from('radar_jobs').select('id', { count: 'exact', head: true }).in('status', ['queued', 'running']).is('lock_until', null)
  if ((count ?? 0) > 0) kick()
  return out
}

async function afterJob(admin: SupabaseClient, job: JobRow) {
  const { data: jobs } = await admin.from('radar_jobs').select('lane, status').eq('run_id', job.run_id)
  const all = (jobs ?? []) as { lane: string; status: string }[]
  const lanesDone = LANES.every((l) => all.some((j) => j.lane === l && (j.status === 'done' || j.status === 'failed')))
  if (!lanesDone) return
  const brief = all.find((j) => j.lane === 'brief')
  if (!brief) { await admin.from('radar_jobs').insert({ run_id: job.run_id, owner: job.owner, lane: 'brief' }); return }
  if (brief.status === 'done' || brief.status === 'failed') await finishRun(admin, job.run_id)
}

async function finishRun(admin: SupabaseClient, runId: string) {
  const { data: jobs } = await admin.from('radar_jobs').select('lane, status, usage, error').eq('run_id', runId)
  const all = (jobs ?? []) as { lane: string; status: string; usage: Json; error: string | null }[]
  const usage = all.reduce((t, j) => ({
    input_tokens: Number(t.input_tokens) + Number(j.usage?.input_tokens ?? 0), output_tokens: Number(t.output_tokens) + Number(j.usage?.output_tokens ?? 0),
    searches: Number(t.searches) + Number(j.usage?.searches ?? 0), fetches: Number(t.fetches) + Number(j.usage?.fetches ?? 0),
    usd: Math.round((Number(t.usd) + Number(j.usage?.usd ?? 0)) * 10000) / 10000,
  }), { input_tokens: 0, output_tokens: 0, searches: 0, fetches: 0, usd: 0 } as Json)
  const failed = all.filter((j) => j.status === 'failed')
  await admin.from('radar_runs').update({
    status: failed.length === all.length ? 'failed' : 'done', usage, finished_at: new Date().toISOString(),
    error: failed.length ? failed.map((j) => `${j.lane}: ${j.error ?? 'failed'}`).join('; ').slice(0, 600) : null,
  }).eq('id', runId)
}

/* Chain the next step without waiting for the minute cron. */
function kick() {
  EdgeRuntime.waitUntil(fetch(`${SUPABASE_URL}/functions/v1/radar-engine`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-cron-secret': CRON_SECRET }, body: JSON.stringify({ op: 'tick' }),
  }).catch(() => null))
}

/* The user id from the JWT. The database checks the token's signature on
   every query, so a forged token fails at the first read below. */
function subOf(jwt: string): string | null {
  try {
    const p = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof p.sub === 'string' && Number(p.exp) * 1000 > Date.now() ? p.sub : null
  } catch { return null }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const body = await req.json().catch(() => ({})) as { op?: string }

  if (CRON_SECRET && req.headers.get('x-cron-secret') === CRON_SECRET) {
    if (body.op === 'start') {
      const { data: owners } = await admin.from('life_profile').select('owner').neq('radar_lens', '{}')
      const started: string[] = []
      for (const o of owners ?? []) { const r = await startRun(admin, o.owner, 'schedule'); if (r.runId) started.push(r.runId) }
      kick()
      return json({ ok: true, started })
    }
    if (body.op === 'tick') {
      // Answer the caller at once; the steps run in the background.
      EdgeRuntime.waitUntil(tick(admin).catch((e) => console.error('radar tick', (e as Error).message)))
      return json({ ok: true })
    }
    return json({ error: 'Unknown op' }, 400)
  }

  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
  const uid = subOf(auth.slice(7))
  if (!uid) return json({ error: 'Your session has expired. Sign in again.' }, 401)
  const asUser = createClient(SUPABASE_URL, ANON, { global: { headers: { authorization: auth } } })
  const { error: authErr } = await asUser.from('life_profile').select('owner').limit(1)
  if (authErr) return json({ error: 'Your session has expired. Sign in again.' }, 401)

  if (body.op === 'run') {
    try {
      const r = await startRun(admin, uid, 'manual')
      kick()
      return json(r)
    } catch (e) { return json({ error: (e as Error).message }, 500) }
  }
  return json({ error: 'Unknown op' }, 400)
})

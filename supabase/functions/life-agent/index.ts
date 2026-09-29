// ============================================================================
// life-agent: Copilot V2's one assistant (PA, coach, operating system).
// POST { message, via?: 'chat' | 'voice', brandId?: string | null }
// Authorization: Bearer <user jwt>. Every read and write runs as the user,
// so row security keeps it to their own life and businesses.
// Returns { reply, actions: [{ kind, summary, ref }], pending: LifeAction[] }.
// Anything that leaves the building (email, booking) is filed as a pending
// life_action and waits for the founder's yes in the app.
// Secrets: ANTHROPIC_API_KEY.
// ============================================================================
import Anthropic from 'npm:@anthropic-ai/sdk@0.129.0'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const MODEL = 'claude-opus-5-5'
const MAX_TURNS = 8
const TZ = 'Europe/London'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })

// Stable, so it caches. Volatile state goes in the user turn, after it.
const SYSTEM = `You are Copilot, the founder's life OS: their personal assistant, their coach and the operating system for their portfolio of businesses, in one voice.

As PA: keep their tasks, milestones, calendar and pipeline true. When they mention something to do, a date, a meeting, a lead or a tender, record it with the tools without being asked twice. Check the calendar before suggesting a time.
As coach: you hold their mission, purpose and weekly focus. When the week drifts from them, say so plainly and briefly. Ask at most one question per reply, and only when the answer changes what you do.
As commercial partner: the Opportunity Radar (in CURRENT STATE) is the Commercial Engine's scored view of tenders, contracts, funding and outbound targets. Talk about it plainly: fit out of 5, the action, the angle, the deadline. When the founder decides on an opportunity ("pursue", "watch", "pass on that, too generic"), record it with radar_decide and keep their reason; reasons teach the engine. run_radar starts a fresh scan (it takes a few minutes).
Outreach emails: lead with the organisation's experience opportunity, never with "we are a design studio". One short paragraph on who the founder is and why Hue & Heal. Invite a conversation rather than selling a project. Under 180 words, signed with the founder's first name and "Founder, Hue & Heal". If you do not know the recipient's address, leave "to" empty; the founder adds it on the card.
As operating system: work for a business's team (content, research, outreach, finance, legal review) goes to that team with brief_team. Their approvals come back to the founder in the app.

Act without asking on anything internal and reversible (tasks, milestones, events, pipeline, focus). Anything that leaves the building (sending an email, making a booking, publishing, spending) is drafted with draft_email or request_booking and waits for the founder's approval; say that it is waiting. Never claim an email was sent or a booking made. Never invent facts about people, organisations or money; ask, or leave the field empty.

Only change the mission or purpose when the founder explicitly asks.

Replies: short, warm, plain British English, first person. Two or three sentences unless they ask for more. No headings. Never use em dashes or en dashes. Never assume the founder's gender. Always write "Hue & Heal", never "Hue and Heal". When a reply will be read aloud (via: voice), keep it to one or two sentences with no lists.`

type Json = Record<string, unknown>

const str = { type: 'string' } as const
const brandProp = { type: 'string', description: 'Business name exactly as listed in BUSINESSES, or omit for life (not a business).' }
const dateProp = { type: 'string', description: 'YYYY-MM-DD in the founder\'s time zone.' }

const TOOLS: Anthropic.Beta.BetaTool[] = [
  { name: 'add_task', description: 'Add a task. Set is_now for the single thing to do first today (clears it from any other task).',
    input_schema: { type: 'object', properties: { title: str, due: dateProp, brand: brandProp, is_now: { type: 'boolean' } }, required: ['title'] } },
  { name: 'complete_task', description: 'Mark a task done by its id from OPEN TASKS.',
    input_schema: { type: 'object', properties: { task_id: str }, required: ['task_id'] } },
  { name: 'add_milestone', description: 'Add a roadmap milestone.',
    input_schema: { type: 'object', properties: { title: str, horizon: { type: 'string', enum: ['week', 'quarter', 'year', 'someday'] }, due: dateProp, detail: str, brand: brandProp }, required: ['title', 'horizon'] } },
  { name: 'update_milestone', description: 'Change a milestone from MILESTONES.',
    input_schema: { type: 'object', properties: { id: str, status: { type: 'string', enum: ['planned', 'active', 'done', 'dropped'] }, horizon: { type: 'string', enum: ['week', 'quarter', 'year', 'someday'] }, due: dateProp, title: str }, required: ['id'] } },
  { name: 'add_pipeline', description: 'Add a lead, deal, partnership or tender to the pipeline.',
    input_schema: { type: 'object', properties: { kind: { type: 'string', enum: ['lead', 'deal', 'partnership', 'tender'] }, title: str, org: str, contact_name: str, contact_email: str, value_gbp: { type: 'number' }, stage: { type: 'string', enum: ['new', 'contacted', 'meeting', 'proposal', 'won', 'lost', 'tracking'] }, next_step: str, next_due: dateProp, url: str, brand: brandProp }, required: ['kind', 'title'] } },
  { name: 'update_pipeline', description: 'Move or update a pipeline item from PIPELINE.',
    input_schema: { type: 'object', properties: { id: str, stage: { type: 'string', enum: ['new', 'contacted', 'meeting', 'proposal', 'won', 'lost', 'tracking', 'dismissed'] }, next_step: str, next_due: dateProp, notes: str, value_gbp: { type: 'number' } }, required: ['id'] } },
  { name: 'add_event', description: 'Put something in the founder\'s own calendar (Copilot calendar, not Outlook).',
    input_schema: { type: 'object', properties: { title: str, starts_at: { type: 'string', description: 'ISO 8601 with offset, founder\'s time zone.' }, ends_at: { type: 'string' }, location: str, brand: brandProp }, required: ['title', 'starts_at'] } },
  { name: 'set_focus', description: 'Set the weekly focus, or (only when explicitly asked) the mission or purpose.',
    input_schema: { type: 'object', properties: { weekly_focus: str, mission: str, purpose: str }, required: [] } },
  { name: 'draft_email', description: 'Draft an email for the founder to approve. Nothing is sent until they approve it in the app, where they can edit it.',
    input_schema: { type: 'object', properties: { to: { type: 'string', description: 'Email address, if known. Leave empty rather than guess.' }, subject: str, body: { type: 'string', description: 'Plain text, signed as the founder.' }, brand: brandProp }, required: ['subject', 'body'] } },
  { name: 'request_booking', description: 'File a booking for the founder to approve (travel, venue, appointment). Copilot cannot pay or book directly.',
    input_schema: { type: 'object', properties: { what: str, when: str, where: str, notes: str, brand: brandProp }, required: ['what'] } },
  { name: 'brief_team', description: 'Send work to a business\'s team through its chief of staff. Use for content, research, outreach, finance or legal work in that business.',
    input_schema: { type: 'object', properties: { brand: brandProp, text: { type: 'string', description: 'The brief, in the founder\'s words plus any context they gave.' } }, required: ['brand', 'text'] } },
  { name: 'radar_decide', description: 'Record the founder\'s decision on a radar opportunity from OPPORTUNITY RADAR. pursue files it in the pipeline with a first next step; watch keeps an eye on it; pass removes it; reopen puts it back. Include their reason in note.',
    input_schema: { type: 'object', properties: { id: str, decision: { type: 'string', enum: ['pursue', 'watch', 'pass', 'reopen'] }, note: str }, required: ['id', 'decision'] } },
  { name: 'run_radar', description: 'Start a fresh Commercial Engine scan across all four pipelines. Results arrive in a few minutes on the Radar.',
    input_schema: { type: 'object', properties: {}, required: [] } },
]

function londonNow(): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date())
}
const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
const cut = (s: unknown, n = 140) => String(s ?? '').replace(/\s+/g, ' ').slice(0, n)

interface Ctx { db: SupabaseClient; uid: string; token: string; brands: { id: string; name: string; sender_personal?: string; sender_email?: string }[]; actions: { kind: string; summary: string; ref?: string }[]; messageId?: string }

function brandId(ctx: Ctx, name: unknown): string | null {
  const n = String(name ?? '').trim().toLowerCase()
  if (!n) return null
  return ctx.brands.find((b) => b.name.toLowerCase() === n)?.id ?? ctx.brands.find((b) => b.name.toLowerCase().includes(n))?.id ?? null
}

async function state(ctx: Ctx): Promise<string> {
  const now = new Date().toISOString()
  const in14 = new Date(Date.now() + 14 * 86400000).toISOString()
  const [prof, tasks, ms, pipe, evs, pend, appr, prios, opps, run] = await Promise.all([
    ctx.db.from('life_profile').select('*').maybeSingle(),
    ctx.db.from('life_tasks').select('id, title, due, brand_id, is_now').eq('status', 'open').order('is_now', { ascending: false }).order('due', { ascending: true, nullsFirst: false }).limit(40),
    ctx.db.from('life_milestones').select('id, title, horizon, due, status, brand_id').in('status', ['planned', 'active']).order('due', { ascending: true, nullsFirst: false }).limit(40),
    ctx.db.from('life_pipeline').select('id, kind, title, org, stage, next_step, next_due, value_pence, deadline, brand_id').not('stage', 'in', '(won,lost,dismissed)').order('next_due', { ascending: true, nullsFirst: false }).limit(40),
    ctx.db.from('life_events').select('title, starts_at, ends_at, all_day, location').gte('starts_at', now).lte('starts_at', in14).order('starts_at').limit(40),
    ctx.db.from('life_actions').select('kind, summary').eq('status', 'pending').limit(10),
    ctx.db.from('role_jobs').select('task, dept, brand_id').eq('status', 'done').eq('approval', 'pending').limit(15),
    ctx.db.from('priorities').select('title, brand_id, position').eq('status', 'active').order('position').limit(20),
    ctx.db.from('radar_opportunities').select('id, lane, title, org, fit, action, angle, money, deadline, location, status, url').in('status', ['open', 'watching']).gte('fit', 3).order('fit', { ascending: false }).limit(30),
    ctx.db.from('radar_runs').select('brief, finished_at').not('brief', 'is', null).order('started_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  const bn = (id: unknown) => (id ? ctx.brands.find((b) => b.id === id)?.name ?? '' : 'life')
  const p = (prof.data ?? {}) as Json
  const fmtTime = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
  const lines: string[] = [
    `NOW: ${londonNow()} (${TZ}). Today is ${todayISO()}.`,
    `FOUNDER: ${cut(p.display_name, 60) || 'the founder'}`,
    `MISSION: ${cut(p.mission, 400) || '(not set yet)'}`,
    `PURPOSE: ${cut(p.purpose, 400) || '(not set yet)'}`,
    `WEEKLY FOCUS: ${cut(p.weekly_focus, 300) || '(not set)'}`,
    `FOCUS AREAS: ${((p.focus_areas as { name?: string }[] | undefined) ?? []).map((f) => f.name).filter(Boolean).join('; ') || '(none)'}`,
    `BUSINESSES: ${ctx.brands.map((b) => b.name).join('; ') || '(none)'}`,
    '', 'OPEN TASKS:', ...((tasks.data ?? []) as Json[]).map((t) => `- [${t.id}] ${t.is_now ? '(NOW) ' : ''}${cut(t.title)}${t.due ? `, due ${t.due}` : ''} (${bn(t.brand_id)})`),
    '', 'MILESTONES:', ...((ms.data ?? []) as Json[]).map((m) => `- [${m.id}] ${cut(m.title)}: ${m.horizon}${m.due ? `, due ${m.due}` : ''}, ${m.status} (${bn(m.brand_id)})`),
    '', 'PIPELINE:', ...((pipe.data ?? []) as Json[]).map((x) => `- [${x.id}] ${x.kind}: ${cut(x.title, 90)}${x.org ? ` / ${cut(x.org, 50)}` : ''}, ${x.stage}${x.value_pence ? `, £${Math.round(Number(x.value_pence) / 100).toLocaleString('en-GB')}` : ''}${x.next_step ? `, next: ${cut(x.next_step, 80)}` : ''}${x.next_due ? ` by ${x.next_due}` : ''}${x.deadline ? `, closes ${String(x.deadline).slice(0, 10)}` : ''} (${bn(x.brand_id)})`),
    '', 'CALENDAR, NEXT 14 DAYS:', ...((evs.data ?? []) as Json[]).map((e) => `- ${fmtTime(String(e.starts_at))}: ${cut(e.title, 90)}${e.location ? ` @ ${cut(e.location, 40)}` : ''}`),
    '', `WAITING FOR THE FOUNDER'S APPROVAL: ${((pend.data ?? []) as Json[]).map((a) => `${a.kind}: ${cut(a.summary, 80)}`).join('; ') || 'nothing from you'}; team: ${((appr.data ?? []) as Json[]).map((j) => `${cut(String(j.task).replace(/^[A-Z]+:\s*/, ''), 70)} (${bn(j.brand_id)})`).join('; ') || 'nothing'}`,
    '', 'BUSINESS PRIORITIES:', ...((prios.data ?? []) as Json[]).map((x) => `- ${cut(x.title)} (${bn(x.brand_id)})`),
    '', `OPPORTUNITY RADAR${run.data?.finished_at ? ` (scanned ${fmtTime(String(run.data.finished_at))})` : ''}:`,
    ...(((run.data?.brief as { priorities?: { text: string }[] } | null)?.priorities ?? []).map((p, i) => `Priority ${i + 1}: ${cut(p.text, 220)}`)),
    ...((opps.data ?? []) as Json[]).map((o) => `- [${o.id}] ${o.lane}, fit ${o.fit}/5, ${String(o.action).replace('_', ' ')}${o.status === 'watching' ? ' (watching)' : ''}: ${cut(o.title, 90)} / ${cut(o.org, 50)}${o.money ? `, ${cut(o.money, 40)}` : ''}${o.deadline ? `, closes ${String(o.deadline).slice(0, 10)}` : ''}${o.location ? `, ${cut(o.location, 30)}` : ''}. Angle: ${cut(o.angle, 160)}`),
  ]
  return lines.join('\n')
}

async function runTool(ctx: Ctx, name: string, input: Json): Promise<string> {
  const db = ctx.db
  const did = (kind: string, summary: string, ref?: string) => { ctx.actions.push({ kind, summary, ref }); return JSON.stringify({ ok: true, id: ref ?? null }) }
  const fail = (e: { message?: string } | null) => JSON.stringify({ ok: false, error: e?.message ?? 'failed' })
  switch (name) {
    case 'add_task': {
      if (input.is_now) await db.from('life_tasks').update({ is_now: false }).eq('is_now', true)
      const { data, error } = await db.from('life_tasks').insert({ title: String(input.title), due: input.due || null, brand_id: brandId(ctx, input.brand), is_now: !!input.is_now, source: 'chat' }).select('id').single()
      return error ? fail(error) : did('task', `Added task: ${cut(input.title, 80)}`, data.id)
    }
    case 'complete_task': {
      const { error } = await db.from('life_tasks').update({ status: 'done', is_now: false, done_at: new Date().toISOString() }).eq('id', String(input.task_id))
      return error ? fail(error) : did('task_done', 'Marked a task done', String(input.task_id))
    }
    case 'add_milestone': {
      const { data, error } = await db.from('life_milestones').insert({ title: String(input.title), horizon: input.horizon ?? 'quarter', due: input.due || null, detail: String(input.detail ?? ''), brand_id: brandId(ctx, input.brand) }).select('id').single()
      return error ? fail(error) : did('milestone', `Added milestone: ${cut(input.title, 80)}`, data.id)
    }
    case 'update_milestone': {
      const patch: Json = { updated_at: new Date().toISOString() }
      for (const k of ['status', 'horizon', 'due', 'title']) if (input[k]) patch[k] = input[k]
      const { error } = await db.from('life_milestones').update(patch).eq('id', String(input.id))
      return error ? fail(error) : did('milestone', 'Updated a milestone', String(input.id))
    }
    case 'add_pipeline': {
      const row = { kind: input.kind ?? 'lead', title: String(input.title), org: String(input.org ?? ''), contact_name: String(input.contact_name ?? ''), contact_email: String(input.contact_email ?? ''), value_pence: input.value_gbp ? Math.round(Number(input.value_gbp) * 100) : null, stage: input.stage ?? 'new', next_step: String(input.next_step ?? ''), next_due: input.next_due || null, url: String(input.url ?? ''), brand_id: brandId(ctx, input.brand), source: 'chat' }
      const { data, error } = await db.from('life_pipeline').insert(row).select('id').single()
      return error ? fail(error) : did('pipeline', `Added to pipeline: ${cut(input.title, 80)}`, data.id)
    }
    case 'update_pipeline': {
      const patch: Json = { updated_at: new Date().toISOString() }
      for (const k of ['stage', 'next_step', 'next_due', 'notes']) if (input[k]) patch[k] = input[k]
      if (input.value_gbp) patch.value_pence = Math.round(Number(input.value_gbp) * 100)
      const { error } = await db.from('life_pipeline').update(patch).eq('id', String(input.id))
      return error ? fail(error) : did('pipeline', `Updated pipeline${input.stage ? `: now ${input.stage}` : ''}`, String(input.id))
    }
    case 'add_event': {
      const start = new Date(String(input.starts_at))
      if (isNaN(start.getTime())) return JSON.stringify({ ok: false, error: 'starts_at is not a valid date' })
      const { data, error } = await db.from('life_events').insert({ title: String(input.title), starts_at: start.toISOString(), ends_at: input.ends_at ? new Date(String(input.ends_at)).toISOString() : null, location: String(input.location ?? ''), brand_id: brandId(ctx, input.brand), source: 'chat' }).select('id').single()
      return error ? fail(error) : did('event', `In the calendar: ${cut(input.title, 70)}`, data.id)
    }
    case 'set_focus': {
      const patch: Json = { owner: ctx.uid, updated_at: new Date().toISOString() }
      for (const k of ['weekly_focus', 'mission', 'purpose']) if (typeof input[k] === 'string') patch[k] = input[k]
      const { error } = await db.from('life_profile').upsert(patch, { onConflict: 'owner' })
      return error ? fail(error) : did('focus', input.mission || input.purpose ? 'Updated your mission' : 'Set this week\'s focus')
    }
    case 'draft_email': {
      const bid = brandId(ctx, input.brand)
      const b = ctx.brands.find((x) => x.id === bid) ?? ctx.brands.find((x) => /hue\s*&\s*heal/i.test(x.name))
      const from = b?.sender_personal || b?.sender_email || ''
      const to = String(input.to ?? '').trim()
      const summary = `Email${to ? ` to ${cut(to, 60)}` : ''}: ${cut(input.subject, 70)}`
      const { data, error } = await db.from('life_actions').insert({ kind: 'email', summary, brand_id: bid, payload: { to, subject: String(input.subject), body: String(input.body), from }, message_id: ctx.messageId ?? null }).select('id').single()
      return error ? fail(error) : did('approval', `${summary} (waiting for you)`, data.id)
    }
    case 'request_booking': {
      const summary = `Booking: ${cut(input.what, 70)}${input.when ? `, ${cut(input.when, 40)}` : ''}`
      const { data, error } = await db.from('life_actions').insert({ kind: 'booking', summary, brand_id: brandId(ctx, input.brand), payload: { what: input.what, when: input.when ?? '', where: input.where ?? '', notes: input.notes ?? '' }, message_id: ctx.messageId ?? null }).select('id').single()
      return error ? fail(error) : did('approval', `${summary} (waiting for you)`, data.id)
    }
    case 'brief_team': {
      const bid = brandId(ctx, input.brand)
      if (!bid) return JSON.stringify({ ok: false, error: 'Unknown business. Use a name from BUSINESSES.' })
      const { data: roles } = await db.from('roles').select('id, key, dept, seat, enabled').eq('brand_id', bid)
      const chief = (roles ?? []).find((r: Json) => r.key === 'chief' && r.enabled)
      if (!chief) return JSON.stringify({ ok: false, error: 'That business has no chief of staff hired yet.' })
      const text = String(input.text).trim()
      const { data: brief, error: be } = await db.from('role_briefings').insert({ text, source: 'studio', brand_id: bid }).select('id').single()
      if (be) return fail(be)
      const { data: job, error: je } = await db.from('role_jobs').insert({ role_id: chief.id, dept: chief.dept, task: `ROUTE: ${text}`, source: 'studio', brand_id: bid, briefing_id: brief.id }).select('id').single()
      if (je) return fail(je)
      fetch(`${SUPABASE_URL}/functions/v1/role-worker`, { method: 'POST', headers: { authorization: `Bearer ${ctx.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ jobId: job.id }) }).catch(() => {})
      const b = ctx.brands.find((x) => x.id === bid)
      return did('team', `Briefed the ${b?.name ?? ''} team`, job.id)
    }
    case 'radar_decide': {
      const decision = String(input.decision)
      const { data, error } = await db.rpc('radar_decide', { opp: String(input.id), decision, note: String(input.note ?? '') })
      if (error) return fail(error)
      const { data: o } = await db.from('radar_opportunities').select('title, org').eq('id', String(input.id)).maybeSingle()
      const name = cut(o?.org || o?.title, 60)
      return did('radar', decision === 'pursue' ? `In your pipeline: ${name}` : decision === 'pass' ? `Passed on ${name}` : decision === 'watch' ? `Watching ${name}` : `Back on the radar: ${name}`, (data as string | null) ?? String(input.id))
    }
    case 'run_radar': {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/radar-engine`, { method: 'POST', headers: { authorization: `Bearer ${ctx.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ op: 'run' }) }).catch(() => null)
      const out = res ? await res.json().catch(() => ({})) as { note?: string; error?: string } : { error: 'The engine did not answer.' }
      if (out.error) return JSON.stringify({ ok: false, error: out.error })
      return did('radar', out.note === 'Already scanning.' ? 'The radar is already scanning' : 'Started a radar scan')
    }
  }
  return JSON.stringify({ ok: false, error: `Unknown tool ${name}` })
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
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
  const db = createClient(SUPABASE_URL, ANON, { global: { headers: { authorization: auth } } })
  const uid = subOf(auth.slice(7))
  if (!uid) return json({ error: 'Your session has expired. Sign in again.' }, 401)
  const { error: authErr } = await db.from('life_profile').select('owner').limit(1)
  if (authErr) return json({ error: 'Your session has expired. Sign in again.' }, 401)

  const body = await req.json().catch(() => ({})) as { message?: string; via?: string }
  const message = String(body.message ?? '').trim().slice(0, 4000)
  if (!message) return json({ error: 'Say something first.' }, 400)
  const via = body.via === 'voice' ? 'voice' : 'chat'

  const { data: brands } = await db.from('brand_profiles').select('id, name, sender_personal, sender_email')
  const ctx: Ctx = { db, uid, token: auth.slice(7), brands: (brands ?? []) as Ctx['brands'], actions: [] }

  const { data: history } = await db.from('life_messages').select('role, text').order('created_at', { ascending: false }).limit(16)
  const { data: saved } = await db.from('life_messages').insert({ role: 'user', text: message, via }).select('id').single()
  ctx.messageId = saved?.id

  // Past turns as plain text; the live state rides with the new message.
  const messages: Anthropic.Beta.BetaMessageParam[] = []
  for (const m of [...(history ?? [])].reverse()) {
    const role = m.role === 'assistant' ? 'assistant' : 'user'
    if (!messages.length && role === 'assistant') continue
    const last = messages[messages.length - 1]
    if (last && last.role === role) last.content = `${last.content as string}\n\n${m.text}`
    else messages.push({ role, content: String(m.text) })
  }
  if (messages.length && messages[messages.length - 1].role === 'user') messages.push({ role: 'assistant', content: 'Noted.' })
  messages.push({ role: 'user', content: [
    { type: 'text', text: `CURRENT STATE\n${await state(ctx)}` },
    { type: 'text', text: `FOUNDER (${via}): ${message}` },
  ] })

  let reply = ''
  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const res = await anthropic.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        tools: TOOLS,
        messages,
        output_config: { effort: 'medium' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      } as never) as Anthropic.Beta.BetaMessage

      if (res.stop_reason === 'refusal') { reply = 'I can\'t help with that one. Is there another way I can take it off your plate?'; break }
      const text = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text).join('\n').trim()
      const uses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use')
      if (res.stop_reason === 'pause_turn') { messages.push({ role: 'assistant', content: res.content }); continue }
      if (res.stop_reason !== 'tool_use' || !uses.length) { reply = text; break }

      messages.push({ role: 'assistant', content: res.content })
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = []
      for (const u of uses) {
        let out: string
        try { out = await runTool(ctx, u.name, (u.input ?? {}) as Json) } catch (e) { out = JSON.stringify({ ok: false, error: String((e as Error).message ?? e) }) }
        results.push({ type: 'tool_result', tool_use_id: u.id, content: out, is_error: out.includes('"ok":false') })
      }
      messages.push({ role: 'user', content: results })
      if (turn === MAX_TURNS - 1) reply = text || 'Done.'
    }
  } catch (e) {
    const status = e instanceof Anthropic.APIError ? e.status : 0
    console.error('life-agent', status, (e as Error).message)
    reply = status === 429 ? 'I\'m being rate limited. Give me a minute and ask again.' : 'Something went wrong on my side. Try that again in a moment.'
  }
  reply = (reply || 'Done.').replace(/[\u2013\u2014]/g, ', ')

  await db.from('life_messages').insert({ role: 'assistant', text: reply, via, actions: ctx.actions })
  const { data: pending } = await db.from('life_actions').select('id, kind, summary, payload, status, created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(10)
  return json({ reply, actions: ctx.actions, pending: pending ?? [] })
})

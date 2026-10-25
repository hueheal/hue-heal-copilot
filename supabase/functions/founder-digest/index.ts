// ============================================================================
// founder-digest: the Founder's Digest, one branded email a day for the
// founder. Today's three, industry news, one ready-to-post piece for each of
// Hue & Heal, Remedae and Moss Island (saved as drafts in the studio, with a
// cover image), a coaching lesson from a 30-lesson curriculum, and dated next
// steps per company (saved as tasks, so tomorrow's digest knows what slipped).
//
// A day is one row in founder_digests, and the row is the job:
//   mac     context is ready; the Mac's scheduled Claude task (on the Claude
//           plan, so free) researches and writes, then files the result.
//           If nothing is filed by send time, the cloud takes over.
//   news    the cloud's research step (Sonnet with web search)
//   write   the cloud's writing step (Opus, structured output)
//   filed   a written digest waits to be checked and saved: posts become
//           drafts, next steps become tasks, the lesson moves on
//   images  one cover image per post (Higgsfield), uploaded to the studio
//   send    the email, once the send time has come
//   sent | failed
// Each invocation advances a row by one step, so no call outlives the
// platform's 150 second limit. Steps chain themselves; the five-minute
// founder-digest-tick cron is the safety net.
//
// POST, cron (x-cron-secret): { op: 'tick' }
//                             { op: 'open_mac' | 'run', owner }  via founder_digest_call()
// POST, founder (Bearer jwt): { op: 'run' }      write today's now and send it when ready
//                             { op: 'preview', date? }  the email as HTML
//                             { op: 'resend', date? }   send that day's again
// Secrets: ANTHROPIC_API_KEY, CRON_SECRET, RESEND_API_KEY, HIGGSFIELD_KEY, HH_SITE_URL.
// ============================================================================
import Anthropic from 'npm:@anthropic-ai/sdk@0.129.0'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'
import { resendKeyFor } from '../_shared/resend.ts'
import { submitImage, checkImage, download, hasHiggsfield } from '../_shared/higgsfield.ts'
import { loadLibrary, composePrompt, referenceFor } from '../_shared/imagery.ts'
import { digestEmail, type DigestContent, type DigestPost } from '../_shared/digest-email.ts'
import RULES from '../_shared/digest-rules.json' with { type: 'json' }

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const SITE = (Deno.env.get('HH_SITE_URL') ?? 'https://www.hueandheal.com').replace(/\/$/, '')
const APP_URL = 'https://copilotadmin.hueandheal.com'
const FROM = "Founder's Digest <news@hueandheal.com>"
const REPLY_TO = 'hello@hueandheal.com'
const NEWS_MODEL = 'claude-sonnet-5-5'
const WRITE_MODEL = 'claude-opus-5-5'
const TZ = 'Europe/London'
const COMPANIES = ['Hue & Heal', 'Remedae', 'Moss Island'] as const
const STEP_TIMEOUT_MS = 135_000
const LOCK_SECONDS = 160
const MAX_ATTEMPTS = 3
const IMAGE_GIVE_UP_MS = 20 * 60_000

const PRICE: Record<string, { in: number; out: number }> = { [NEWS_MODEL]: { in: 2, out: 10 }, [WRITE_MODEL]: { in: 4, out: 20 } }
const SEARCH_USD = 0.01

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '', maxRetries: 0, timeout: STEP_TIMEOUT_MS })
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void }

type Json = Record<string, unknown>
interface Lens {
  enabled?: boolean; send_at?: string; prep_at?: string; to?: string | null; mac?: boolean; allow_video?: boolean
  coaching_next?: number; interests?: string[]; companies?: Record<string, string>
}
interface Row {
  id: string; owner: string; digest_date: string; stage: string; source: string; context: string | null
  state: Json; content: Json | null; usage: Json; error: string | null; attempts: number
  send_after: string; force_send: boolean; created_at: string
}
const CURRICULUM = RULES.curriculum as { title: string; brief: string }[]

/* ---- Small helpers ---- */
const cut = (v: unknown, n: number) => String(v ?? '').replace(/[–—]/g, ', ').replace(/[ \t]+/g, ' ').trim().slice(0, n)
const flat = (v: unknown, n: number) => cut(String(v ?? '').replace(/\s+/g, ' '), n)
const isoDate = (v: unknown) => { const m = String(v ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : null }
const s = { type: 'string' }

function londonNow(at = new Date()): { date: string; minutes: number; long: string } {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(at).map((p) => [p.type, p.value]))
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    long: new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(at),
  }
}
const hm = (v: string | undefined, fallback: number) => { const m = String(v ?? '').match(/^(\d{1,2}):(\d{2})$/); return m ? Number(m[1]) * 60 + Number(m[2]) : fallback }
/** The UTC instant of a London wall-clock time on a date, across clock changes. */
function londonInstant(date: string, minutes: number): Date {
  const guess = new Date(`${date}T${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00Z`)
  const offset = londonNow(guess).minutes - minutes
  const fix = ((offset + 720) % 1440) - 720
  return new Date(guess.getTime() - fix * 60_000)
}
const addDays = (date: string, n: number) => new Date(new Date(`${date}T12:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10)

function addUsage(total: Json, model: string, u: Json | undefined): Json {
  if (!u) return total
  const p = PRICE[model]
  const input = Number(u.input_tokens ?? 0) + Number(u.cache_read_input_tokens ?? 0) + Number(u.cache_creation_input_tokens ?? 0)
  const output = Number(u.output_tokens ?? 0)
  const searches = Number(((u.server_tool_use ?? {}) as Json).web_search_requests ?? 0)
  const usd = (input * p.in + output * p.out) / 1e6 + searches * SEARCH_USD
  return {
    input_tokens: Number(total.input_tokens ?? 0) + input, output_tokens: Number(total.output_tokens ?? 0) + output,
    searches: Number(total.searches ?? 0) + searches, usd: Math.round((Number(total.usd ?? 0) + usd) * 10000) / 10000,
  }
}

/* The founder's brand worlds: the ones they own and the ones they are a member of. */
async function brandsFor(admin: SupabaseClient, owner: string): Promise<{ id: string; name: string; knowledge: Record<string, string> | null }[]> {
  const { data: mem } = await admin.from('brand_members').select('brand_id').eq('user_id', owner)
  const ids = ((mem ?? []) as { brand_id: string }[]).map((m) => m.brand_id)
  const { data } = await admin.from('brand_profiles').select('id, name, knowledge').or(`owner.eq.${owner}${ids.length ? `,id.in.(${ids.join(',')})` : ''}`)
  return (data ?? []) as { id: string; name: string; knowledge: Record<string, string> | null }[]
}

/* ---- Context: everything the writer needs, built once a day ---- */
async function buildContext(admin: SupabaseClient, owner: string, lens: Lens, date: string, dateLong: string): Promise<{ text: string; module: number; pulse: DigestContent['pulse'] }> {
  const since7 = new Date(Date.now() - 7 * 86400000).toISOString()
  const [prof, brands, checks, subs, prios, open, done, radar, opps, pipe, events, recent, journal] = await Promise.all([
    admin.from('life_profile').select('display_name, mission, weekly_focus').eq('owner', owner).maybeSingle(),
    brandsFor(admin, owner),
    admin.from('connections').select('id, brand_id, config, provider').eq('owner', owner).eq('provider', 'supabase'),
    admin.from('subscribers').select('brand_id').eq('owner', owner).eq('status', 'subscribed'),
    admin.from('priorities').select('title, detail, brand_id, status, due').eq('owner', owner).eq('status', 'active').order('position').limit(15),
    admin.from('life_tasks').select('id, title, due, brand_id, source, created_at').eq('owner', owner).neq('status', 'done').order('due', { ascending: true, nullsFirst: false }).limit(40),
    admin.from('life_tasks').select('title, brand_id, done_at').eq('owner', owner).eq('status', 'done').gte('done_at', since7).limit(20),
    admin.from('radar_runs').select('brief, finished_at').eq('owner', owner).eq('status', 'done').order('finished_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('radar_opportunities').select('title, org, lane, fit, action, deadline, why, product').eq('owner', owner).eq('status', 'open').gte('fit', 4).order('fit', { ascending: false }).limit(8),
    admin.from('life_pipeline').select('title, org, stage, next_step, next_due').eq('owner', owner).not('stage', 'in', '(won,lost,dismissed)').limit(15),
    admin.from('life_events').select('title, starts_at, all_day').eq('owner', owner).gte('starts_at', new Date().toISOString()).lte('starts_at', new Date(Date.now() + 7 * 86400000).toISOString()).order('starts_at').limit(15),
    admin.from('founder_digests').select('digest_date, content').eq('owner', owner).lt('digest_date', date).not('content', 'is', null).order('digest_date', { ascending: false }).limit(10),
    admin.from('journal_articles').select('title, status, updated_at').eq('owner', owner).order('updated_at', { ascending: false }).limit(6),
  ])
  const brandRows = brands
  const nameOf = (id: unknown) => brandRows.find((b) => b.id === id)?.name ?? 'Hue & Heal'
  const hh = brandRows.find((b) => b.name === 'Hue & Heal')

  // The pulse: live product numbers from each product's own database (the
  // portfolio connector's last check), plus the studio's own counts.
  const pulse: DigestContent['pulse'] = []
  const conns = (checks.data ?? []) as { id: string; brand_id: string; config: Json }[]
  const latest = await Promise.all(conns.map((c) => admin.from('connection_checks').select('metrics, checked_at').eq('connection_id', c.id).not('metrics', 'is', null).order('checked_at', { ascending: false }).limit(1).maybeSingle()))
  const studioSubs = ((subs.data ?? []) as { brand_id: string | null }[]).filter((r) => !r.brand_id || r.brand_id === hh?.id).length
  pulse.push({ company: 'Hue & Heal', items: [
    { n: String(studioSubs), label: studioSubs === 1 ? 'subscriber' : 'subscribers' },
    { n: String((opps.data ?? []).length), label: 'strong radar leads' },
    { n: String((pipe.data ?? []).length), label: 'in the pipeline' },
  ] })
  for (const co of ['Remedae', 'Moss Island']) {
    const i = conns.findIndex((c) => nameOf(c.brand_id) === co)
    const m = (i >= 0 ? (latest[i].data?.metrics ?? null) : null) as Record<string, number> | null
    const show = (i >= 0 ? (conns[i].config?.show ?? []) : []) as [string, string][]
    if (!m) continue
    pulse.push({ company: co, items: show.filter(([k]) => typeof m[k] === 'number').slice(0, 3).map(([k, words]) => {
      const [one, many] = words.split('|')
      return { n: String(m[k]), label: m[k] === 1 ? one : (many ?? one) }
    }) })
  }

  const module = Math.max(0, Number(lens.coaching_next ?? 0)) % CURRICULUM.length
  const lesson = CURRICULUM[module]
  const recentRows = (recent.data ?? []) as { digest_date: string; content: Json }[]
  // The radar's priorities count only while they are fresh.
  const briefFresh = radar.data?.finished_at && Date.now() - new Date(String(radar.data.finished_at)).getTime() < 3 * 86400000
  const brief = (briefFresh ? radar.data?.brief ?? null : null) as Json | null
  const knowledgeOf = (co: string) => {
    const k = brandRows.find((b) => b.name === co)?.knowledge
    if (!k) return ''
    return ['state', 'strategy', 'decisions'].filter((x) => k[x]).map((x) => `${x.toUpperCase()}: ${flat(k[x], 900)}`).join('\n')
  }

  const lines = [
    `TODAY: ${dateLong} ${date.slice(0, 4)} (${date}). Times are London.`,
    `FOUNDER: ${flat(prof.data?.display_name, 40) || 'Maria'}. Mission: ${flat(prof.data?.mission, 300)}${prof.data?.weekly_focus ? ` This week's focus: ${flat(prof.data.weekly_focus, 200)}` : ''}`,
    '', 'HER INTERESTS (weight the news and the coaching towards these):', ...(lens.interests ?? []).map((x) => `- ${x}`),
    '', 'THE COMPANIES:',
    ...COMPANIES.map((co) => [`## ${co}`, flat(lens.companies?.[co], 1600), knowledgeOf(co)].filter(Boolean).join('\n')),
    '', 'PULSE (live numbers; quote only these):',
    ...pulse.map((x) => `- ${x.company}: ${x.items.map((i) => `${i.n} ${i.label}`).join(', ') || 'no numbers yet'}`),
    '', 'OPEN PRIORITIES (set with her earlier):',
    ...((prios.data ?? []) as Json[]).map((p) => `- [${nameOf(p.brand_id)}] ${flat(p.title, 140)}${p.due ? ` (due ${p.due})` : ''}`),
    '', 'OPEN TASKS (id in brackets; carry these forward with existing_task_id rather than repeating them):',
    ...((open.data ?? []) as Json[]).map((t) => `- [${t.id}] [${nameOf(t.brand_id)}] ${flat(t.title, 140)}${t.due ? `, due ${t.due}${String(t.due) < date ? ' (OVERDUE)' : ''}` : ''}${t.source === 'digest' ? ', from an earlier digest' : ''}`),
    '', 'DONE IN THE LAST 7 DAYS:', ...((done.data ?? []) as Json[]).map((t) => `- [${nameOf(t.brand_id)}] ${flat(t.title, 120)}`),
    '', 'OPPORTUNITY RADAR:',
    ...(brief?.priorities ? ((brief.priorities as Json[]) ?? []).map((p) => `- Radar priority: ${flat(p.text, 300)}`) : []),
    ...((opps.data ?? []) as Json[]).map((o) => `- fit ${o.fit} ${o.action} (${o.lane}): ${flat(o.title, 110)} / ${flat(o.org, 50)}${o.deadline ? `, closes ${String(o.deadline).slice(0, 10)}` : ''}${o.product ? `, for ${o.product}` : ''}`),
    '', 'PIPELINE:', ...((pipe.data ?? []) as Json[]).map((p) => `- ${flat(p.title, 90)} / ${flat(p.org, 40)}: ${p.stage}${p.next_step ? `, next: ${flat(p.next_step, 80)}` : ''}${p.next_due ? ` by ${p.next_due}` : ''}`),
    '', 'CALENDAR, NEXT 7 DAYS:', ...((events.data ?? []) as Json[]).map((e) => `- ${String(e.starts_at).slice(0, 16).replace('T', ' ')}: ${flat(e.title, 100)}`),
    '', 'JOURNAL (Hue & Heal):', ...((journal.data ?? []) as Json[]).map((j) => `- ${flat(j.title, 100)} (${j.status})`),
    '', 'RECENT DIGESTS (never repeat these stories, angles or lessons):',
    ...recentRows.map((r) => {
      const c = r.content as Partial<DigestContent>
      return `- ${r.digest_date}: news ${(c.news ?? []).map((n) => flat(n.title, 70)).join(' | ')}; posts ${(c.posts ?? []).map((p) => `${p.company}: ${flat(p.headline, 60)}`).join(' | ')}; lesson ${c.coaching?.title ?? ''}`
    }),
    '', `TODAY'S COACHING LESSON: ${module + 1} of ${CURRICULUM.length}, "${lesson.title}". ${lesson.brief}`,
    '', `POST FORMATS: ${RULES.formats}${lens.allow_video ? ` ${RULES.video_on}` : ' Video is not approved yet: use single or carousel only.'}`,
    '', 'POST RULES BY BRAND:', ...COMPANIES.map((co) => `## ${co}\n${(RULES.posts as Record<string, string>)[co]}`),
  ]
  return { text: lines.join('\n'), module, pulse }
}

/* ---- The research step ---- */
const NEWS_TOOL = {
  name: 'file_news',
  description: 'File the news you found, once, when searching is done.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: s, source: { type: 'string', description: 'Publication name.' }, url: { type: 'string', description: 'The page you read.' },
            date: { type: 'string', description: 'YYYY-MM-DD published.' }, summary: { type: 'string', description: 'What happened, three sentences at most, facts only.' },
            relevance: { type: 'string', description: 'Which of her companies or interests it touches, and why, one sentence.' },
          },
          required: ['title', 'source', 'url', 'date', 'summary', 'relevance'],
        },
      },
    },
    required: ['items'],
  },
}

async function newsStep(row: Row): Promise<Partial<Row>> {
  const messages = ((row.state.news_messages as Json[]) ?? [{ role: 'user', content: `${row.context}\n\nFind this morning's news for her. Today is ${row.digest_date}; only stories published from ${addDays(row.digest_date, -7)} on.` }]) as Anthropic.Beta.BetaMessageParam[]
  const res = await anthropic.beta.messages.create({
    model: NEWS_MODEL, max_tokens: 8000, system: RULES.news_system,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }, NEWS_TOOL] as never,
    messages, output_config: { effort: 'low' },
  } as never) as Anthropic.Beta.BetaMessage
  const usage = addUsage(row.usage, NEWS_MODEL, res.usage as unknown as Json)
  if (res.stop_reason === 'pause_turn') {
    return { usage, state: { ...row.state, news_messages: [...messages, { role: 'assistant', content: res.content }] } }
  }
  const use = res.content.find((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use' && b.name === 'file_news')
  // Finished talking without filing: ask once for the filing.
  if (!use && !row.state.news_nudged) {
    return { usage, state: { ...row.state, news_nudged: true, news_messages: [...messages, { role: 'assistant', content: res.content }, { role: 'user', content: 'Now file what you found with the file_news tool.' }] } }
  }
  const items = ((use?.input as Json | undefined)?.items ?? []) as Json[]
  const news = items.filter((i) => /^https?:\/\//.test(String(i.url))).slice(0, 10).map((i) => ({
    title: flat(i.title, 160), source: flat(i.source, 60), url: String(i.url).slice(0, 500), date: isoDate(i.date) ?? '',
    summary: flat(i.summary, 500), relevance: flat(i.relevance, 240),
  }))
  // A digest with no news still goes out; the writer is told there is none.
  return { usage, stage: 'write', state: { ...row.state, news_messages: undefined, news } }
}

/* ---- The writing step ---- */
/* The digest's shape lives with the rules, so the Mac writes to the same one. */
const DIGEST_SCHEMA = RULES.schema

async function writeStep(row: Row): Promise<Partial<Row>> {
  const news = (row.state.news ?? []) as Json[]
  const prompt = [
    row.context, '',
    'NEWS FOUND THIS MORNING (choose four to six; use their real URLs):',
    ...(news.length ? news.map((n, i) => `${i + 1}. ${n.title} (${n.source}, ${n.date}) ${n.url}\n   ${n.summary}\n   Relevance: ${n.relevance}`) : ['(The research desk found nothing usable today: leave news empty rather than inventing any.)']),
    '', 'Write today\'s digest now: three priorities, the news, exactly one post for each of Hue & Heal, Remedae and Moss Island (in that order), today\'s coaching lesson, one to three next steps per company, and the closing question.',
  ].join('\n')
  // Opus writes; a retry falls back to Sonnet so a slow morning still sends.
  const model = row.attempts >= 1 ? NEWS_MODEL : WRITE_MODEL
  const res = await anthropic.beta.messages.create({
    model, max_tokens: 12000, system: RULES.system,
    messages: [{ role: 'user', content: prompt }],
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: DIGEST_SCHEMA } },
  } as never) as Anthropic.Beta.BetaMessage
  const usage = addUsage(row.usage, model, res.usage as unknown as Json)
  if (res.stop_reason === 'max_tokens') throw new Error('The digest was cut off before it was finished.')
  const text = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text).join('')
  let raw: Json
  try { raw = JSON.parse(text) } catch { throw new Error('The digest did not come back as JSON.') }
  return { usage, stage: 'filed', state: { ...row.state, raw } }
}

/* ---- Filing: check the written digest, save posts and tasks ---- */
async function fileStep(admin: SupabaseClient, row: Row): Promise<Partial<Row>> {
  const raw = (row.state.raw ?? {}) as Json
  const date = row.digest_date
  const lens = await lensOf(admin, row.owner)
  const brandRows = await brandsFor(admin, row.owner)
  const brandId = (co: string) => brandRows.find((b) => b.name === co)?.id ?? null
  const okDate = (v: unknown, fallback: string) => {
    const d = isoDate(v)
    return d && d >= date && d <= addDays(date, 30) ? d : fallback
  }
  const co = (v: unknown) => ((COMPANIES as readonly string[]).includes(String(v)) ? String(v) : 'Hue & Heal')
  const module = Number(row.state.module ?? 0)

  const posts: DigestPost[] = []
  for (const company of COMPANIES) {
    const p = ((raw.posts ?? []) as Json[]).find((x) => x.company === company)
    if (!p) continue
    let format = ['single', 'carousel', 'video'].includes(String(p.format)) ? String(p.format) : 'single'
    if (format === 'video' && !lens.allow_video) format = 'carousel'
    const slides = ((p.slides ?? []) as Json[]).slice(0, 8).map((x) => ({ heading: flat(x.heading, 120), body: cut(x.body, 400) }))
    if (format === 'carousel' && slides.length < 3) format = 'single'
    posts.push({
      company, format, headline: flat(p.headline, 140), caption: cut(p.caption, 2200),
      hashtags: ((p.hashtags ?? []) as string[]).map((h) => flat(h, 40).replace(/^#/, '').replace(/\s+/g, '')).filter(Boolean).slice(0, 8),
      slides: format === 'single' ? [] : slides, why: flat(p.why, 200), image_url: null, post_id: null,
      ...({ image_prompt: cut(p.image_prompt, 1200) } as Json),
    })
  }

  // Each post becomes a draft in the studio, in its own brand world.
  for (const post of posts) {
    const accent = post.company === 'Remedae' ? 'lime' : 'terracotta'
    const { data: ins, error } = await admin.from('social_posts').insert({
      owner: row.owner, brand_id: brandId(post.company), digest_id: row.id, platform: 'instagram',
      topic: post.headline, headline: post.headline, caption: [post.caption, post.hashtags.map((h) => `#${h}`).join(' ')].filter(Boolean).join('\n\n'),
      hashtags: post.hashtags, slides: post.slides, format: post.format === 'single' ? 'portrait' : 'carousel',
      sector: 'health_fitness', accent, status: 'draft',
    }).select('id').single()
    if (error) console.error('digest post', error.message)
    post.post_id = ins?.id ?? null
  }

  // Next steps become tasks; carried ones keep their row and get the new date.
  const { data: openRows } = await admin.from('life_tasks').select('id, title, brand_id').eq('owner', row.owner).neq('status', 'done')
  const open = (openRows ?? []) as { id: string; title: string; brand_id: string | null }[]
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const next_steps: DigestContent['next_steps'] = []
  for (const st of ((raw.next_steps ?? []) as Json[]).slice(0, 9)) {
    const company = co(st.company)
    const title = flat(st.title, 140)
    if (!title) continue
    const by = okDate(st.by, addDays(date, 7))
    const existing = open.find((t) => t.id === st.existing_task_id) ?? open.find((t) => norm(t.title) === norm(title))
    if (existing) await admin.from('life_tasks').update({ due: by }).eq('id', existing.id)
    else await admin.from('life_tasks').insert({ owner: row.owner, brand_id: brandId(company), title, due: by, status: 'open', source: 'digest' })
    next_steps.push({ company, title: existing ? flat(existing.title, 140) : title, detail: flat(st.detail, 260), by, carried: Boolean(existing) })
  }
  const carriedIds = new Set(open.filter((t) => next_steps.some((n) => n.carried && norm(n.title) === norm(t.title))).map((t) => t.id))
  const { data: lateRows } = await admin.from('life_tasks').select('id, title, due, brand_id').eq('owner', row.owner).neq('status', 'done').lt('due', date).order('due').limit(8)
  const nameOf = (id: unknown) => brandRows.find((b) => b.id === id)?.name ?? 'Hue & Heal'
  const overdue = ((lateRows ?? []) as Json[]).filter((t) => !carriedIds.has(String(t.id))).map((t) => ({ company: nameOf(t.brand_id), title: flat(t.title, 140), due: String(t.due) }))

  const c = (raw.coaching ?? {}) as Json
  const term = (c.term ?? {}) as Json
  const content: DigestContent = {
    date, dateLong: londonNow(new Date(`${date}T12:00:00Z`)).long,
    headline: flat(raw.headline, 110) || 'Your morning', opening: cut(raw.opening, 700),
    pulse: (row.state.pulse ?? []) as DigestContent['pulse'],
    priorities: ((raw.priorities ?? []) as Json[]).slice(0, 3).map((p) => ({ company: co(p.company), text: flat(p.text, 300), by: okDate(p.by, date) })),
    news: ((raw.news ?? []) as Json[]).filter((n) => /^https?:\/\//.test(String(n.url))).slice(0, 6).map((n) => ({
      title: flat(n.title, 160), snippet: flat(n.snippet, 320), so_what: flat(n.so_what, 240),
      tag: [...COMPANIES, 'Industry'].includes(String(n.tag)) ? String(n.tag) : 'Industry', source: flat(n.source, 60), url: String(n.url).slice(0, 500), date: isoDate(n.date) ?? '',
    })),
    posts,
    coaching: {
      n: module + 1, of: CURRICULUM.length, title: CURRICULUM[module].title,
      principle: flat(c.principle, 220), lesson: cut(c.lesson, 1400), case: cut(c.case, 600), apply: cut(c.apply, 700), drill: cut(c.drill, 600),
      term: { word: flat(term.word, 60), meaning: flat(term.meaning, 300) },
    },
    next_steps, overdue, question: flat(raw.question, 300),
  }
  // The lesson moves on only once a digest is actually written.
  await admin.from('life_profile').update({ digest_lens: { ...lens, coaching_next: (module + 1) % CURRICULUM.length } }).eq('owner', row.owner)
  return { content: content as unknown as Json, stage: hasHiggsfield() && posts.length ? 'images' : 'send', state: { ...row.state, raw: undefined, images_started: Date.now() } }
}

/* ---- Images: one cover per post ---- */
const MOSS_LOOK = 'Full-bleed natural documentary family photograph that fills the whole frame edge to edge, warm soft daylight, real home or outdoor setting, candid and calm, a child doing a real-life activity seen from behind, in silhouette or hands only so no face is visible, families of many backgrounds, shallow depth of field, gentle colour, no screens.'
async function imagesStep(admin: SupabaseClient, row: Row): Promise<Partial<Row>> {
  const content = row.content as unknown as DigestContent & { posts: (DigestPost & { image_prompt?: string; image_req?: string; image_failed?: string })[] }
  const started = Number(row.state.images_started ?? Date.now())
  const brandRows = await brandsFor(admin, row.owner)
  const brandId = (co: string) => brandRows.find((b) => b.name === co)?.id ?? null

  // Submit what has not been submitted.
  for (const post of content.posts) {
    if (post.image_url || post.image_req || post.image_failed || !post.image_prompt) continue
    try {
      const lib = post.company === 'Moss Island' ? null : await loadLibrary(admin, brandId(post.company))
      const req = { purpose: 'social', surface: 'social-portrait', subject: post.image_prompt }
      const prompt = lib ? composePrompt(lib, req) : `${post.image_prompt} ${post.company === 'Moss Island' ? MOSS_LOOK : ''}`.trim()
      const ref = lib ? await referenceFor(lib, req) : undefined
      const { statusUrl } = await submitImage(prompt.slice(0, 2400), { aspect: '3:4', resolution: '1080p', referenceUrl: ref })
      post.image_req = statusUrl
    } catch (e) { post.image_failed = cut((e as Error).message, 200) }
  }
  // Wait for them, bounded, then upload each finished one to the studio.
  const deadline = Date.now() + 95_000
  let wait = 4000
  while (Date.now() < deadline && content.posts.some((p) => p.image_req && !p.image_url && !p.image_failed)) {
    await new Promise((r) => setTimeout(r, wait))
    wait = Math.min(wait + 2000, 10_000)
    for (const post of content.posts) {
      if (!post.image_req || post.image_url || post.image_failed) continue
      try {
        const c = await checkImage(post.image_req)
        if (c.state === 'failed') { post.image_failed = c.reason; continue }
        if (c.state !== 'ready') continue
        const img = await download(c.url)
        const ext = img.contentType.includes('png') ? 'png' : img.contentType.includes('webp') ? 'webp' : 'jpg'
        const path = `${row.owner}/digest/${row.digest_date}-${post.company.toLowerCase().replace(/[^a-z]+/g, '-')}-${crypto.randomUUID().slice(0, 6)}.${ext}`
        const up = await admin.storage.from('social-assets').upload(path, img.bytes, { contentType: img.contentType, upsert: true })
        if (up.error) { post.image_failed = up.error.message; continue }
        post.image_url = admin.storage.from('social-assets').getPublicUrl(path).data.publicUrl
        if (post.post_id) await admin.from('social_posts').update({ image_url: post.image_url }).eq('id', post.post_id)
      } catch (e) { console.error('digest image', (e as Error).message) }
    }
  }
  const pending = content.posts.some((p) => p.image_req && !p.image_url && !p.image_failed)
  const givenUp = Date.now() - started > IMAGE_GIVE_UP_MS
  return { content: content as unknown as Json, stage: pending && !givenUp ? 'images' : 'send' }
}

/* ---- Sending ---- */
async function recipient(admin: SupabaseClient, owner: string, lens: Lens): Promise<string> {
  if (lens.to && /@/.test(lens.to)) return lens.to
  const { data } = await admin.auth.admin.getUserById(owner)
  return data.user?.email ?? REPLY_TO
}

async function sendStep(admin: SupabaseClient, row: Row): Promise<Partial<Row>> {
  if (!row.force_send && Date.now() < new Date(row.send_after).getTime()) return {}
  const lens = await lensOf(admin, row.owner)
  const to = await recipient(admin, row.owner, lens)
  const mail = digestEmail(row.content as unknown as DigestContent, { base: SITE, appUrl: APP_URL })
  const { key, missing } = resendKeyFor(FROM)
  if (!key) throw new Error(missing)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json', 'Idempotency-Key': `digest-${row.id}-${row.force_send ? Date.now() : 0}` },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject: mail.subject, html: mail.html, text: mail.text }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const out = await res.json() as { id?: string }
  return { stage: 'sent', sent_at: new Date().toISOString(), sent_to: to, resend_id: out.id ?? null, force_send: false } as Partial<Row>
}

/* ---- The tick ---- */
async function lensOf(admin: SupabaseClient, owner: string): Promise<Lens> {
  const { data } = await admin.from('life_profile').select('digest_lens').eq('owner', owner).maybeSingle()
  return (data?.digest_lens ?? {}) as Lens
}

/** Opens today's row for every founder whose prep time has come. */
/** mode: 'auto' (the tick), 'cloud' (write now and send when ready), 'mac' (open now for the Mac). */
async function openToday(admin: SupabaseClient, onlyOwner?: string, mode: 'auto' | 'cloud' | 'mac' = 'auto'): Promise<void> {
  const force = mode !== 'auto'
  let q = admin.from('life_profile').select('owner, digest_lens').not('digest_lens', 'is', null)
  if (onlyOwner) q = q.eq('owner', onlyOwner)
  const { data } = await q
  const now = londonNow()
  for (const p of (data ?? []) as { owner: string; digest_lens: Lens }[]) {
    const lens = p.digest_lens
    if (!force && lens.enabled === false) continue
    const sendAt = hm(lens.send_at, 450), prepAt = hm(lens.prep_at, sendAt - 60)
    if (!force && now.minutes < prepAt) continue
    const { data: existing } = await admin.from('founder_digests').select('id').eq('owner', p.owner).eq('digest_date', now.date).maybeSingle()
    if (existing) continue
    const ctx = await buildContext(admin, p.owner, lens, now.date, now.long)
    // The Mac writes it when it can; past send time, or when asked now, the cloud does.
    const mac = mode === 'mac' || (mode === 'auto' && lens.mac !== false && now.minutes < sendAt)
    await admin.from('founder_digests').insert({
      owner: p.owner, digest_date: now.date, stage: mac ? 'mac' : 'news', source: mac ? 'mac' : 'cloud', context: ctx.text,
      state: { module: ctx.module, pulse: ctx.pulse }, send_after: londonInstant(now.date, sendAt).toISOString(), force_send: mode === 'cloud',
    })
  }
}

async function tick(admin: SupabaseClient): Promise<Json> {
  await openToday(admin)
  const nowIso = new Date().toISOString()
  // The Mac had until send time; after that the cloud writes it.
  await admin.from('founder_digests').update({ stage: 'news', source: 'cloud', error: 'The Mac did not file this one by send time, so the cloud wrote it.' })
    .eq('stage', 'mac').lt('send_after', nowIso)
  const { data: cand } = await admin.from('founder_digests').select('id').in('stage', ['news', 'write', 'filed', 'images', 'send'])
    .or(`lock_until.is.null,lock_until.lt.${nowIso}`).order('created_at').limit(3)
  const out: Json = {}
  let moved = false
  for (const c of cand ?? []) {
    const { data } = await admin.from('founder_digests').update({ lock_until: new Date(Date.now() + LOCK_SECONDS * 1000).toISOString() })
      .eq('id', c.id).or(`lock_until.is.null,lock_until.lt.${new Date().toISOString()}`).select('*').maybeSingle()
    const row = data as Row | null
    if (!row) continue
    let patch: Partial<Row> & Json
    try {
      patch = row.stage === 'news' ? await newsStep(row)
        : row.stage === 'write' ? await writeStep(row)
        : row.stage === 'filed' ? await fileStep(admin, row)
        : row.stage === 'images' ? await imagesStep(admin, row)
        : await sendStep(admin, row)
      if (patch.stage && patch.stage !== row.stage) { patch.attempts = 0; moved = true }
      if (row.stage === 'news' && !patch.stage) moved = true // a paused or nudged search continues
    } catch (e) {
      const attempts = row.attempts + 1
      const msg = e instanceof Anthropic.APIError ? `${e.status}: ${e.message}` : (e as Error).message
      console.error('digest step', row.stage, msg)
      patch = { attempts, error: cut(`${row.stage}: ${msg}`, 400), ...(attempts >= MAX_ATTEMPTS ? { stage: 'failed' } : {}) }
      if (attempts < MAX_ATTEMPTS) moved = true
    }
    await admin.from('founder_digests').update({ ...patch, lock_until: null, updated_at: new Date().toISOString() }).eq('id', row.id)
    out[row.digest_date] = patch.stage ?? row.stage
  }
  if (moved) kick()
  return out
}

function kick() {
  EdgeRuntime.waitUntil(fetch(`${SUPABASE_URL}/functions/v1/founder-digest`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-cron-secret': CRON_SECRET }, body: JSON.stringify({ op: 'tick' }),
  }).catch(() => null))
}

function subOf(jwt: string): string | null {
  try {
    const p = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof p.sub === 'string' && Number(p.exp) * 1000 > Date.now() ? p.sub : null
  } catch { return null }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const body = await req.json().catch(() => ({})) as Json
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

  if (CRON_SECRET && req.headers.get('x-cron-secret') === CRON_SECRET) {
    if (body.op === 'tick') {
      EdgeRuntime.waitUntil(tick(admin).catch((e) => console.error('digest tick', (e as Error).message)))
      return json({ ok: true })
    }
    // From the database (founder_digest_call): the Mac opening its day early,
    // or a cloud run written now and sent as soon as it is ready.
    if ((body.op === 'open_mac' || body.op === 'run') && typeof body.owner === 'string') {
      const owner = body.owner
      if (body.op === 'run') {
        const { data: existing } = await admin.from('founder_digests').select('id, stage').eq('owner', owner).eq('digest_date', londonNow().date).maybeSingle()
        if (existing && !['sent', 'failed', 'mac'].includes(existing.stage)) return json({ ok: true, note: 'already being written' })
        if (existing) await admin.from('founder_digests').delete().eq('id', existing.id)
      }
      EdgeRuntime.waitUntil(openToday(admin, owner, body.op === 'run' ? 'cloud' : 'mac').then(() => { if (body.op === 'run') kick() }).catch((e) => console.error('digest open', (e as Error).message)))
      return json({ ok: true })
    }
    return json({ error: 'Unknown op' }, 400)
  }

  // The founder, signed in. The token is checked against the database below.
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const owner = subOf(jwt)
  if (!owner) return json({ error: 'Sign in first.' }, 401)
  const { data: who, error: whoErr } = await admin.auth.getUser(jwt)
  if (whoErr || who.user?.id !== owner) return json({ error: 'Sign in first.' }, 401)
  const today = londonNow().date

  if (body.op === 'run') {
    // Today's again, written now by the cloud and sent as soon as it is ready.
    const { data: existing } = await admin.from('founder_digests').select('id, stage').eq('owner', owner).eq('digest_date', today).maybeSingle()
    if (existing && !['sent', 'failed', 'mac'].includes(existing.stage)) return json({ ok: true, note: 'Today\'s digest is already being written.' })
    // Drafts from the earlier one stay in the studio; only the day's row is replaced.
    if (existing) await admin.from('founder_digests').delete().eq('id', existing.id)
    await openToday(admin, owner, 'cloud')
    kick()
    return json({ ok: true, note: 'Writing it now. It arrives in about five minutes.' })
  }

  if (body.op === 'preview' || body.op === 'resend') {
    const date = isoDate(body.date) ?? today
    const { data } = await admin.from('founder_digests').select('*').eq('owner', owner).lte('digest_date', date).not('content', 'is', null).order('digest_date', { ascending: false }).limit(1).maybeSingle()
    const row = data as Row | null
    if (!row?.content) return json({ error: 'No digest has been written yet.' }, 404)
    if (body.op === 'resend') {
      await admin.from('founder_digests').update({ stage: 'send', force_send: true, attempts: row.attempts + 1 }).eq('id', row.id)
      kick()
      return json({ ok: true, note: 'On its way again.' })
    }
    const mail = digestEmail(row.content as unknown as DigestContent, { base: SITE, appUrl: APP_URL })
    return json({ ok: true, date: row.digest_date, stage: row.stage, subject: mail.subject, html: mail.html })
  }

  return json({ error: 'Unknown op' }, 400)
})

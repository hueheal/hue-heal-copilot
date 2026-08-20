// ============================================================================
// Hue & Heal :: daily-posts (automated, no user session)
// Every morning: research current wellness developments (live web search),
// write 3 distinct, ready-to-post pieces for Hue & Heal across digital AND
// physical wellness, and save each as a COMPLETE editable draft in the Social
// Copilot (a self-contained single, or a full carousel), rendered by the real
// in-app template. No images are generated here: the drafts open on the brand
// atmos background so you drop in your own photo or AI background in the studio.
// A digest of the day's topics is emailed to hello@hueandheal.com.
// No repeats: the last 30 days of drafts are fed to the prompts as an
// ALREADY COVERED list, and a subject-based guard redrafts once if the model
// still returns a company or product covered recently (or twice in one batch).
// Triggered by Supabase pg_cron; guarded by CRON_SECRET.
// preview:true returns the batch without saving drafts or emailing.
// Secrets: CRON_SECRET, ANTHROPIC_API_KEY, RESEND_API_KEY,
//          optional RESEND_FROM, ANTHROPIC_MODEL, DAILY_TO.
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected by the runtime.
// Deploy:  npx supabase functions deploy daily-posts --no-verify-jwt --project-ref <ref>
//          (--no-verify-jwt is required so the cron's service-to-service call
//           reaches this code; the CRON_SECRET header is the real gate.)
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'
import { enforceBrandName, brandNameRule } from '../_shared/brandName.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5'
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Hue & Heal <news@hueandheal.com>'
const DAILY_TO = Deno.env.get('DAILY_TO') ?? 'hello@hueandheal.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const APP_URL = 'https://copilotadmin.hueandheal.com'

const LOGO_INK = 'https://copilotadmin.hueandheal.com/brand/hue-heal-email-ink.png'
const LOGO_CREAM = 'https://copilotadmin.hueandheal.com/brand/hue-heal-email-cream.png'
const C = { ink: '#211D18', paper: '#F6F1E7', page: '#E7E0CF', soft: '#463D30', muted: '#7A6F5E', line: '#DBD1BE', onDark: '#F1EADB', onDarkMuted: '#B7AC97' }
const SANS = "'Poppins','Helvetica Neue',Helvetica,Arial,sans-serif"

// Hue & Heal spans digital AND physical wellness. The daily batch rotates across
// these angles, not only physical spaces.
const TOPIC_BUCKETS = [
  'A newly launched wellness product, app or experience worth knowing about',
  'News in the wellness industry: an acquisition, funding round, launch or major move',
  'A digital thought piece on where wellness technology and experience are heading',
  'Wellness showing up in an unexpected industry (workplace, retail, travel, finance, education)',
  'The psychology of wellbeing and how it should shape the design of digital and physical experiences',
]

interface CarouselSlide { heading: string; body: string }
interface Post { title: string; format: string; caption: string; hashtags: string[]; sector: string; subject?: string; slides?: CarouselSlide[]; sourceUrl?: string }
interface Brand { id: string; name: string; created_by?: string | null; tone_of_voice?: string | null; writing_guidelines?: string | null; accent_color?: string | null }
interface Item { post: Post; draftId: string | null }

function esc(s: string): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const POSITIONING =
  'Hue & Heal is a wellness experience design studio working across BOTH digital and physical wellness: apps, ' +
  'products, services and programmes as well as physical spaces. Never imply the studio only designs physical rooms.'

/* POST to the Anthropic API with a hard timeout so a slow web search or model
   call can never hang the whole invocation. */
async function anthropic(body: Record<string, unknown>, ms: number): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
  } finally {
    clearTimeout(t)
  }
}

/* The do-not-repeat memory: titles and captions of every draft generated for
   this brand in the last 30 days. Feeds the prompts and the repeat guard. */
async function recentCoverage(admin: ReturnType<typeof createClient>, brandId: string): Promise<{ titles: string[]; haystack: string[] }> {
  try {
    const since = new Date(Date.now() - 30 * 86400000).toISOString()
    const { data } = await admin.from('social_posts')
      .select('topic, headline, caption')
      .eq('brand_id', brandId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(80)
    const rows = (data ?? []) as { topic?: string; headline?: string; caption?: string }[]
    const seen = new Set<string>()
    const titles: string[] = []
    const haystack: string[] = []
    for (const r of rows) {
      const t = (r.topic || r.headline || '').trim()
      if (t && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); titles.push(t) }
      haystack.push([r.topic, r.headline, r.caption].filter(Boolean).join(' '))
    }
    return { titles: titles.slice(0, 40), haystack }
  } catch {
    return { titles: [], haystack: [] }
  }
}

/* True when a post's subject (the company/product it is about) already appears
   anywhere in the recent drafts. Catches the "Oura again" failure mode. */
function isRepeat(post: Post, haystack: string[]): boolean {
  const s = (post.subject ?? '').trim().toLowerCase()
  if (s.length < 3 || s === 'evergreen') return false
  return haystack.some((h) => h.toLowerCase().includes(s))
}

function avoidBlock(titles: string[]): string {
  if (!titles.length) return ''
  return (
    '\nALREADY COVERED (the studio published or drafted these in the last 30 days). ' +
    'Do NOT cover these stories again, and do NOT feature the same companies or products again ' +
    'unless there is genuinely new, materially different news about them:\n' +
    titles.map((t) => `- ${t}`).join('\n') + '\n'
  )
}

/* Step 1: research real, current developments with live web search. Resilient:
   on any error or timeout it returns '' and the draft step uses evergreen angles. */
async function research(avoid: string): Promise<string> {
  try {
    const prompt =
      `${POSITIONING}\n\n` +
      'Use web search to find real, current and specific developments from the last few weeks that would inspire ' +
      'strong social posts. Cover a spread across these angles:\n' +
      TOPIC_BUCKETS.map((b, i) => `${i + 1}. ${b}`).join('\n') +
      avoid +
      '\n\nReturn a short brief of 3 to 5 concrete, real items (name the real product, company, study or launch) ' +
      'each with one sentence of context and its source URL. Every item must be about a DIFFERENT company or product. ' +
      'British English. Do not invent anything.'
    const resp = await anthropic({
      model: MODEL, max_tokens: 1500,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
      messages: [{ role: 'user', content: prompt }],
    }, 45000)
    if (!resp.ok) return ''
    const data = await resp.json()
    return (data.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n').trim()
  } catch {
    return ''
  }
}

const TOOL = {
  name: 'daily_posts',
  description: 'Return exactly 3 distinct, polished, ready-to-post social posts.',
  input_schema: {
    type: 'object',
    properties: {
      posts: {
        type: 'array',
        description: 'Exactly 3 posts, each a different angle and format.',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'The cover headline. Short and striking, under 8 words. Must make sense on its own.' },
            subject: { type: 'string', description: 'The single company, product, study or place this post is about, e.g. "Oura" or "Equinox". Use "evergreen" if the post is a general thought piece about no specific company.' },
            format: { type: 'string', enum: ['single', 'carousel'], description: 'single = one image that stands alone. carousel = a cover plus content slides that develop the idea.' },
            caption: { type: 'string', description: 'The full ready-to-post caption for the post description. Strong hook, natural flow, a soft call to action. British English. Never use em dashes or en dashes.' },
            hashtags: { type: 'array', items: { type: 'string' }, description: '5 to 8 relevant hashtags, each starting with #.' },
            sector: { type: 'string', enum: ['hospitality', 'food_beverage', 'health_fitness', 'education'], description: 'The sector this post best fits.' },
            slides: {
              type: 'array',
              description: 'Carousel format ONLY: 3 to 5 content slides shown after the cover, each developing one clear point so the carousel is complete on its own. Omit for single posts.',
              items: { type: 'object', properties: { heading: { type: 'string', description: 'Short slide heading, a few words.' }, body: { type: 'string', description: '1 to 3 sentences. British English. No em or en dashes.' } }, required: ['heading', 'body'] },
            },
            sourceUrl: { type: 'string', description: 'If based on a real news item, the source URL. Empty string if evergreen.' },
          },
          required: ['title', 'format', 'caption', 'hashtags', 'sector', 'subject'],
        },
      },
    },
    required: ['posts'],
  },
}

/* Step 2: turn the research into 3 polished posts in the brand voice. */
async function draftPosts(brand: Brand, brief: string, avoid: string, feedback = ''): Promise<Post[]> {
  const voice = (brand.tone_of_voice ?? '').trim()
  const guides = (brand.writing_guidelines ?? '').trim()
  const prompt =
    `${POSITIONING}\n\n` +
    (brief
      ? `Use this research as the factual basis. Ground every claim in it and do not invent beyond it:\n${brief}\n\n`
      : 'No live research is available, so use evergreen angles (a digital thought piece, wellness in another industry, and the psychology of wellbeing shaping design). Do not state anything as breaking news.\n\n') +
    `Write today's 3 polished, ready-to-post Instagram posts for ${brand.name}.\n` +
    `${brandNameRule(brand.name)}\n` +
    (voice ? `\nVOICE (follow it closely):\n${voice}\n` : '') +
    (guides ? `\nWRITING GUIDELINES:\n${guides}\n` : '') +
    avoid +
    (feedback ? `\n${feedback}\n` : '') +
    '\nRules: three genuinely distinct angles drawn from different topic buckets (digital and physical, not all about physical spaces). ' +
    'The 3 posts must be about 3 DIFFERENT companies, products or subjects, and none of them may repeat anything on the ALREADY COVERED list. ' +
    'Each post is EITHER a single or a carousel, and must be complete either way:\n' +
    '- single: the cover headline plus the image carries the whole idea. Choose single only when one line genuinely lands on its own.\n' +
    '- carousel: give 3 to 5 content slides after the cover, each a clear self-contained point, so the swipe tells the full story. Prefer carousel when the idea needs unpacking (most news, guides and thought pieces do).\n' +
    'The caption is the post description and always stands on its own, with a scroll-stopping first line and a soft call to action. ' +
    'Concrete and specific over abstract. No hype, no invented statistics, no emoji. British English. ' +
    'Never use em dashes or en dashes anywhere. Use commas, colons, full stops, or the word "and" instead. ' +
    'Call the daily_posts tool with exactly 3 posts.'
  const resp = await anthropic({ model: MODEL, max_tokens: 2500, tools: [TOOL], tool_choice: { type: 'tool', name: 'daily_posts' }, messages: [{ role: 'user', content: prompt }] }, 100000)
  if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${(await resp.text()).slice(0, 300)}`)
  const data = await resp.json()
  const use = (data.content ?? []).find((b: { type: string }) => b.type === 'tool_use')
  const posts = use?.input?.posts
  if (!Array.isArray(posts) || !posts.length) throw new Error('No posts returned')
  return posts.slice(0, 3) as Post[]
}

const SECTORS = ['hospitality', 'food_beverage', 'health_fitness', 'education']
const SECTOR_LABEL: Record<string, string> = { hospitality: 'Hospitality', food_beverage: 'Food & Beverage', health_fitness: 'Health & Fitness', education: 'Education' }

// Design constants mirrored from the app so drafts render identically in the studio.
const CREAM = '#F4F0E7'
const INK = '#1E1B18'
const ACCENT = '#CE8A53' // accentHex('copper')
let eidc = 0
const eid = (p: string) => `${p}-${++eidc}`
const T = (content: string, box: number[], style: Record<string, unknown>, role?: string) => ({ id: eid('t'), type: 'text', box: { x: box[0], y: box[1], w: box[2], h: box[3] }, style, content, ...(role ? { role } : {}) })

/* Build a complete, self-contained design so the draft renders fully in the
   studio. Cover uses the brand atmos background (you add a photo in the studio);
   fontKey 'serif' maps to true Ivy Ora in the app. Mirrors statement / guide. */
function buildPostDesign(post: Post, isCarousel: boolean) {
  const eyebrow = (SECTOR_LABEL[post.sector] ?? 'Wellness').toUpperCase()
  const cover = {
    id: eid('slide'),
    background: { type: 'atmos', value: 'atmos' },
    elements: [
      T('hue&heal.', [8, 7, 44, 8], { color: CREAM, fontKey: 'serif', fontSize: 40, fontWeight: 300 }, 'wordmark'),
      T(post.title, [8, 38, 84, 30], { color: CREAM, fontKey: 'serif', fontSize: 108, fontWeight: 300, lineHeight: 1.02, align: 'left' }, 'headline'),
      { id: eid('s'), type: 'shape', box: { x: 8, y: 72, w: 14, h: 0.7 }, style: { bg: ACCENT, radius: 0 }, content: '' },
      T(eyebrow, [8, 76, 74, 6], { color: ACCENT, fontKey: 'sans', fontSize: 28, letterSpacing: 0.18, uppercase: true }, 'eyebrow'),
    ],
  }
  if (!isCarousel) return { format: 'portrait', accent: 'copper', templateId: 'statement', slides: [cover] }

  const items = (post.slides ?? []).slice(0, 5)
  const total = items.length
  const content = items.map((cs, i) => ({
    id: eid('slide'),
    background: { type: 'solid', value: INK },
    elements: [
      T(`0${i + 1} / 0${total}`, [8, 8, 40, 6], { color: ACCENT, fontKey: 'sans', fontSize: 28, letterSpacing: 0.16, uppercase: true }),
      T(cs.heading, [8, 28, 84, 20], { color: CREAM, fontKey: 'serif', fontSize: 78, fontWeight: 300, lineHeight: 1.06 }, 'heading'),
      { id: eid('s'), type: 'shape', box: { x: 8, y: 52, w: 12, h: 0.6 }, style: { bg: ACCENT, radius: 0 }, content: '' },
      T(cs.body, [8, 57, 82, 34], { color: CREAM, fontKey: 'sans', fontSize: 40, lineHeight: 1.5, opacity: 0.9 }, 'body'),
    ],
  }))
  return { format: 'carousel', accent: 'copper', templateId: 'guide', slides: [cover, ...content] }
}

/* Save one post as a complete, editable draft in the Social Copilot. */
async function createDraft(admin: ReturnType<typeof createClient>, brand: Brand, owner: string, post: Post): Promise<string | null> {
  const isCarousel = post.format === 'carousel' && Array.isArray(post.slides) && post.slides.length >= 2
  const design = buildPostDesign(post, isCarousel)
  const row = {
    owner, brand_id: brand.id,
    topic: post.title, headline: post.title, caption: post.caption,
    hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
    format: isCarousel ? 'carousel' : 'portrait',
    sector: SECTORS.includes(post.sector) ? post.sector : 'hospitality',
    accent: 'copper', status: 'draft', platform: 'instagram', design,
  }
  const { data, error } = await admin.from('social_posts').insert(row).select('id').single()
  if (error) return null
  return (data as { id: string }).id
}

function renderEmail(brand: Brand, items: Item[], dateLabel: string): string {
  const accent = brand.accent_color || '#B5632F'
  const card = (it: Item, n: number) => {
    const p = it.post
    const isCarousel = p.format === 'carousel' && Array.isArray(p.slides) && p.slides.length >= 2
    const kind = isCarousel ? `Carousel &middot; ${p.slides!.length + 1} slides` : 'Single post'
    const link = it.draftId ? `${APP_URL}/social/studio/${it.draftId}` : `${APP_URL}/social`
    const slidesList = isCarousel
      ? `<div style="font-family:${SANS};font-weight:300;font-size:13px;line-height:1.7;color:${C.soft};margin-top:10px;">` +
        p.slides!.map((s, i) => `<div style="margin-top:6px;"><span style="color:${accent};">0${i + 1}</span> &nbsp;<strong style="font-weight:500;">${esc(s.heading)}</strong> &mdash; ${esc(s.body)}</div>`).join('') +
        `</div>`
      : ''
    return `
    <tr><td style="padding:26px 40px 0;">
      <div style="border:1px solid ${C.line};border-radius:14px;background:#fff;padding:22px 24px;">
        <div style="font-family:${SANS};font-size:11px;font-weight:500;letter-spacing:2.5px;text-transform:uppercase;color:${accent};">Post ${n} &middot; ${kind} &middot; ${esc(SECTOR_LABEL[p.sector] ?? 'Wellness')}</div>
        <div style="font-family:${SANS};font-weight:500;font-size:20px;color:${C.ink};margin:8px 0 10px;">${esc(p.title)}</div>
        <div style="font-family:${SANS};font-weight:300;font-size:14px;line-height:1.75;color:${C.soft};white-space:pre-line;">${esc(p.caption)}</div>
        ${slidesList}
        <div style="font-family:${SANS};font-size:12.5px;color:${accent};margin-top:12px;">${esc((p.hashtags ?? []).join('  '))}</div>
        ${p.sourceUrl ? `<div style="font-family:${SANS};font-size:11.5px;margin-top:10px;"><a href="${esc(p.sourceUrl)}" style="color:${C.muted};">Source</a></div>` : ''}
        <div style="margin-top:16px;"><a href="${esc(link)}" style="display:inline-block;border:1px solid ${accent};color:${accent};text-decoration:none;font-family:${SANS};font-size:11px;font-weight:500;letter-spacing:2px;text-transform:uppercase;padding:11px 22px;border-radius:999px;">Open draft in Copilot</a></div>
      </div>
    </td></tr>`
  }
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>3 posts for today</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet">
<style>@import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;1,300&display=swap');body,table,td,div,span{font-family:${SANS};}</style></head>
<body style="margin:0;background:${C.page};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};padding:32px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:${C.paper};">
  <tr><td align="center" style="padding:38px 40px 6px;"><img src="${LOGO_INK}" alt="${esc(brand.name)}" height="38" style="height:38px;width:auto;max-width:80%;display:block;border:0;margin:0 auto;" /></td></tr>
  <tr><td align="center" style="padding:16px 48px 0;font-family:${SANS};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${accent};">3 posts for today</td></tr>
  <tr><td align="center" style="padding:8px 48px 0;font-family:${SANS};font-weight:300;font-size:13px;color:${C.muted};">${esc(dateLabel)} &middot; drafted in your Copilot, ready for images</td></tr>
  ${items.map((it, i) => card(it, i + 1)).join('')}
  <tr><td style="height:36px;"></td></tr>
  <tr><td align="center" style="background:${C.ink};padding:36px 40px;">
    <img src="${LOGO_CREAM}" alt="${esc(brand.name)}" height="26" style="height:26px;width:auto;max-width:70%;display:block;border:0;margin:0 auto;" />
    <div style="font-family:${SANS};font-weight:300;font-style:italic;font-size:13px;color:${C.onDarkMuted};margin-top:12px;">Automated daily by the Studio Co-pilot</div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

/* The full pipeline: research, draft, save drafts, email the digest. Returns a
   summary (or, in preview, the generated posts without saving or emailing). */
async function runBatch(preview: boolean): Promise<Record<string, unknown>> {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  // Resolve the Hue & Heal brand (by name, then default, then first available).
  const cols = 'id, name, created_by, tone_of_voice, writing_guidelines, accent_color'
  let brand = (await admin.from('brand_profiles').select(cols).ilike('name', 'Hue & Heal').maybeSingle()).data as Brand | null
  if (!brand) brand = (await admin.from('brand_profiles').select(cols).eq('is_default', true).maybeSingle()).data as Brand | null
  if (!brand) brand = (await admin.from('brand_profiles').select(cols).limit(1).maybeSingle()).data as Brand | null
  if (!brand) return { error: 'No brand found' }

  let owner = brand.created_by ?? null
  if (!owner) {
    const mem = await admin.from('brand_members').select('user_id').eq('brand_id', brand.id).not('user_id', 'is', null).limit(1).maybeSingle()
    owner = (mem.data as { user_id?: string } | null)?.user_id ?? null
  }

  // Memory: what the last 30 days of drafts already covered.
  const recent = await recentCoverage(admin, brand.id)
  const avoid = avoidBlock(recent.titles)

  const brief = await research(avoid)
  let posts = enforceBrandName(await draftPosts(brand, brief, avoid))

  // Repeat guard: if any post is about a subject already covered (or two posts
  // in the batch share a subject), redraft once with explicit feedback.
  const inBatch = new Set<string>()
  const dupes: string[] = []
  for (const p of posts) {
    const s = (p.subject ?? '').trim().toLowerCase()
    if (isRepeat(p, recent.haystack) || (s && s !== 'evergreen' && inBatch.has(s))) dupes.push(p.subject ?? p.title)
    if (s) inBatch.add(s)
  }
  if (dupes.length) {
    const feedback =
      `YOUR PREVIOUS ATTEMPT REPEATED COVERAGE OF: ${dupes.join(', ')}. ` +
      'These subjects were already covered recently. Replace every repeated post with a post about a completely different company, product or subject.'
    try { posts = enforceBrandName(await draftPosts(brand, brief, avoid, feedback)) } catch { /* keep the first batch rather than fail the run */ }
  }

  const items: Item[] = []
  for (const p of posts) {
    const draftId = preview || !owner ? null : await createDraft(admin, brand, owner, p)
    items.push({ post: p, draftId })
  }

  if (preview) return { ok: true, preview: true, brand: brand.name, posts: items.map((it) => it.post) }

  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/London' })
  const html = renderEmail(brand, items, dateLabel)
  const send = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: RESEND_FROM, to: [DAILY_TO], subject: '3 posts for today', html }),
  })
  if (!send.ok) return { error: `Resend ${send.status}: ${(await send.text()).slice(0, 300)}` }
  return { ok: true, brand: brand.name, posts: posts.length, drafts: items.filter((it) => it.draftId).length, to: DAILY_TO }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const secret = req.headers.get('x-cron-secret') ?? ''
  if (!CRON_SECRET || secret !== CRON_SECRET) return json({ error: 'Forbidden' }, 403)
  if (!ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY not set' }, 500)

  let preview = false
  try { preview = !!(await req.json())?.preview } catch { /* no body */ }
  if (!preview && !RESEND_API_KEY) return json({ error: 'RESEND_API_KEY not set' }, 500)

  // Preview runs synchronously so the caller can inspect the generated posts.
  if (preview) return json(await runBatch(true))

  // Real run: generation takes a couple of minutes, so do it in the background
  // and return immediately. The cron trigger (pg_net) is fire-and-forget, so it
  // never waits, and there is no request-timeout risk on the scheduled run.
  const gt = globalThis as unknown as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }
  if (gt.EdgeRuntime?.waitUntil) {
    gt.EdgeRuntime.waitUntil(runBatch(false).catch((e) => console.error('daily-posts failed:', e)))
    return json({ ok: true, started: true })
  }
  // Fallback (no background runtime): run inline.
  try { return json(await runBatch(false)) } catch (e) { return json({ error: String(e) }, 502) }
})

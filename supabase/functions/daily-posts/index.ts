// ============================================================================
// Hue & Heal :: daily-posts (automated, no user session)
// Every morning: research current wellness developments (live web search),
// write 3 distinct, ready-to-post pieces for Hue & Heal across digital AND
// physical wellness, generate an on-brand cover image for each, save them as
// EDITABLE DRAFTS in the Social Copilot (rendered by the real in-app templates
// on open), and email a digest to hello@hueandheal.com ("3 posts for today").
// Triggered by Supabase pg_cron; guarded by CRON_SECRET.
// preview:true returns the batch without saving drafts or emailing.
// Secrets: CRON_SECRET, ANTHROPIC_API_KEY, OPENAI_API_KEY, RESEND_API_KEY,
//          optional RESEND_FROM, ANTHROPIC_MODEL, OPENAI_IMAGE_MODEL, DAILY_TO.
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected by the runtime.
// Deploy:  npx supabase functions deploy daily-posts --no-verify-jwt --project-ref <ref>
//          (--no-verify-jwt is required so the cron's service-to-service call
//           reaches this code; the CRON_SECRET header is the real gate.)
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5'
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? ''
const OPENAI_IMAGE_MODEL = Deno.env.get('OPENAI_IMAGE_MODEL') ?? 'gpt-image-1'
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

const FALLBACK_STYLE =
  'Editorial photograph for Hue & Heal, a wellness experience design studio. Warm material palette: clay, bone, ' +
  'anthracite, taupe, muted terracotta and soft olive. Calm, cinematic, unhurried mood. Soft natural light, gentle ' +
  'contrast, fine film grain, shallow depth of field. Generous negative space for a considered composition.'
const FALLBACK_NEGATIVES =
  'Absolutely no text, words, captions, watermarks, logos, signage or UI. No posed people looking at the camera. Not oversaturated, not HDR, not stocky.'

// The angles the daily batch rotates across. Hue & Heal is a DIGITAL and
// PHYSICAL wellness experience studio, not only a designer of physical spaces.
const TOPIC_BUCKETS = [
  'A newly launched wellness product, app or experience worth knowing about',
  'News in the wellness industry: an acquisition, funding round, launch or major move',
  'A digital thought piece on where wellness technology and experience are heading',
  'Wellness showing up in an unexpected industry (workplace, retail, travel, finance, education)',
  'The psychology of wellbeing and how it should shape the design of digital and physical experiences',
]

interface Post { title: string; format: string; caption: string; hashtags: string[]; visualPrompt: string; altText: string; sector: string; sourceUrl?: string }
interface Brand {
  id: string; name: string; created_by?: string | null; tone_of_voice?: string | null; writing_guidelines?: string | null
  image_master_prompt?: string | null; image_negatives?: string | null; accent_color?: string | null
}

function esc(s: string): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const POSITIONING =
  'Hue & Heal is a wellness experience design studio working across BOTH digital and physical wellness: apps, ' +
  'products, services and programmes as well as physical spaces. Never imply the studio only designs physical rooms.'

/* Step 1: research real, current developments with live web search. Returns a
   short brief (with sources). Resilient: if web search is unavailable, returns
   an empty string and the draft step falls back to evergreen angles. */
async function research(): Promise<string> {
  try {
    const prompt =
      `${POSITIONING}\n\n` +
      'Use web search to find real, current and specific developments from the last few weeks that would inspire ' +
      'strong social posts. Cover a spread across these angles:\n' +
      TOPIC_BUCKETS.map((b, i) => `${i + 1}. ${b}`).join('\n') +
      '\n\nReturn a short brief of 3 to 5 concrete, real items (name the real product, company, study or launch) ' +
      'each with one sentence of context and its source URL. British English. Do not invent anything.'
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL, max_tokens: 1800,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
        messages: [{ role: 'user', content: prompt }],
      }),
    })
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
            title: { type: 'string', description: 'A short headline / hook (also used as the on-image headline). Under 8 words.' },
            format: { type: 'string', enum: ['single', 'carousel', 'story', 'reel-cover'], description: 'Suggested Instagram format.' },
            caption: { type: 'string', description: 'The full ready-to-post caption: a strong hook, natural flow, a soft call to action. British English. Never use em dashes or en dashes.' },
            hashtags: { type: 'array', items: { type: 'string' }, description: '5 to 8 relevant hashtags, each starting with #.' },
            visualPrompt: { type: 'string', description: 'A vivid brief for the cover photograph. Describe scene, light, materials, mood. No text in the image.' },
            altText: { type: 'string', description: 'Concise alt text for the image.' },
            sector: { type: 'string', enum: ['hospitality', 'food_beverage', 'health_fitness', 'education'], description: 'The sector this post best fits.' },
            sourceUrl: { type: 'string', description: 'If based on a real news item, the source URL. Empty string if evergreen.' },
          },
          required: ['title', 'format', 'caption', 'hashtags', 'visualPrompt', 'altText', 'sector'],
        },
      },
    },
    required: ['posts'],
  },
}

/* Step 2: turn the research into 3 polished posts in the brand voice. */
async function draftPosts(brand: Brand, brief: string): Promise<Post[]> {
  const voice = (brand.tone_of_voice ?? '').trim()
  const guides = (brand.writing_guidelines ?? '').trim()
  const prompt =
    `${POSITIONING}\n\n` +
    (brief
      ? `Use this research as the factual basis. Ground every claim in it and do not invent beyond it:\n${brief}\n\n`
      : 'No live research is available, so use evergreen angles (a digital thought piece, wellness in another industry, and the psychology of wellbeing shaping design). Do not state anything as breaking news.\n\n') +
    `Write today's 3 polished, ready-to-post Instagram posts for ${brand.name}.\n` +
    (voice ? `\nVOICE (follow it closely):\n${voice}\n` : '') +
    (guides ? `\nWRITING GUIDELINES:\n${guides}\n` : '') +
    '\nRules: three genuinely distinct angles drawn from different topic buckets (digital and physical, not all about physical spaces). ' +
    'Each caption stands on its own, ready to publish, with a scroll-stopping first line and a soft call to action. ' +
    'Concrete and specific over abstract. No hype, no invented statistics, no emoji. British English. ' +
    'Never use em dashes or en dashes anywhere. Use commas, colons, full stops, or the word "and" instead. ' +
    'Call the daily_posts tool with exactly 3 posts.'
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 2500, tools: [TOOL], tool_choice: { type: 'tool', name: 'daily_posts' }, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${(await resp.text()).slice(0, 300)}`)
  const data = await resp.json()
  const use = (data.content ?? []).find((b: { type: string }) => b.type === 'tool_use')
  const posts = use?.input?.posts
  if (!Array.isArray(posts) || !posts.length) throw new Error('No posts returned')
  return posts.slice(0, 3) as Post[]
}

async function generateImage(brand: Brand, post: Post, admin: ReturnType<typeof createClient>, dayKey: string, i: number): Promise<string | null> {
  if (!OPENAI_API_KEY) return null
  try {
    const style = (brand.image_master_prompt ?? '').trim() || FALLBACK_STYLE
    const negatives = (brand.image_negatives ?? '').trim() || FALLBACK_NEGATIVES
    const isDalle = OPENAI_IMAGE_MODEL.includes('dall-e')
    const payload: Record<string, unknown> = { model: OPENAI_IMAGE_MODEL, prompt: `${style} ${post.visualPrompt} ${negatives}`, size: '1024x1024', n: 1 }
    if (isDalle) payload.response_format = 'b64_json'
    const resp = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { authorization: `Bearer ${OPENAI_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!resp.ok) return null
    const data = await resp.json()
    const b64 = data?.data?.[0]?.b64_json
    if (!b64) return null
    const png = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const path = `daily/${brand.id}/${dayKey}/post-${i + 1}.png`
    const { error } = await admin.storage.from('social-assets').upload(path, png, { contentType: 'image/png', upsert: true })
    if (error) return null
    return admin.storage.from('social-assets').getPublicUrl(path).data.publicUrl
  } catch {
    return null
  }
}

const FORMAT_MAP: Record<string, string> = { single: 'portrait', carousel: 'carousel', story: 'story', 'reel-cover': 'story' }
const SECTORS = ['hospitality', 'food_beverage', 'health_fitness', 'education']

/* Save one post as an editable draft the app renders with the real templates.
   design is left empty so the studio builds the template on open, using the
   cover image (statement template) + the brand's resolved style + Ivy Ora. */
async function createDraft(admin: ReturnType<typeof createClient>, brand: Brand, owner: string, post: Post, imageUrl: string | null): Promise<string | null> {
  const row = {
    owner, brand_id: brand.id,
    topic: post.title, headline: post.title, caption: post.caption,
    hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
    format: FORMAT_MAP[post.format] ?? 'portrait',
    sector: SECTORS.includes(post.sector) ? post.sector : 'hospitality',
    accent: 'copper', status: 'draft', platform: 'instagram',
    image_url: imageUrl,
  }
  const { data, error } = await admin.from('social_posts').insert(row).select('id').single()
  if (error) return null
  return (data as { id: string }).id
}

interface Item { post: Post; imageUrl: string | null; draftId: string | null }

function renderEmail(brand: Brand, items: Item[], dateLabel: string): string {
  const accent = brand.accent_color || '#B5632F'
  const card = (it: Item, n: number) => {
    const p = it.post
    const link = it.draftId ? `${APP_URL}/social/studio/${it.draftId}` : `${APP_URL}/social`
    return `
    <tr><td style="padding:26px 40px 0;">
      <div style="border:1px solid ${C.line};border-radius:14px;overflow:hidden;background:#fff;">
        ${it.imageUrl ? `<img src="${esc(it.imageUrl)}" alt="${esc(p.altText)}" width="520" style="width:100%;max-width:520px;display:block;border:0;" />` : ''}
        <div style="padding:20px 22px;">
          <div style="font-family:${SANS};font-size:11px;font-weight:500;letter-spacing:2.5px;text-transform:uppercase;color:${accent};">Post ${n} &middot; ${esc(p.format)}</div>
          <div style="font-family:${SANS};font-weight:500;font-size:18px;color:${C.ink};margin:8px 0 10px;">${esc(p.title)}</div>
          <div style="font-family:${SANS};font-weight:300;font-size:14px;line-height:1.75;color:${C.soft};white-space:pre-line;">${esc(p.caption)}</div>
          <div style="font-family:${SANS};font-size:12.5px;color:${accent};margin-top:12px;">${esc((p.hashtags ?? []).join('  '))}</div>
          ${p.sourceUrl ? `<div style="font-family:${SANS};font-size:11.5px;margin-top:10px;"><a href="${esc(p.sourceUrl)}" style="color:${C.muted};">Source</a></div>` : ''}
          <div style="font-family:${SANS};font-weight:300;font-size:11.5px;color:${C.muted};margin-top:14px;">Image shown is the cover background. The finished on-brand template (headline, wordmark and all) renders in the Copilot, ready to tweak and export.</div>
          <div style="margin-top:12px;"><a href="${esc(link)}" style="display:inline-block;border:1px solid ${accent};color:${accent};text-decoration:none;font-family:${SANS};font-size:11px;font-weight:500;letter-spacing:2px;text-transform:uppercase;padding:11px 22px;border-radius:999px;">Open the finished post in Copilot</a></div>
        </div>
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
  <tr><td align="center" style="padding:8px 48px 0;font-family:${SANS};font-weight:300;font-size:13px;color:${C.muted};">${esc(dateLabel)} &middot; drafted and ready to edit in your Copilot</td></tr>
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  // Only the scheduler (or a deliberate manual call with the secret) may run this.
  const secret = req.headers.get('x-cron-secret') ?? ''
  if (!CRON_SECRET || secret !== CRON_SECRET) return json({ error: 'Forbidden' }, 403)
  if (!ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY not set' }, 500)

  let preview = false
  try { preview = !!(await req.json())?.preview } catch { /* no body */ }
  if (!preview && !RESEND_API_KEY) return json({ error: 'RESEND_API_KEY not set' }, 500)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  // Resolve the Hue & Heal brand (by name, then default, then first available).
  const cols = 'id, name, created_by, tone_of_voice, writing_guidelines, image_master_prompt, image_negatives, accent_color'
  let brand = (await admin.from('brand_profiles').select(cols).ilike('name', 'Hue & Heal').maybeSingle()).data as Brand | null
  if (!brand) brand = (await admin.from('brand_profiles').select(cols).eq('is_default', true).maybeSingle()).data as Brand | null
  if (!brand) brand = (await admin.from('brand_profiles').select(cols).limit(1).maybeSingle()).data as Brand | null
  if (!brand) return json({ error: 'No brand found' }, 404)

  // Owner for the draft rows (subscribers/posts need a real auth user as owner).
  let owner = brand.created_by ?? null
  if (!owner) {
    const mem = await admin.from('brand_members').select('user_id').eq('brand_id', brand.id).not('user_id', 'is', null).limit(1).maybeSingle()
    owner = (mem.data as { user_id?: string } | null)?.user_id ?? null
  }

  let posts: Post[]
  try {
    const brief = await research()
    posts = await draftPosts(brand, brief)
  } catch (e) {
    return json({ error: `Generation failed: ${e instanceof Error ? e.message : e}` }, 502)
  }

  const now = new Date()
  const dayKey = now.toISOString().slice(0, 10)
  const dateLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/London' })

  // Generate the 3 cover images concurrently to stay within the worker's time
  // budget, then save each as a draft.
  const items: Item[] = await Promise.all(
    posts.map(async (p, i) => {
      const imageUrl = await generateImage(brand, p, admin, dayKey, i)
      const draftId = preview || !owner ? null : await createDraft(admin, brand, owner, p, imageUrl)
      return { post: p, imageUrl, draftId }
    }),
  )

  if (preview) return json({ ok: true, preview: true, brand: brand.name, posts: items })

  const html = renderEmail(brand, items, dateLabel)
  const send = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: RESEND_FROM, to: [DAILY_TO], subject: '3 posts for today', html }),
  })
  const text = await send.text()
  if (!send.ok) return json({ error: `Resend ${send.status}: ${text.slice(0, 300)}` }, 502)

  return json({ ok: true, brand: brand.name, posts: posts.length, drafts: items.filter((it) => it.draftId).length, images: items.filter((it) => it.imageUrl).length, to: DAILY_TO })
})

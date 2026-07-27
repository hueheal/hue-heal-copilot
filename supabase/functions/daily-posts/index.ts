// ============================================================================
// Hue & Heal :: daily-posts (automated, no user session)
// Every morning, generate 3 polished, ready-to-post social pieces for the
// Hue & Heal brand (caption + hashtags + visual brief + an on-brand image each)
// and email them to hello@hueandheal.com with the subject "3 posts for today".
// Triggered by Supabase pg_cron; guarded by a shared secret so only the cron
// (or a deliberate manual call) can run it.
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

interface Post { title: string; format: string; caption: string; hashtags: string[]; visualPrompt: string; altText: string }
interface Brand {
  id: string; name: string; tone_of_voice?: string | null; writing_guidelines?: string | null
  image_master_prompt?: string | null; image_negatives?: string | null; accent_color?: string | null
}

function esc(s: string): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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
            title: { type: 'string', description: 'A short internal label / the hook line.' },
            format: { type: 'string', enum: ['single', 'carousel', 'story', 'reel-cover'], description: 'Suggested Instagram format.' },
            caption: { type: 'string', description: 'The full ready-to-post caption: a strong hook, natural flow, a soft call to action. British English. Never use em dashes or en dashes.' },
            hashtags: { type: 'array', items: { type: 'string' }, description: '5 to 10 relevant hashtags, each starting with #.' },
            visualPrompt: { type: 'string', description: 'A vivid brief for the photograph to accompany this post. Describe scene, light, materials and mood. No text in the image.' },
            altText: { type: 'string', description: 'Concise alt text for the image.' },
          },
          required: ['title', 'format', 'caption', 'hashtags', 'visualPrompt', 'altText'],
        },
      },
    },
    required: ['posts'],
  },
}

async function generatePosts(brand: Brand): Promise<Post[]> {
  const voice = (brand.tone_of_voice ?? '').trim()
  const guides = (brand.writing_guidelines ?? '').trim()
  const prompt =
    `Create today's batch of 3 polished, ready-to-post Instagram posts for ${brand.name}, a wellness experience design studio ` +
    `(hospitality, food and beverage, health and fitness, education).\n` +
    (voice ? `\nVOICE (follow it closely):\n${voice}\n` : '') +
    (guides ? `\nWRITING GUIDELINES:\n${guides}\n` : '') +
    '\nRules: three genuinely distinct angles (for example a point of view, a behind-the-design detail, and an invitation). ' +
    'Each caption stands on its own, ready to publish, with a scroll-stopping first line and a soft call to action. ' +
    'Concrete and sensory over abstract claims. No hype, no invented statistics, no emoji. British English. ' +
    'Never use em dashes or en dashes anywhere. Use commas, colons, full stops, or the word "and" instead. ' +
    'Call the daily_posts tool with exactly 3 posts.'

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 2200, tools: [TOOL], tool_choice: { type: 'tool', name: 'daily_posts' }, messages: [{ role: 'user', content: prompt }] }),
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

function renderEmail(brand: Brand, posts: Post[], images: (string | null)[], dateLabel: string): string {
  const accent = brand.accent_color || '#B5632F'
  const card = (p: Post, img: string | null, n: number) => `
  <tr><td style="padding:26px 40px 0;">
    <div style="border:1px solid ${C.line};border-radius:14px;overflow:hidden;background:#fff;">
      ${img ? `<img src="${esc(img)}" alt="${esc(p.altText)}" width="520" style="width:100%;max-width:520px;display:block;border:0;" />` : ''}
      <div style="padding:20px 22px;">
        <div style="font-family:${SANS};font-size:11px;font-weight:500;letter-spacing:2.5px;text-transform:uppercase;color:${accent};">Post ${n} &middot; ${esc(p.format)}</div>
        <div style="font-family:${SANS};font-weight:500;font-size:18px;color:${C.ink};margin:8px 0 10px;">${esc(p.title)}</div>
        <div style="font-family:${SANS};font-weight:300;font-size:14px;line-height:1.75;color:${C.soft};white-space:pre-line;">${esc(p.caption)}</div>
        <div style="font-family:${SANS};font-size:12.5px;color:${accent};margin-top:12px;">${esc((p.hashtags ?? []).join('  '))}</div>
        <div style="font-family:${SANS};font-weight:300;font-style:italic;font-size:12px;color:${C.muted};margin-top:12px;border-top:1px solid ${C.line};padding-top:10px;">Visual: ${esc(p.visualPrompt)}</div>
      </div>
    </div>
  </td></tr>`
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>3 posts for today</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet">
<style>@import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;1,300&display=swap');body,table,td,div,span{font-family:${SANS};}</style></head>
<body style="margin:0;background:${C.page};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};padding:32px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:${C.paper};">
  <tr><td align="center" style="padding:38px 40px 6px;"><img src="${LOGO_INK}" alt="${esc(brand.name)}" height="38" style="height:38px;width:auto;max-width:80%;display:block;border:0;margin:0 auto;" /></td></tr>
  <tr><td align="center" style="padding:16px 48px 0;font-family:${SANS};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${accent};">3 posts for today</td></tr>
  <tr><td align="center" style="padding:8px 48px 0;font-family:${SANS};font-weight:300;font-size:13px;color:${C.muted};">${esc(dateLabel)} &middot; drafted by the copilot</td></tr>
  ${posts.map((p, i) => card(p, images[i], i + 1)).join('')}
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
  if (!RESEND_API_KEY) return json({ error: 'RESEND_API_KEY not set' }, 500)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  // Resolve the Hue & Heal brand (by name, then default, then first available).
  let brand: Brand | null = null
  const cols = 'id, name, tone_of_voice, writing_guidelines, image_master_prompt, image_negatives, accent_color'
  const byName = await admin.from('brand_profiles').select(cols).ilike('name', 'Hue & Heal').maybeSingle()
  brand = (byName.data as Brand | null) ?? null
  if (!brand) {
    const def = await admin.from('brand_profiles').select(cols).eq('is_default', true).maybeSingle()
    brand = (def.data as Brand | null) ?? null
  }
  if (!brand) {
    const any = await admin.from('brand_profiles').select(cols).limit(1).maybeSingle()
    brand = (any.data as Brand | null) ?? null
  }
  if (!brand) return json({ error: 'No brand found' }, 404)

  let posts: Post[]
  try {
    posts = await generatePosts(brand)
  } catch (e) {
    return json({ error: `Generation failed: ${e instanceof Error ? e.message : e}` }, 502)
  }

  const now = new Date()
  const dayKey = now.toISOString().slice(0, 10)
  const dateLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/London' })

  // Generate the accompanying images (best effort; a failed image still ships the copy).
  const images: (string | null)[] = []
  for (let i = 0; i < posts.length; i++) images.push(await generateImage(brand, posts[i], admin, dayKey, i))

  const html = renderEmail(brand, posts, images, dateLabel)
  const send = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: RESEND_FROM, to: [DAILY_TO], subject: '3 posts for today', html }),
  })
  const text = await send.text()
  if (!send.ok) return json({ error: `Resend ${send.status}: ${text.slice(0, 300)}` }, 502)

  return json({ ok: true, brand: brand.name, posts: posts.length, images: images.filter(Boolean).length, to: DAILY_TO })
})

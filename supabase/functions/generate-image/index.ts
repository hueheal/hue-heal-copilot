// ============================================================================
// Hue & Heal — Studio Co-pilot :: generate-image
// Generates an on-brand background/asset image for a post and stores it in the
// `social-assets` bucket, returning a public URL. Provider-agnostic; defaults to
// OpenAI gpt-image-1 (single-key REST). Swap by setting IMAGE_PROVIDER.
// Secrets: OPENAI_API_KEY (or provider key), optional IMAGE_PROVIDER / OPENAI_IMAGE_MODEL.
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected by the edge runtime.
// Deploy:  npx supabase functions deploy generate-image
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const IMAGE_PROVIDER = Deno.env.get('IMAGE_PROVIDER') ?? 'openai'
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? ''
const OPENAI_IMAGE_MODEL = Deno.env.get('OPENAI_IMAGE_MODEL') ?? 'gpt-image-1'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

interface Body {
  postId: string
  topic: string
  sector: string
  accent: string
  preset?: string
  inspiration?: string
  /** Optional full override for the composed prompt (still gets the brand spec + negatives). */
  prompt?: string
}

/* ---- Brand style guardrail (always applied) ---- */
const BRAND_STYLE =
  'Editorial photograph for Hue & Heal, a wellness experience design studio. ' +
  'Warm material palette — clay, bone, anthracite, taupe, muted terracotta and soft olive; ' +
  'never cold, clinical or corporate. Calm, cinematic, unhurried mood. Soft natural light, ' +
  'gentle contrast, fine film grain, shallow depth of field. Composition leaves generous ' +
  'negative space (centre and lower third) for text overlay.'

const NEGATIVES =
  'Absolutely no text, words, captions, watermarks, logos, signage or UI. ' +
  'No posed people looking at the camera. Not oversaturated, not HDR, not stocky.'

/* ---- Curated photographic style presets ---- */
const PRESETS: Record<string, string> = {
  editorial: 'Interior architectural photography — considered spaces, warm layered lighting, tactile natural materials.',
  botanical: 'Biophilic and botanical — lush greenery, living walls, dappled daylight through planting, soft focus.',
  spa: 'Moody low-key wellness sanctuary — deep warm shadows, candle and lantern glow, steam, stillness, water.',
  daylight: 'Bright airy natural daylight — pale plaster and timber, minimal, calm, generous window light.',
  detail: 'Extreme close-up material detail — clay, timber, stone, linen and ceramic textures, raking side light.',
}

function composePrompt(b: Body): string {
  if (b.prompt) return `${BRAND_STYLE} ${b.prompt} ${NEGATIVES}`
  const preset = PRESETS[b.preset ?? 'editorial'] ?? PRESETS.editorial
  const subject = `Subject: ${b.sector.replace('_', ' ')} setting evoking “${b.topic}”.`
  const insp = b.inspiration?.trim() ? ` Art-direction notes to honour: ${b.inspiration.trim()}.` : ''
  return `${BRAND_STYLE} ${preset} ${subject}${insp} ${NEGATIVES}`
}

/** Returns raw PNG bytes for the composed prompt. */
async function generatePng(b: Body): Promise<Uint8Array> {
  if (IMAGE_PROVIDER === 'openai') {
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set on the function.')
    // gpt-image-1 always returns b64 and rejects response_format; DALL·E needs it.
    const isDalle = OPENAI_IMAGE_MODEL.includes('dall-e')
    const payload: Record<string, unknown> = {
      model: OPENAI_IMAGE_MODEL,
      prompt: composePrompt(b),
      size: '1024x1024',
      n: 1,
    }
    if (isDalle) payload.response_format = 'b64_json'
    const resp = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { authorization: `Bearer ${OPENAI_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${await resp.text()}`)
    const data = await resp.json()
    const b64 = data?.data?.[0]?.b64_json
    if (!b64) throw new Error('No image returned from provider')
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  }
  throw new Error(`Unsupported IMAGE_PROVIDER "${IMAGE_PROVIDER}"`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return json({ error: 'Missing Authorization' }, 401)

  let body: Body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!body.postId) return json({ error: 'postId is required' }, 400)

  // Identify the caller (RLS-scoped client using their JWT).
  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) return json({ error: 'Not authenticated' }, 401)
  const userId = userData.user.id

  let png: Uint8Array
  try {
    png = await generatePng(body)
  } catch (e) {
    return json({ error: String(e) }, 502)
  }

  // Store with a service-role client under the owner's folder.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const path = `${userId}/${body.postId}/bg-${Date.now()}.png`
  const { error: upErr } = await admin.storage
    .from('social-assets')
    .upload(path, png, { contentType: 'image/png', upsert: true })
  if (upErr) return json({ error: `Upload failed: ${upErr.message}` }, 502)

  const { data: pub } = admin.storage.from('social-assets').getPublicUrl(path)

  // Record the asset + point the post at it (best-effort; RLS-scoped).
  await userClient.from('post_assets').insert({ post_id: body.postId, kind: 'background', storage_path: path })
  await userClient.from('social_posts').update({ image_url: pub.publicUrl }).eq('id', body.postId)

  return json({ url: pub.publicUrl, path })
})

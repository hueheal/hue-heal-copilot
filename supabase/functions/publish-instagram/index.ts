// ============================================================================
// Hue & Heal :: publish-instagram
// Publishes a post to Instagram via the Graph API. User-triggered from the
// studio (verify_jwt on, so a signed-in session is required). Accepts already
// hosted JPEG image URLs plus a caption; single image or carousel.
// Flow: create media container(s) -> publish. Carousels create one child
// container per image, then a CAROUSEL parent, then publish.
// Credentials are per brand world: brand_profiles.instagram { user_id,
// access_token } for the brandId the caller passes (membership is checked
// with the caller's own JWT before the token is read with the service role).
// The global INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_USER_ID secrets remain a
// fallback for the parent studio. Optional GRAPH_VERSION. Tokens from either
// "Facebook Login for Business" (EAA…) or "Instagram API with Instagram
// Login" (IG…) are accepted; see baseFor().
// Deploy:  npx supabase functions deploy publish-instagram --project-ref <ref>
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FALLBACK_TOKEN = Deno.env.get('INSTAGRAM_ACCESS_TOKEN') ?? ''
const FALLBACK_USER = Deno.env.get('INSTAGRAM_USER_ID') ?? ''
const V = Deno.env.get('GRAPH_VERSION') ?? 'v21.0'
/** Two Meta routes publish to Instagram with the same container flow:
    Facebook Login tokens (EAA…) go through graph.facebook.com and need a
    Page-linked account; Instagram Login tokens (IG…) go through
    graph.instagram.com and need no Facebook Page at all. Route by token. */
const baseFor = (token: string) => token.startsWith('IG') ? `https://graph.instagram.com/${V}` : `https://graph.facebook.com/${V}`
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

interface Body { imageUrls: string[]; caption: string; brandId?: string }

/** Resolve the Instagram account for this brand world. The caller's JWT must be
    able to see the brand (RLS = membership); only then is the token read. */
async function credentialsFor(authHeader: string, brandId?: string): Promise<{ token: string; user: string } | { error: string }> {
  if (brandId && SUPABASE_URL && ANON && SERVICE_ROLE) {
    const asCaller = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } })
    const { data: visible } = await asCaller.from('brand_profiles').select('id, name').eq('id', brandId).maybeSingle()
    if (!visible) return { error: 'You do not have access to this workspace' }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data } = await admin.from('brand_profiles').select('instagram').eq('id', brandId).maybeSingle()
    const ig = ((data as { instagram?: { user_id?: string; access_token?: string } } | null)?.instagram) ?? {}
    if (ig.user_id && ig.access_token) return { token: ig.access_token, user: ig.user_id }
    // Parent studio may still rely on the function secrets.
    const isParent = ((visible as { name?: string }).name ?? '').toLowerCase().includes('hue')
    if (isParent && FALLBACK_TOKEN && FALLBACK_USER) return { token: FALLBACK_TOKEN, user: FALLBACK_USER }
    return { error: `Instagram is not connected for ${(visible as { name?: string }).name ?? 'this workspace'}. Connect it in Settings.` }
  }
  if (FALLBACK_TOKEN && FALLBACK_USER) return { token: FALLBACK_TOKEN, user: FALLBACK_USER }
  return { error: 'Instagram is not connected yet. Connect it in Settings.' }
}

async function graph(path: string, params: Record<string, string>, token: string): Promise<Record<string, unknown>> {
  const body = new URLSearchParams({ ...params, access_token: token })
  const res = await fetch(`${baseFor(token)}/${path}`, { method: 'POST', body })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // Surface everything Meta tells us: message, code, subcode and the user
    // title, so "API access blocked" comes with its reason attached.
    const e = (data as { error?: { message?: string; code?: number; error_subcode?: number; error_user_title?: string; error_user_msg?: string; type?: string } })?.error
    const bits = [e?.message ?? `Graph ${res.status}`]
    if (e?.error_user_title || e?.error_user_msg) bits.push(`${e.error_user_title ?? ''}${e.error_user_title && e.error_user_msg ? ': ' : ''}${e.error_user_msg ?? ''}`.trim())
    bits.push(`[${token.startsWith('IG') ? 'instagram' : 'facebook'} · code ${e?.code ?? res.status}${e?.error_subcode ? `/${e.error_subcode}` : ''} · ${path.replace(/^\d+\//, '{id}/')}]`)
    throw new Error(bits.join(' '))
  }
  return data as Record<string, unknown>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  let body: Body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }
  const creds = await credentialsFor(req.headers.get('authorization') ?? '', body.brandId)
  if ('error' in creds) return json({ error: creds.error }, 400)
  const TOKEN = creds.token, IG_USER = creds.user
  const images = (body.imageUrls ?? []).filter((u) => typeof u === 'string' && /^https?:\/\//.test(u))
  const caption = (body.caption ?? '').slice(0, 2200) // IG caption hard limit
  if (!images.length) return json({ error: 'No image URLs to publish' }, 400)

  try {
    let creationId: string
    if (images.length === 1) {
      const c = await graph(`${IG_USER}/media`, { image_url: images[0], caption }, TOKEN)
      creationId = String(c.id)
    } else {
      // Carousel: a child container per image, then a CAROUSEL parent.
      const children: string[] = []
      for (const url of images.slice(0, 10)) {
        const child = await graph(`${IG_USER}/media`, { image_url: url, is_carousel_item: 'true' }, TOKEN)
        children.push(String(child.id))
      }
      const parent = await graph(`${IG_USER}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption }, TOKEN)
      creationId = String(parent.id)
    }

    const published = await graph(`${IG_USER}/media_publish`, { creation_id: creationId }, TOKEN)
    const mediaId = String(published.id)

    // Best-effort permalink lookup.
    let permalink: string | null = null
    try {
      const res = await fetch(`${baseFor(TOKEN)}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(TOKEN)}`)
      const d = await res.json()
      permalink = (d as { permalink?: string })?.permalink ?? null
    } catch { /* ignore */ }

    return json({ ok: true, mediaId, permalink })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502)
  }
})

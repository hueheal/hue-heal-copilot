// ============================================================================
// Hue & Heal :: publish-instagram
// Publishes a post to Instagram via the Graph API. User-triggered from the
// studio (verify_jwt on, so a signed-in session is required). Accepts already
// hosted JPEG image URLs plus a caption; single image or carousel.
// Flow: create media container(s) -> publish. Carousels create one child
// container per image, then a CAROUSEL parent, then publish.
// Secrets: INSTAGRAM_ACCESS_TOKEN (long-lived), INSTAGRAM_USER_ID (IG Business
//          account id), optional GRAPH_VERSION.
// Deploy:  npx supabase functions deploy publish-instagram --project-ref <ref>
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'

const TOKEN = Deno.env.get('INSTAGRAM_ACCESS_TOKEN') ?? ''
const IG_USER = Deno.env.get('INSTAGRAM_USER_ID') ?? ''
const V = Deno.env.get('GRAPH_VERSION') ?? 'v21.0'
const BASE = `https://graph.facebook.com/${V}`

interface Body { imageUrls: string[]; caption: string }

async function graph(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const body = new URLSearchParams({ ...params, access_token: TOKEN })
  const res = await fetch(`${BASE}/${path}`, { method: 'POST', body })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (data as { error?: { message?: string } })?.error?.message ?? `Graph ${res.status}`
    throw new Error(msg)
  }
  return data as Record<string, unknown>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!TOKEN || !IG_USER) return json({ error: 'Instagram is not connected yet. Add INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID.' }, 400)

  let body: Body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }
  const images = (body.imageUrls ?? []).filter((u) => typeof u === 'string' && /^https?:\/\//.test(u))
  const caption = (body.caption ?? '').slice(0, 2200) // IG caption hard limit
  if (!images.length) return json({ error: 'No image URLs to publish' }, 400)

  try {
    let creationId: string
    if (images.length === 1) {
      const c = await graph(`${IG_USER}/media`, { image_url: images[0], caption })
      creationId = String(c.id)
    } else {
      // Carousel: a child container per image, then a CAROUSEL parent.
      const children: string[] = []
      for (const url of images.slice(0, 10)) {
        const child = await graph(`${IG_USER}/media`, { image_url: url, is_carousel_item: 'true' })
        children.push(String(child.id))
      }
      const parent = await graph(`${IG_USER}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption })
      creationId = String(parent.id)
    }

    const published = await graph(`${IG_USER}/media_publish`, { creation_id: creationId })
    const mediaId = String(published.id)

    // Best-effort permalink lookup.
    let permalink: string | null = null
    try {
      const res = await fetch(`${BASE}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(TOKEN)}`)
      const d = await res.json()
      permalink = (d as { permalink?: string })?.permalink ?? null
    } catch { /* ignore */ }

    return json({ ok: true, mediaId, permalink })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502)
  }
})

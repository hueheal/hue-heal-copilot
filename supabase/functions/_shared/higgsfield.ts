// ============================================================================
// Higgsfield: image generation through the public API (soul/standard).
// One credential, KEY_ID:KEY_SECRET, in the HIGGSFIELD_KEY secret. Submit,
// then poll the status URL until the image is ready. Every call is bounded
// so an edge function never hangs on a slow render.
// ============================================================================
const KEY = Deno.env.get('HIGGSFIELD_KEY') ?? ''
const BASE = 'https://api.higgsfield.ai'

export const hasHiggsfield = (): boolean => Boolean(KEY)

/** The live API accepts these seven (its published spec lists more; they 422). */
export type Aspect = '1:1' | '4:3' | '3:4' | '3:2' | '2:3' | '16:9' | '9:16'
const ASPECTS: Aspect[] = ['1:1', '4:3', '3:4', '3:2', '2:3', '16:9', '9:16']
/** Nearest accepted ratio to what a surface asks for (4:5 -> 3:4, 16:10 -> 16:9, 2:1 -> 16:9). */
export function asAspect(s?: string | null, fallback: Aspect = '3:4'): Aspect {
  const m = (s ?? '').trim().match(/^(\d+(?:\.\d+)?)\s*[:x/]\s*(\d+(?:\.\d+)?)$/)
  if (!m) return fallback
  const want = Number(m[1]) / Number(m[2])
  if (!isFinite(want) || want <= 0) return fallback
  let best: Aspect = fallback, gap = Infinity
  for (const a of ASPECTS) {
    const [w, h] = a.split(':').map(Number)
    const d = Math.abs(Math.log(w / h) - Math.log(want))
    if (d < gap) { gap = d; best = a }
  }
  return best
}

interface Submit { request_id: string; status_url: string; status: string }
interface Status { status: string; images?: { url: string }[]; error?: string; detail?: string }

/** Both header styles Higgsfield accepts. The key is KEY_ID:KEY_SECRET. */
function headers(): Record<string, string> {
  const k = KEY.trim().replace(/^["']|["']$/g, '')
  const h: Record<string, string> = { Authorization: `Key ${k}`, 'content-type': 'application/json' }
  const i = k.indexOf(':')
  if (i > 0) { h['hf-api-key'] = k.slice(0, i); h['hf-secret'] = k.slice(i + 1) }
  return h
}

/** Describes the credential's shape for an error message. Never its value. */
function keyShape(): string {
  const k = KEY.trim()
  const i = k.indexOf(':')
  return `credential is ${k.length} characters, ${i > 0 ? `id ${i} characters and secret ${k.length - i - 1} characters` : 'with no colon between id and secret'}${/^["']|["']$/.test(k) ? ', wrapped in quotes' : ''}`
}

/** Submit one image and return the handles to poll with. */
export async function submitImage(prompt: string, opts: { aspect?: Aspect; resolution?: '720p' | '1080p'; count?: number; referenceUrl?: string } = {}): Promise<{ requestId: string; statusUrl: string }> {
  if (!KEY) throw new Error('HIGGSFIELD_KEY is not set on the function.')
  const count = Math.min(4, Math.max(1, Math.round(opts.count ?? 1)))
  // With a calibration frame the reference endpoint holds the look; otherwise standard.
  const endpoint = opts.referenceUrl ? 'higgsfield-ai/soul/reference' : 'higgsfield-ai/soul/standard'
  const body = opts.referenceUrl
    ? { prompt, image_reference_url: opts.referenceUrl, batch_size: count, resolution: opts.resolution ?? '1080p', aspect_ratio: opts.aspect ?? '3:4', enhance_prompt: false, style_strength: 0.8 }
    : { prompt, num_images: count, resolution: opts.resolution ?? '1080p', aspect_ratio: opts.aspect ?? '3:4' }
  const res = await fetch(`${BASE}/${endpoint}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`Higgsfield ${res.status}: ${(await res.text()).slice(0, 300)}${res.status === 401 ? ` (${keyShape()}; it must be the key id and secret from cloud.higgsfield.ai joined by a colon)` : ''}`)
  const sub = await res.json() as Submit
  if (!sub.request_id) throw new Error('Higgsfield returned no request id')
  return { requestId: sub.request_id, statusUrl: sub.status_url || `${BASE}/requests/${sub.request_id}/status` }
}

/** One look at a submitted request: ready with its image URLs, still rendering, or failed. */
export async function checkImage(statusUrl: string): Promise<{ state: 'ready'; url: string; urls: string[] } | { state: 'rendering' } | { state: 'failed'; reason: string }> {
  const s = await fetch(statusUrl, { headers: headers() })
  if (!s.ok) throw new Error(`Higgsfield status ${s.status}`)
  const st = await s.json() as Status
  if (st.status === 'completed') {
    const urls = (st.images ?? []).map((i) => i.url).filter(Boolean)
    return urls.length ? { state: 'ready', url: urls[0], urls } : { state: 'failed', reason: 'completed without an image' }
  }
  if (st.status === 'failed' || st.status === 'nsfw' || st.status === 'canceled') return { state: 'failed', reason: `${st.status}${st.error || st.detail ? `: ${st.error ?? st.detail}` : ''}` }
  return { state: 'rendering' }
}

/** Generate one image and wait for it (for the studio's own image button,
    where the caller is holding a request open). Bounded. */
export async function generateImage(prompt: string, opts: { aspect?: Aspect; resolution?: '720p' | '1080p'; timeoutMs?: number } = {}): Promise<{ url: string; requestId: string }> {
  const { requestId, statusUrl } = await submitImage(prompt, opts)
  const deadline = Date.now() + (opts.timeoutMs ?? 110_000)
  let wait = 2500
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, wait))
    wait = Math.min(wait + 1000, 6000)
    const c = await checkImage(statusUrl)
    if (c.state === 'ready') return { url: c.url, requestId }
    if (c.state === 'failed') throw new Error(`Higgsfield ${c.reason}`)
  }
  throw new Error('Higgsfield took too long; try again')
}

/** Fetch the rendered image bytes. */
export async function download(url: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Could not fetch the image (${r.status})`)
  return { bytes: new Uint8Array(await r.arrayBuffer()), contentType: r.headers.get('content-type') ?? 'image/png' }
}

// ============================================================================
// Higgsfield: image generation through the public API (soul/standard).
// One credential, KEY_ID:KEY_SECRET, in the HIGGSFIELD_KEY secret. Submit,
// then poll the status URL until the image is ready. Every call is bounded
// so an edge function never hangs on a slow render.
// ============================================================================
const KEY = Deno.env.get('HIGGSFIELD_KEY') ?? ''
const BASE = 'https://api.higgsfield.ai'

export const hasHiggsfield = (): boolean => Boolean(KEY)

export type Aspect = '1:1' | '4:3' | '3:4' | '3:2' | '2:3' | '5:4' | '4:5' | '16:9' | '9:16' | '21:9'
const ASPECTS: Aspect[] = ['1:1', '4:3', '3:4', '3:2', '2:3', '5:4', '4:5', '16:9', '9:16', '21:9']
export const asAspect = (s?: string | null, fallback: Aspect = '4:5'): Aspect => (ASPECTS.includes(s as Aspect) ? (s as Aspect) : fallback)

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

/** Generate one image and return its URL on Higgsfield's CDN plus the request id. */
export async function generateImage(prompt: string, opts: { aspect?: Aspect; resolution?: '720p' | '1080p'; timeoutMs?: number } = {}): Promise<{ url: string; requestId: string }> {
  if (!KEY) throw new Error('HIGGSFIELD_KEY is not set on the function.')
  const res = await fetch(`${BASE}/higgsfield-ai/soul/standard`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ prompt, num_images: 1, resolution: opts.resolution ?? '1080p', aspect_ratio: opts.aspect ?? '4:5' }),
  })
  if (!res.ok) throw new Error(`Higgsfield ${res.status}: ${(await res.text()).slice(0, 300)}${res.status === 401 ? ` (${keyShape()}; it must be the key id and secret from cloud.higgsfield.ai joined by a colon)` : ''}`)
  const sub = await res.json() as Submit
  if (!sub.request_id) throw new Error('Higgsfield returned no request id')
  const statusUrl = sub.status_url || `${BASE}/requests/${sub.request_id}/status`

  const deadline = Date.now() + (opts.timeoutMs ?? 110_000)
  let wait = 2500
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, wait))
    wait = Math.min(wait + 1000, 6000)
    const s = await fetch(statusUrl, { headers: headers() })
    if (!s.ok) throw new Error(`Higgsfield status ${s.status}`)
    const st = await s.json() as Status
    if (st.status === 'completed') {
      const url = st.images?.[0]?.url
      if (!url) throw new Error('Higgsfield completed without an image')
      return { url, requestId: sub.request_id }
    }
    if (st.status === 'failed' || st.status === 'nsfw' || st.status === 'canceled') {
      throw new Error(`Higgsfield ${st.status}${st.error || st.detail ? `: ${st.error ?? st.detail}` : ''}`)
    }
  }
  throw new Error('Higgsfield took too long; try again')
}

/** Fetch the rendered image bytes. */
export async function download(url: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Could not fetch the image (${r.status})`)
  return { bytes: new Uint8Array(await r.arrayBuffer()), contentType: r.headers.get('content-type') ?? 'image/png' }
}

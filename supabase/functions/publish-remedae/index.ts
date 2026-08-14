// ============================================================================
// Hue & Heal :: publish-remedae
// Forwards a finished journal article from the Copilot to remedae.app's
// studio publish endpoint. Exists so the shared publish key never reaches the
// browser. Called by signed-in Copilot users (JWT verified by the gateway).
// Secrets: REMEDAE_PUBLISH_KEY, optional REMEDAE_PUBLISH_URL.
// Deploy:  npx supabase functions deploy publish-remedae --project-ref <ref>
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'

const PUBLISH_URL = Deno.env.get('REMEDAE_PUBLISH_URL') ?? 'https://remedae.app/api/studio/publish'
const PUBLISH_KEY = Deno.env.get('REMEDAE_PUBLISH_KEY') ?? ''

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!PUBLISH_KEY) return json({ error: 'REMEDAE_PUBLISH_KEY is not set on the function.' }, 500)

  let body: { article?: Record<string, unknown> }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }
  const article = body?.article
  if (!article?.title || !Array.isArray(article?.body) || !(article.body as unknown[]).length) {
    return json({ error: 'article.title and a non-empty article.body are required' }, 400)
  }

  try {
    const res = await fetch(PUBLISH_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${PUBLISH_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ article }),
    })
    const text = await res.text()
    let data: Record<string, unknown>
    try { data = JSON.parse(text) } catch { data = { raw: text.slice(0, 300) } }
    if (!res.ok) return json({ error: (data.error as string) ?? `Remedae ${res.status}`, detail: data }, 502)
    return json(data)
  } catch (e) {
    return json({ error: `Could not reach remedae.app: ${e}` }, 502)
  }
})

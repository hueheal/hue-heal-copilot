// ============================================================================
// Hue & Heal — Studio Co-pilot :: analyze-reference
// Claude Vision reads a pasted reference image and returns a tight photographic
// art-direction brief, which the app feeds into generate-image (gpt-image-1).
// Secret: ANTHROPIC_API_KEY, optional ANTHROPIC_VISION_MODEL.
// Deploy:  npx supabase functions deploy analyze-reference --project-ref <ref>
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const MODEL = Deno.env.get('ANTHROPIC_VISION_MODEL') ?? Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5'

interface Body {
  imageBase64: string // no data: prefix
  mediaType?: string // e.g. image/jpeg
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY is not set on the function.' }, 500)

  let body: Body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!body.imageBase64) return json({ error: 'imageBase64 is required' }, 400)

  const prompt =
    'Look at this reference image and write a single tight paragraph (max ~60 words) describing its ' +
    'PHOTOGRAPHIC STYLE for an art-direction brief: lighting quality and direction, colour palette and ' +
    'temperature, mood, composition, depth of field, texture/grain, and lens feel. Describe style only — ' +
    'not the literal subject. No preamble, no lists, no quotes — just the description.'

  let resp: Response
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: body.mediaType ?? 'image/jpeg', data: body.imageBase64 } },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    })
  } catch (e) {
    return json({ error: `Upstream request failed: ${e}` }, 502)
  }

  if (!resp.ok) {
    const detail = await resp.text()
    return json({ error: `Anthropic ${resp.status}`, detail }, 502)
  }

  const data = await resp.json()
  const text = (data.content ?? []).find((b: { type: string }) => b.type === 'text')?.text ?? ''
  return json({ description: text.trim() })
})

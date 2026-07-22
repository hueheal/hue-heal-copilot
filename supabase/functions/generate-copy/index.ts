// ============================================================================
// Hue & Heal — Studio Co-pilot :: generate-copy
// Turns a content brief (topic / format / sector / accent + brand kit) into a
// structured, on-brand social post using the Anthropic Messages API.
// Secrets (never shipped to the browser): ANTHROPIC_API_KEY, optional ANTHROPIC_MODEL.
// Deploy:  npx supabase functions deploy generate-copy
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5'

interface Brief {
  topic: string
  format: string
  sector: string
  accent: string
  brand?: {
    name?: string
    tagline?: string
    voice?: string
  }
}

// Structured-output tool: forces Claude to return exactly the shape we render.
const POST_TOOL = {
  name: 'compose_post',
  description: 'Return the composed, on-brand social post.',
  input_schema: {
    type: 'object',
    properties: {
      headline: { type: 'string', description: 'Short editorial headline for the lead artifact (max ~6 words).' },
      caption: { type: 'string', description: 'The post caption in the brand voice, 2–4 sentences, may include one tasteful emoji.' },
      hashtags: { type: 'array', items: { type: 'string' }, description: '4–6 relevant hashtags, each starting with #.' },
      slides: {
        type: 'array',
        description: 'For carousel/report formats, 3–6 slides; otherwise an empty array.',
        items: {
          type: 'object',
          properties: {
            heading: { type: 'string' },
            body: { type: 'string' },
          },
          required: ['heading', 'body'],
        },
      },
    },
    required: ['headline', 'caption', 'hashtags', 'slides'],
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY is not set on the function.' }, 500)

  let brief: Brief
  try {
    brief = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const brand = brief.brand ?? {}
  const system = [
    `You are the Social Copilot for ${brand.name ?? 'Hue & Heal'}, a wellness experience design studio.`,
    brand.tagline ? `Brand tagline: "${brand.tagline}".` : '',
    brand.voice ? `Brand voice: ${brand.voice}` : 'Voice: warm, editorial, grounded — never salesy or hyped.',
    'Write in British English. Keep it elegant and specific to the sector. Never invent statistics or client names.',
  ]
    .filter(Boolean)
    .join('\n')

  const userPrompt =
    `Compose a ${brief.format} for the sector "${brief.sector}" on the topic "${brief.topic}". ` +
    `The lead artifact is a "A guide to ${brief.topic}" cover. ` +
    `Use the compose_post tool to return the result.`

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
        max_tokens: 1200,
        system,
        tools: [POST_TOOL],
        tool_choice: { type: 'tool', name: 'compose_post' },
        messages: [{ role: 'user', content: userPrompt }],
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
  const toolUse = (data.content ?? []).find((b: { type: string }) => b.type === 'tool_use')
  if (!toolUse) return json({ error: 'Model did not return structured output', raw: data }, 502)

  return json({ model: MODEL, post: toolUse.input })
})

// ============================================================================
// Hue & Heal — Studio Co-pilot :: generate-ideas
// Turns a theme/campaign into a set of on-brand Instagram content ideas.
// Secrets: ANTHROPIC_API_KEY, optional ANTHROPIC_MODEL.
// Deploy:  npx supabase functions deploy generate-ideas --project-ref <ref>
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5'

interface Body {
  theme: string
  count?: number
  brand?: { name?: string; tagline?: string; voice?: string }
}

const IDEAS_TOOL = {
  name: 'propose_ideas',
  description: 'Return a set of on-brand social content ideas.',
  input_schema: {
    type: 'object',
    properties: {
      ideas: {
        type: 'array',
        description: 'The content ideas.',
        items: {
          type: 'object',
          properties: {
            hook: { type: 'string', description: 'A short, scroll-stopping hook / title (max ~8 words).' },
            angle: { type: 'string', description: 'One sentence on the angle or what the piece explores.' },
            format: {
              type: 'string',
              enum: ['carousel', 'square', 'portrait', 'story', 'quote'],
              description: 'The best-fit Instagram format for this idea.',
            },
            rationale: { type: 'string', description: 'One short sentence on why this resonates for the brand/sector.' },
          },
          required: ['hook', 'angle', 'format', 'rationale'],
        },
      },
    },
    required: ['ideas'],
  },
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

  const brand = body.brand ?? {}
  const count = Math.min(Math.max(body.count ?? 6, 3), 10)
  const system = [
    `You are the social content strategist for ${brand.name ?? 'Hue & Heal'}, a wellness experience design studio`,
    `(hospitality, food & beverage, health & fitness, education).`,
    brand.tagline ? `Tagline: "${brand.tagline}".` : '',
    brand.voice ? `Voice: ${brand.voice}` : 'Voice: warm, editorial, grounded — never salesy or hyped.',
    'Write in British English. Ideas must be specific and useful, not generic. Never invent statistics or client names.',
  ]
    .filter(Boolean)
    .join('\n')

  const userPrompt =
    `Propose ${count} distinct Instagram content ideas${body.theme ? ` around the theme: "${body.theme}"` : ' for the coming weeks'}. ` +
    `Vary the formats and angles. Use the propose_ideas tool.`

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
        max_tokens: 1400,
        system,
        tools: [IDEAS_TOOL],
        tool_choice: { type: 'tool', name: 'propose_ideas' },
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

  return json({ model: MODEL, ideas: toolUse.input.ideas ?? [] })
})

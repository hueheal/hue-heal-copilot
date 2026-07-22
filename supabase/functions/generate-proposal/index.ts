// ============================================================================
// Hue & Heal — Studio Co-pilot :: generate-proposal
// Drafts an on-brand proposal (narrative sections + phased fees) from a scope
// brief, using the Anthropic Messages API. Co-writing: the app lets the user
// edit every section afterwards.
// Secrets: ANTHROPIC_API_KEY, optional ANTHROPIC_MODEL.
// Deploy:  npx supabase functions deploy generate-proposal --project-ref <ref>
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5'

interface Body {
  client: string
  brief: string
  sector?: string
  brand?: { name?: string; tagline?: string; voice?: string }
}

const PROPOSAL_TOOL = {
  name: 'compose_proposal',
  description: 'Return a complete, on-brand studio proposal.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Proposal title, e.g. "Experience design — flagship".' },
      intro: { type: 'string', description: 'Opening 2–3 sentences: the client’s context and the opportunity, in the brand voice.' },
      approach: { type: 'string', description: 'One paragraph on how the studio will approach the work.' },
      phases: {
        type: 'array',
        description: '3–5 delivery phases with a fee each (GBP, whole pounds) on sensible studio rates.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            detail: { type: 'string', description: 'One sentence on what this phase delivers.' },
            fee: { type: 'number', description: 'Phase fee in whole GBP.' },
          },
          required: ['name', 'detail', 'fee'],
        },
      },
      timeline: { type: 'string', description: 'Short timeline summary, e.g. "10–12 weeks across four phases".' },
      terms: { type: 'string', description: 'Brief payment terms, e.g. deposit + milestone billing.' },
    },
    required: ['title', 'intro', 'approach', 'phases', 'timeline', 'terms'],
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
  const system = [
    `You are the proposal writer for ${brand.name ?? 'Hue & Heal'}, a wellness experience design studio`,
    `working across hospitality, food & beverage, health & fitness and education.`,
    brand.tagline ? `Tagline: "${brand.tagline}".` : '',
    brand.voice ? `Voice: ${brand.voice}` : 'Voice: warm, editorial, grounded, confident — never salesy.',
    'Write in British English. Be specific to the brief; never invent facts, names or numbers beyond it.',
    'Fees should be realistic studio fees in GBP. Typical phases: Discovery, Concept, Design development, Delivery.',
  ]
    .filter(Boolean)
    .join('\n')

  const userPrompt =
    `Draft a proposal for the client "${body.client || 'the client'}"` +
    (body.sector ? ` in the ${body.sector} sector` : '') +
    `.\n\nScope / brief from the studio:\n${body.brief || '(no brief provided — propose a sensible wellness design engagement)'}` +
    `\n\nUse the compose_proposal tool.`

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
        max_tokens: 1600,
        system,
        tools: [PROPOSAL_TOOL],
        tool_choice: { type: 'tool', name: 'compose_proposal' },
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

  return json({ model: MODEL, proposal: toolUse.input })
})

// ============================================================================
// Hue & Heal — Studio Co-pilot :: generate-newsletter
// Drafts a full newsletter (subject, preheader, eyebrow + content blocks) for a
// topic, written in the calling brand world's tone of voice and guidelines.
// Returns the app's Block model so the composer can drop it straight in — the
// result stays fully editable.
// Secret: ANTHROPIC_API_KEY, optional ANTHROPIC_MODEL.
// Deploy:  npx supabase functions deploy generate-newsletter --project-ref <ref>
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5'

interface Body {
  topic: string
  notes?: string
  brandName?: string
  toneOfVoice?: string
  writingGuidelines?: string
  template?: string
}

const TOOL = {
  name: 'newsletter',
  description: 'A complete, on-brand newsletter draft.',
  input_schema: {
    type: 'object',
    properties: {
      subject: { type: 'string', description: 'Email subject line — specific, human, no clickbait, no emoji' },
      preheader: { type: 'string', description: 'Short preview line that complements (never repeats) the subject' },
      eyebrow: { type: 'string', description: 'Short section label, e.g. "The Journal" or "A guide to"' },
      blocks: {
        type: 'array',
        description: 'Body content in order. Open with a heading, then text; include one image placeholder where a photo belongs; finish with a single button CTA.',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['heading', 'text', 'image', 'button', 'divider'] },
            text: { type: 'string', description: 'For heading and text blocks. Use \\n\\n between paragraphs.' },
            alt: { type: 'string', description: 'For image blocks — describe the photo that belongs here.' },
            label: { type: 'string', description: 'For button blocks — the CTA label.' },
            href: { type: 'string', description: 'For button blocks — leave empty if unknown.' },
          },
          required: ['type'],
        },
      },
    },
    required: ['subject', 'preheader', 'eyebrow', 'blocks'],
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY is not set on the function.' }, 500)

  let body: Body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }
  const topic = (body.topic ?? '').trim()
  if (!topic) return json({ error: 'A topic is required' }, 400)

  const brand = (body.brandName ?? 'the brand').trim()
  const voice = (body.toneOfVoice ?? '').trim()
  const guides = (body.writingGuidelines ?? '').trim()
  const notes = (body.notes ?? '').trim()

  const prompt =
    `Write a newsletter for ${brand} on this topic: "${topic}".\n` +
    (notes ? `Notes and raw material to work from: ${notes}\n` : '') +
    (voice ? `\nTONE OF VOICE (follow it closely):\n${voice}\n` : '') +
    (guides ? `\nWRITING GUIDELINES (follow them):\n${guides}\n` : '') +
    (body.template ? `\nThis is a "${body.template}" style edition.\n` : '') +
    '\nRules: one clear idea, developed simply. Short paragraphs. Concrete and sensory over abstract claims. ' +
    'No hype, no buzzwords, no exclamation marks, no emoji. British English. ' +
    'Structure: a heading, 2–4 short text blocks, one image placeholder where a photo belongs, and exactly one button CTA at the end. ' +
    'Do not invent statistics, testimonials or facts. If a link is unknown, leave href empty. ' +
    'Call the newsletter tool with the result.'

  let resp: Response
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1600,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'newsletter' },
        messages: [{ role: 'user', content: prompt }],
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
  if (!toolUse?.input) return json({ error: 'No structured result returned' }, 502)
  return json({ newsletter: toolUse.input })
})

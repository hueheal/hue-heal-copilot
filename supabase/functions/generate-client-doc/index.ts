// ============================================================================
// Hue & Heal :: generate-client-doc
// Drafts a client document customised to the client and the brand voice:
// contracts, brand guidelines, sprint showcases, research findings, UX reviews,
// product specs (content docs), and onboarding / discovery questionnaires
// (form docs, completed step by step in the client portal).
// Secret: ANTHROPIC_API_KEY, optional ANTHROPIC_MODEL.
// Deploy:  npx supabase functions deploy generate-client-doc --project-ref <ref>
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5'

interface Body {
  kind: string
  kindLabel?: string
  isForm?: boolean
  isDeck?: boolean
  /** For decks: the document's inbuilt page structure to fill. */
  structure?: { eyebrow?: string; title?: string; layout?: string }[]
  clientName: string
  clientSector?: string
  clientNote?: string
  notes?: string
  brandName?: string
  toneOfVoice?: string
  writingGuidelines?: string
}

const CONTENT_TOOL = {
  name: 'client_doc',
  description: 'A complete client document.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Document title. Precise, warm, client-specific.' },
      dek: { type: 'string', description: 'One or two sentence standfirst.' },
      sections: {
        type: 'array',
        description: '3 to 7 sections that make the document genuinely useful, not filler.',
        items: { type: 'object', properties: { heading: { type: 'string' }, body: { type: 'string', description: 'Flowing paragraphs; separate paragraphs with blank lines.' } }, required: ['heading', 'body'] },
      },
    },
    required: ['title', 'dek', 'sections'],
  },
}

const DECK_TOOL = {
  name: 'client_deck',
  description: 'A complete 16:9 presentation deck (content pages only; the cover is handled separately).',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Deck title for the cover. Client-specific.' },
      dek: { type: 'string', description: 'One line under the cover title.' },
      slides: {
        type: 'array',
        description: 'The content pages, following the provided structure (one output page per structure page, in order).',
        items: {
          type: 'object',
          properties: {
            layout: { type: 'string', enum: ['content', 'list', 'statement'], description: 'content = title + prose; list = title + bullets; statement = one big idea.' },
            eyebrow: { type: 'string', description: 'Short section label.' },
            title: { type: 'string', description: 'Page title, under 10 words.' },
            body: { type: 'string', description: 'Concise prose for the page: 2 to 4 sentences that fit a slide, never an essay.' },
            bullets: { type: 'array', items: { type: 'string' }, description: 'For list pages: 3 to 6 short bullets.' },
          },
          required: ['layout', 'title', 'body'],
        },
      },
    },
    required: ['title', 'dek', 'slides'],
  },
}

const FORM_TOOL = {
  name: 'client_form',
  description: 'A step-by-step questionnaire the client completes one question at a time.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Questionnaire title. Warm and client-specific.' },
      dek: { type: 'string', description: 'One sentence inviting the client in.' },
      steps: {
        type: 'array',
        description: '6 to 12 steps. Start with a welcoming statement step, end with an open invitation question.',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['statement', 'text', 'long', 'choice', 'scale'], description: 'statement = no answer needed; text = short answer; long = paragraph; choice = options; scale = 1 to 5.' },
            question: { type: 'string' },
            help: { type: 'string', description: 'Optional gentle guidance under the question.' },
            options: { type: 'array', items: { type: 'string' }, description: 'For choice steps only: 3 to 5 options.' },
          },
          required: ['type', 'question'],
        },
      },
    },
    required: ['title', 'dek', 'steps'],
  },
}

/* Kind-specific direction so each document reads like the real thing. */
const KIND_BRIEF: Record<string, string> = {
  'contract': 'An engagement letter: parties, scope of work, deliverables, timeline, fees and payment terms, IP and confidentiality, revisions, and signatures. Professional but human; plain English, no legalese walls. Include placeholder brackets like [start date] where specifics are unknown. This is a starting draft, not legal advice.',
  'brand-guidelines': 'Brand guidelines: the brand idea in a sentence, voice and tone with dos and don\'ts, colour and its feeling, typography roles, imagery direction, and how the brand behaves in digital and physical touchpoints.',
  'research': 'Research findings: what we set out to learn, how we looked, what we found (grouped into clear themes with the evidence described honestly), what it means for the work, and recommended next moves.',
  'sprint-showcase': 'A sprint showcase: what shipped this sprint, the thinking behind each piece, what we learned, what is next. Confident and concrete, never salesy.',
  'ux-review': 'A UX review: the journeys examined, findings ordered by impact (each with what we observed, why it matters behaviourally, and the recommendation), quick wins versus deeper work.',
  'product-spec': 'Product design documentation: the problem and intent, the experience principles, the flows and states described clearly, interaction and UI decisions with their rationale, and open questions.',
  'onboarding': 'A warm onboarding questionnaire for a new client: who they are, how they like to work, goals and success measures, brand materials and access we need, and anything they want us to know.',
  'discovery': 'A design discovery questionnaire: the business context, the audience and their feelings, what exists today and what frustrates, dreams and constraints, taste references, and how they will judge success.',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY not set' }, 500)

  let body: Body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }
  const clientName = (body.clientName ?? '').trim()
  if (!clientName) return json({ error: 'Missing client' }, 400)
  const brand = (body.brandName ?? 'Hue & Heal').trim()
  const voice = (body.toneOfVoice ?? '').trim()
  const guides = (body.writingGuidelines ?? '').trim()
  const notes = (body.notes ?? '').trim()
  const isForm = !!body.isForm
  const isDeck = !!body.isDeck
  const kindBrief = KIND_BRIEF[body.kind] ?? `A ${body.kindLabel ?? body.kind} document.`
  const structure = Array.isArray(body.structure) && body.structure.length
    ? body.structure.map((s, i) => `${i + 1}. [${s.layout ?? 'content'}] ${s.eyebrow ?? ''} — ${s.title ?? ''}`).join('\n')
    : ''

  const prompt =
    `You are drafting a client document for ${brand}, a wellness experience design studio working across digital and physical experiences.\n\n` +
    `Client: ${clientName}${body.clientSector ? ` (${body.clientSector})` : ''}.` +
    (body.clientNote ? ` Context on the client: ${body.clientNote}.` : '') + '\n' +
    `Document: ${body.kindLabel ?? body.kind}. ${kindBrief}\n` +
    (notes ? `\nSpecific direction from the studio: ${notes}\n` : '') +
    (voice ? `\nTONE OF VOICE (follow it closely):\n${voice}\n` : '') +
    (guides ? `\nWRITING GUIDELINES:\n${guides}\n` : '') +
    '\nHouse rules: address the client by name where natural so it feels made for them, never generic. ' +
    'Precise, warm, design-led. British English. No hype, no buzzwords, no emoji. ' +
    'Never use em dashes or en dashes: use commas, colons, full stops, or the word "and". ' +
    'Do not invent facts, figures, dates or commitments; use [bracketed placeholders] where specifics are needed. ' +
    (isDeck
      ? 'This is a 16:9 presentation deck. Keep every page slide-sized: short titles, 2 to 4 sentence bodies, tight bullets. ' +
        (structure ? `Fill THIS structure, one output page per line, in order (keep the eyebrows, sharpen the titles):\n${structure}\n` : 'Create 6 to 9 well-structured pages.') +
        ' Call the client_deck tool with the result.'
      : isForm
      ? 'Questions should feel like a considered conversation, one thought at a time, never like a form. Call the client_form tool with the result.'
      : 'Call the client_doc tool with the result.')

  const tool = isDeck ? DECK_TOOL : isForm ? FORM_TOOL : CONTENT_TOOL
  let resp: Response
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 6000, tools: [tool], tool_choice: { type: 'tool', name: tool.name }, messages: [{ role: 'user', content: prompt }] }),
    })
  } catch (e) {
    return json({ error: `Request failed: ${e instanceof Error ? e.message : e}` }, 502)
  }
  if (!resp.ok) return json({ error: `Anthropic ${resp.status}: ${(await resp.text()).slice(0, 300)}` }, 502)
  const data = await resp.json()
  const use = (data.content ?? []).find((b: { type: string }) => b.type === 'tool_use')
  const result = use?.input as { title?: string; sections?: unknown[]; steps?: unknown[]; slides?: unknown[] } | undefined
  const ok = result && (
    isDeck ? Array.isArray(result.slides) && result.slides.length
    : isForm ? Array.isArray(result.steps) && result.steps.length
    : Array.isArray(result.sections) && result.sections.length
  )
  if (!ok) return json({ error: 'No draft returned' }, 502)
  return json({ result })
})

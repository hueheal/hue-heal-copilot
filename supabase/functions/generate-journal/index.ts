// ============================================================================
// Hue & Heal :: generate-journal
// Writes a full long-form journal article in the Hue & Heal voice: design-led,
// grounded in design thinking and behavioural psychology, slow and thoughtful
// but not over-prescriptive, precise, and always closing with key design
// takeaways clients can act on. Returns a structured article the copilot stores
// and (once the new site is live) publishes to the website journal.
// Secret: ANTHROPIC_API_KEY, optional ANTHROPIC_MODEL.
// Deploy:  npx supabase functions deploy generate-journal --project-ref <ref>
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5'

interface Body { topic: string; notes?: string; brandName?: string; toneOfVoice?: string; writingGuidelines?: string; kind?: string }

const TOOL = {
  name: 'journal_article',
  description: 'A complete long-form journal article.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'An evocative, precise title. Not clickbait.' },
      dek: { type: 'string', description: 'A one or two sentence standfirst that sets up the piece.' },
      readingTime: { type: 'string', description: 'Estimated reading time, e.g. "6 min read".' },
      sections: {
        type: 'array',
        description: '3 to 6 sections that develop one clear idea, unhurried and precise.',
        items: { type: 'object', properties: { heading: { type: 'string' }, body: { type: 'string', description: 'A few flowing paragraphs. Separate paragraphs with blank lines.' } }, required: ['heading', 'body'] },
      },
      takeaways: {
        type: 'array',
        description: '3 to 5 key design takeaways a client can leverage and learn from. Concrete and actionable, not generic.',
        items: { type: 'string' },
      },
    },
    required: ['title', 'dek', 'sections', 'takeaways'],
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY not set' }, 500)

  let body: Body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }
  const topic = (body.topic ?? '').trim()
  if (!topic) return json({ error: 'Give the article a topic' }, 400)
  const brand = (body.brandName ?? 'Hue & Heal').trim()
  const voice = (body.toneOfVoice ?? '').trim()
  const guides = (body.writingGuidelines ?? '').trim()
  const notes = (body.notes ?? '').trim()

  const isReport = body.kind === 'report'
  const prompt =
    (isReport
      ? `Write a full studio report for ${brand}, a wellness experience design studio working across digital and physical experiences. This is a wider publication (a "state of" style piece) the studio publishes under its own name: broader in scope than a journal article, surveying a territory and taking a clear editorial position. Structure it as a report with distinct chapters.\n\n`
      : `Write a full journal article for ${brand}, a wellness experience design studio working across digital and physical experiences, for the studio's website Journal.\n\n`) +
    `Topic: "${topic}".\n` +
    (notes ? `Notes and raw material to work from: ${notes}\n` : '') +
    (voice ? `\nTONE OF VOICE (follow it closely):\n${voice}\n` : '') +
    (guides ? `\nWRITING GUIDELINES:\n${guides}\n` : '') +
    '\nHouse style for the Journal:\n' +
    '- Design-led. Think like a studio that designs how spaces and products make people feel.\n' +
    '- Ground the thinking in design thinking and behavioural psychology. Reference established ideas by name where they genuinely fit (for example cognitive load, the peak-end rule, biophilia, defaults and nudges, habit loops), woven in naturally, never as an academic list. Do not invent studies, statistics or quotes.\n' +
    '- Slow and thoughtful, unhurried, but never over-prescriptive: offer ways of seeing, not rigid rules.\n' +
    '- Precise. Every paragraph earns its place. Concrete and sensory over abstract claims.\n' +
    '- British English. No hype, no buzzwords, no emoji. Never use em dashes or en dashes: use commas, colons, full stops, or the word "and".\n' +
    '- Always end with a short set of key design takeaways the client can leverage and learn from.\n\n' +
    'Call the journal_article tool with the finished piece.'

  let resp: Response
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 8000, tools: [TOOL], tool_choice: { type: 'tool', name: 'journal_article' }, messages: [{ role: 'user', content: prompt }] }),
    })
  } catch (e) {
    return json({ error: `Request failed: ${e instanceof Error ? e.message : e}` }, 502)
  }
  if (!resp.ok) return json({ error: `Anthropic ${resp.status}: ${(await resp.text()).slice(0, 300)}` }, 502)
  const data = await resp.json()
  const use = (data.content ?? []).find((b: { type: string }) => b.type === 'tool_use')
  const article = use?.input as { title?: string; sections?: unknown[] } | undefined
  if (!article || !Array.isArray(article.sections) || !article.sections.length) return json({ error: 'No article returned' }, 502)
  if (!article.title || !article.title.trim()) article.title = topic // model sometimes omits the title; fall back to the topic
  return json({ result: article })
})

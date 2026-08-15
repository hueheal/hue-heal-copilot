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

/* The Remedae journal authoring brief (remedae repo, docs/journal-authoring.md).
   Applied when the active brand world is Remedae. Structure and rules only;
   the brand's tone of voice and writing guidelines carry the voice itself. */
const REMEDAE_BRIEF =
  'You are writing for the Remedae journal at remedae.app. Remedae is a global health literacy platform holding the world\'s healing traditions (modern medicine, Ayurveda, TCM, Kampo, Unani, Siddha, naturopathy, homeopathy, African, Indigenous, functional, lifestyle, mind-body) in equal standing.\n' +
  'THE ONE RULE ABOVE ALL: no information is fabricated. Every fact, study, year, practitioner, remedy attribution and amount must be real and citeable. If you cannot cite it, leave it out. Never invent studies, quotes or numbers. Opinion, framing and connective tissue are fine.\n' +
  'Voice: a quietly brilliant friend explaining something on a long phone call. Warm not saccharine, curious not academic, confident not casual, honest not hedging. Between a Long Read editorial and a voice note from someone who actually knows.\n' +
  'Non-negotiables: no em dashes or en dashes ever (comma, full stop or colon). No "research shows" or "clinically proven" standalone: always which research, which year, what it found, or say it is unknown. Oxford commas. Smart quotes and apostrophes. One idea per sentence and per paragraph; vary length. The first line earns the second: no setup openings. Modern medicine sits alongside every tradition, never beneath. Frame is abundance ("all the remedies, from every tradition"), not debate.\n' +
  'Banned words: delve, navigate the landscape, unlock, leverage, harness, game-changer, revolutionize, tapestry, realm, elevate, unleash, journey, biohack, optimise (body context), performance (body context), ancient wisdom, timeless, eternal, secret, proven, magic, miracle, holistic, natural, clean, toxin-free, "heal your X in Y days", "listen to your body", "mind-body connection".\n' +
  'Avoid three registers: clinical (patients, presents with, consult your healthcare provider), woo (energies, chakras, divine feminine), hustle (biohack, optimise, unlock your potential).\n' +
  'Swaps: treatment -> remedy or practice; patient -> person or reader; cure -> help, ease, address; alternative medicine -> traditional medicine; evidence level -> research available; dosage -> amount, how much; side effect -> what to watch for; symptom -> what you\'re noticing.\n' +
  'Hooks: concrete ("Your nan was onto something."), human, low-key. Never "In a world where", "Did you know", "We need to talk about", "Let\'s dive into", or rhetorical questions as filler.\n' +
  'Title: 1 to 14 words carrying the promise; ends with a full stop, question mark or nothing, never an exclamation; a full stop over a colon ("Sleep. Sun. Breath. The free medicines."). Dek: 1 to 3 sentences that extend the title with the specific angle and what the reader gets, never repeating it.\n' +
  'Structure and rhythm: 700 to 1,800 words (a 5 to 10 minute read). The FIRST section\'s body opens with a lede paragraph that lands the concrete image or claim the piece hangs on. Then 2 to 4 sections, each with a short image-rich heading and 2 to 4 paragraphs of 40 to 90 words. Place a pulled quote (real, attributed) after a section every 2 to 3 sections to lift the pace. Use at most ONE numbered list in the whole piece, for the "things every tradition agrees on" moment. Cut a third out of your first draft.\n' +
  'Safety line: if the piece offers anything to try, close with a version, in the piece\'s own voice, of: none of this replaces a clinician; if something is new, severe or getting worse, the answer is a doctor, not a warm drink. Purely editorial pieces need one sentence acknowledging the limits of an article.\n' +
  'The takeaways field: 3 to 5 short, concrete things the reader can hold onto, in the same voice (never generic).\n'

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
        items: {
          type: 'object',
          properties: {
            heading: { type: 'string' },
            body: { type: 'string', description: 'A few flowing paragraphs. Separate paragraphs with blank lines.' },
            quote: {
              type: 'object',
              description: 'Optional pulled quote placed after this section. ONLY when you can attribute it to a real, named person or institution and you are confident it is real. Never invent a quote.',
              properties: { text: { type: 'string' }, attribution: { type: 'string', description: 'Real person or institution, e.g. "Dr. Aran Patel, gastroenterologist, in a 2024 review".' } },
              required: ['text', 'attribution'],
            },
            list: {
              type: 'array',
              description: 'Optional numbered list placed after this section: the "five things every tradition agrees on" moment. At most ONE list in the whole article.',
              items: { type: 'string' },
            },
          },
          required: ['heading', 'body'],
        },
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
  const isRemedae = brand.toLowerCase().includes('remedae')
  const prompt = isRemedae && !isReport
    ? `Write a full journal article for the Remedae journal.\n\nTopic: "${topic}".\n` +
      (notes ? `Notes and raw material to work from (treat as the reader-supplied source; do not go beyond what it and real, citeable knowledge support): ${notes}\n` : '') +
      (voice ? `\nTONE OF VOICE (follow it closely):\n${voice}\n` : '') +
      (guides ? `\nWRITING GUIDELINES:\n${guides}\n` : '') +
      `\nTHE REMEDAE JOURNAL BRIEF (this governs structure and rules):\n${REMEDAE_BRIEF}\n` +
      'British English. Call the journal_article tool with the finished piece: sections in reading order, with quote and list attached to the sections they follow.'
    : (isReport
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
    '- A pulled quote is welcome only when it is real and attributable to a named person; never invent one. Use a numbered list sparingly.\n' +
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

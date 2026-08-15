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
    guidelines?: string
  }
  /** Article mode: the post promotes a published journal article. The caption
      sends readers to it; slides distil its ideas rather than inventing new ones. */
  article?: {
    title: string
    dek?: string
    body?: string
    url: string
    takeaways?: string[]
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
  const isRemedae = (brand.name ?? '').toLowerCase().includes('remedae')
  const system = [
    isRemedae
      ? `You are the Social Copilot for Remedae, a global health literacy platform holding the world's healing traditions in equal standing.`
      : `You are the Social Copilot for ${brand.name ?? 'Hue & Heal'}, a wellness experience design studio.`,
    brand.tagline ? `Brand tagline: "${brand.tagline}".` : '',
    brand.voice ? `Brand voice: ${brand.voice}` : 'Voice: warm, editorial, grounded, never salesy or hyped.',
    brand.guidelines ? `Writing guidelines: ${brand.guidelines}` : '',
    'Write in British English. Keep it elegant and specific. Never invent statistics, studies, quotes or client names.',
    'Never use em dashes or en dashes anywhere. Use commas, colons, full stops, or the word "and" instead.',
  ]
    .filter(Boolean)
    .join('\n')

  const a = brief.article
  const isStory = /story/i.test(brief.format)
  const isCarousel = /carousel/i.test(brief.format)
  const userPrompt = a
    ? `This post promotes a published journal article. Do not add ideas that are not in it.\n` +
      `ARTICLE TITLE: ${a.title}\n` +
      (a.dek ? `STANDFIRST: ${a.dek}\n` : '') +
      (a.takeaways?.length ? `KEY TAKEAWAYS:\n${a.takeaways.map((t) => `- ${t}`).join('\n')}\n` : '') +
      (a.body ? `ARTICLE (excerpt):\n${a.body.slice(0, 3200)}\n` : '') +
      `LINK: ${a.url}\n\n` +
      `Compose a ${brief.format} for Instagram that makes people want to read the full piece.\n` +
      `- headline: the cover line, under 8 words. It may be the article title if it already lands, or a sharper hook drawn from it.\n` +
      `- caption: open with a scroll-stopping first line, give the reader one genuine idea from the article (not a summary of everything), and close by sending them to the full piece with the phrase "link in bio" (Instagram captions cannot carry live links). Do not paste the URL into the caption.\n` +
      (isCarousel
        ? `- slides: 3 to 5 content slides after the cover, each one clear idea from the article in the article's own order, heading of a few words and body of 1 to 3 sentences, so the swipe tells the story and the last slide points to the full read.\n`
        : isStory
          ? `- slides: exactly 2 short frames after the cover: one striking idea from the article, then a "read the full piece" frame. Heading of a few words, body one sentence.\n`
          : `- slides: an empty array (single image).\n`) +
      `- hashtags: 5 to 8, relevant to the article's subject and the brand.\n` +
      `Use the compose_post tool to return the result.`
    : `Compose a ${brief.format} for the sector "${brief.sector}" on the topic "${brief.topic}". ` +
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

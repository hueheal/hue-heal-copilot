// ============================================================================
// Hue & Heal — Studio Co-pilot :: generate-copy
// Turns a content brief (topic / format / sector / accent + brand kit) into a
// structured, on-brand social post using the Anthropic Messages API.
// Secrets (never shipped to the browser): ANTHROPIC_API_KEY, optional ANTHROPIC_MODEL.
// Deploy:  npx supabase functions deploy generate-copy
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'
import { enforceBrandName, brandNameRule } from '../_shared/brandName.ts'

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
    knowledge?: string
  }
  /** The studio template the copy will be laid into (e.g. 'rd-question'), so
      the headline can take that hook's shape. */
  template?: string
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
    brandNameRule(brand.name),
    brand.knowledge ? `COMPANY KNOWLEDGE (facts to draw on; never contradict them or invent beyond them):\n${brand.knowledge}` : '',
    'Write in British English. Keep it elegant and specific. Never invent statistics, studies, quotes or client names.',
    'Never use em dashes or en dashes anywhere. Use commas, colons, full stops, or the word "and" instead.',
  ]
    .filter(Boolean)
    .join('\n')

  const a = brief.article
  const isStory = /story/i.test(brief.format)
  const isCarousel = /carousel/i.test(brief.format)

  // Remedae's Instagram system: one hook, one promise, one cue. The headline
  // carries a single *highlighted* phrase, and each template is a hook shape.
  const RD_HOOKS: Record<string, string> = {
    'rd-question': 'THE QUESTION: the headline is a question the reader cannot leave unanswered, answered in the caption.',
    'rd-number': 'THE NUMBER: start the headline with one big number and a pipe, then the statement it completes, e.g. "3bn | people already know it. Most doctors were never taught it." Never invent the number; if no real figure exists, use a count from the traditions themselves (e.g. "6 | traditions agree on the first move").',
    'rd-list-tease': 'THE LIST TEASE: the headline promises N things; slide headings are the N items as short noun phrases (2 to 5 words), the first two are shown on the cover and the rest are withheld.',
    'rd-reframe': 'THE REFRAME: the headline is "you were told X, the traditions say Y". Slides are pairs: heading = the thing people are told (3 to 5 words), body = what the traditions actually say (one short sentence).',
    'rd-pov': 'THE POV: second person, present tense, a moment in time. Headline is two or three words with a full stop. Caption is intimate and specific.',
    'rd-quiz': 'THE QUIZ: the headline is a clue (an ingredient, ritual or phrase) without naming the tradition; the caption asks which tradition and invites a guess in the comments.',
    'rd-save': 'THE SAVE: a reference post. Headline starts "Save this for…". Slide headings are tradition names, slide bodies are the one-line practice for each.',
    'rd-cover': 'EDITORIAL COVER: the headline is the article title or a sharper version of it; the caption sells the read.',
    'rd-editorial': 'EDITORIAL: headline is the article title; the caption is a short standfirst then link in bio.',
    'rd-glance': 'QUICK GLANCE: headline "N remedies for *X*"; slides are the remedies: heading = remedy name (2 to 4 words), body = one line on when and how, starting with the tradition, e.g. "Ayurveda · Drink".',
    'rd-recipe': 'RECIPE: headline names the ache; the first slide heading is the remedy name, its body the method in one or two sentences.',
    'rd-quote': 'PULL QUOTE: the headline is a single resonant sentence, ideally with a family or kitchen image; caption gives the source of the practice.',
    'rd-remedy': 'REMEDY SPOTLIGHT: headline is the remedy in one or two words; caption gives what it is for in three short fragments.',
    'rd-evidence': 'EVIDENCE CARD: headline "What we know about *X*"; first slide heading "What the research finds" with a body of one careful sentence, second slide heading "What it does not yet show" with a body of one honest sentence. Never overstate.',
    'rd-rhythm': 'THREE WORDS: the headline is exactly three one-word remedies separated by full stops, e.g. "Sleep. Sun. Breath."',
    'rd-six': 'SIX TRADITIONS OPENER: headline in three short lines ending with what they each say; slides are one tradition each: heading = tradition name, body = its take in one sentence.',
    'rd-short': 'SHORT COVER: the headline is what the practitioner says on camera, one sentence, contrarian or surprising.',
    'rd-plus': 'PRODUCT PROMO: the headline is a calm promise about a personal practice; caption states the offer plainly.',
    'rd-orbit': 'ORBIT DIAGRAM: headline "Six traditions, *one body*" or a variant; slides are one tradition each: heading = tradition name only (1 to 2 words), body = its one-line take.',
    'rd-steps': 'NUMBERED STEPS: headline promises N reasons or steps; slides are the steps: heading = 3 to 5 words, body = one or two sentences.',
    'rd-checklist': 'CHECKLIST: headline names the routine; slides are the items: heading = an imperative of 4 to 7 words, body = one short sentence of why.',
    'rd-habits': 'HABIT CARDS: headline "X *habits* the world agrees on"; exactly 4 slides: heading = ONE word, body = one or two short sentences.',
    'rd-myth': 'MYTH / TRUTH: the first slide body is the common belief as people say it (one sentence); the headline is what the traditions actually say, with the highlighted phrase on the correction.',
  }
  const remedaeRules = isRemedae
    ? `
REMEDAE INSTAGRAM RULES:
` +
      `- headline: under 10 words. Wrap exactly one phrase of 1 to 3 words, the most charged, in *asterisks* (it is set in mint italic). No other markup.
` +
      `- One idea per post. Name the tradition when it matters (TCM, Ayurveda, Unani, Kampo, Native American, modern medicine), never "ancient wisdom".
` +
      `- caption: first line stops the scroll, then one genuine idea, then the cue (link in bio / save this / say it in the comments). If a study is referred to, add the source plainly at the end; never invent one. If the post reads as instruction (a remedy, recipe, routine or list of practices), end the caption with "Traditionally used, not medical advice."
` +
      (brief.template && RD_HOOKS[brief.template] ? `- HOOK SHAPE, ${RD_HOOKS[brief.template]}
` : '')
    : ''

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
      remedaeRules +
      `Use the compose_post tool to return the result.`
    : isRemedae
      ? `Compose a ${brief.format} for Instagram on the topic "${brief.topic}".` +
        (isCarousel ? ` Include 3 to 5 content slides after the cover, each one clear idea, heading of a few words and body of 1 to 2 sentences.` : isStory ? ` Include 2 short frames after the cover.` : ` slides: an empty array.`) +
        remedaeRules +
        `
Use the compose_post tool to return the result.`
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

  return json({ model: MODEL, post: enforceBrandName(toolUse.input) })
})

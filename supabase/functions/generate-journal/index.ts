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
import { enforceBrandName, brandNameRule } from '../_shared/brandName.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5'

interface Body {
  topic: string; notes?: string; brandName?: string; toneOfVoice?: string; writingGuidelines?: string; kind?: string
  /** Article type key (see ARTICLE_TYPES) and target length key (see LENGTHS). */
  articleType?: string
  length?: string
}

/* Article types: how the piece tells its story. Each brief shapes the arc and
   the balance of narrative to evidence; the brand's voice still governs the
   words. Mirrored in src/lib/articleTypes.ts for the editor's controls. */
const ARTICLE_TYPES: Record<string, { label: string; brief: string }> = {
  story: {
    label: 'Story-led',
    brief:
      'ARTICLE TYPE: story-led. Open on a person, a place or a moment (real, or clearly framed as illustrative) and let the reader arrive at the idea through the story. ' +
      'Evidence, studies and citations come in later and lightly, as support for what the story has already made felt, never as the opening move. Roughly two thirds narrative and observation, one third evidence and explanation. ' +
      'Close by returning to the opening scene or person, changed by what the piece has shown.',
  },
  explainer: {
    label: 'Explainer',
    brief:
      'ARTICLE TYPE: explainer. Take one thing people half-know and make it fully clear. Start from the everyday version of the question, then build understanding step by step in plain terms. ' +
      'Evidence is woven in where it clarifies, one named source at a time, never stacked. End with what the reader now understands that they did not before.',
  },
  research: {
    label: 'On the research',
    brief:
      'ARTICLE TYPE: research deep read. This piece is explicitly about what the studies say. Still open with the human question the research is trying to answer, then walk through the evidence honestly: what was studied, when, what it found, and what it could not show. ' +
      'Name every source. Be plain about weak or mixed evidence. Close with a fair, calibrated position.',
  },
  practical: {
    label: 'Practical guide',
    brief:
      'ARTICLE TYPE: practical guide. Something the reader can try tonight. Open with the situation the reader is in, give the practice with enough specificity to actually do it (amounts, timing, what to expect), then the why behind it in a paragraph or two. ' +
      'This is the piece where a numbered list of steps earns its place. Include the safety line near the end.',
  },
  essay: {
    label: 'Essay',
    brief:
      'ARTICLE TYPE: essay. A considered, personal-in-tone piece with a point of view. Open with an observation or a tension worth sitting with, develop it through two or three turns of thought, use one or two concrete examples, and land on a position the reader can disagree with. ' +
      'Evidence is welcome but serves the argument; this is thinking on the page, not a literature review.',
  },
  profile: {
    label: 'Profile',
    brief:
      'ARTICLE TYPE: profile. A portrait of a tradition, a practice, a place or a practitioner (real, from verifiable public knowledge only). Lead with a vivid, specific detail, then widen out to history, how it works and where it sits today. ' +
      'Let the subject carry the piece; quotes and sources support the portrait rather than replace it.',
  },
}

/* Target lengths. Words guide the model; readingTime follows from them. */
const LENGTHS: Record<string, { label: string; words: string; sections: string }> = {
  short: { label: 'Short', words: '450 to 700 words (a 3 to 4 minute read)', sections: '2 or 3 sections' },
  medium: { label: 'Medium', words: '800 to 1,200 words (a 5 to 7 minute read)', sections: '3 or 4 sections' },
  long: { label: 'Long read', words: '1,400 to 2,000 words (an 8 to 11 minute read)', sections: '4 to 6 sections' },
}

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
  'Structure and rhythm: length and section count are given below under LENGTH; follow them. The FIRST section\'s body opens with a lede: ONE short paragraph of at most two sentences (under 45 words) that lands a concrete image, a person or a moment (not a statistic or a study). It is set in large type on the page, so it must be brief. Everything after the lede is ordinary paragraphs. Each section has a short image-rich heading and 2 to 4 paragraphs of 40 to 90 words, separated by blank lines; never run a section into a single long block. Place a pulled quote (real, attributed) after a section every 2 to 3 sections to lift the pace. Use at most ONE numbered list in the whole piece. Cut a third out of your first draft.\n' +
  'Storytelling first: readers arrive at the evidence through people and moments, not the other way round. Do not open on a study, a percentage or "research shows". Introduce a source at the point where the story has made the reader want it.\n' +
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
        description: '3 to 6 sections that develop one clear idea, unhurried and precise. Each item is an object with heading and body only.',
        items: {
          type: 'object',
          properties: {
            heading: { type: 'string' },
            body: { type: 'string', description: 'A few flowing paragraphs. Separate paragraphs with blank lines.' },
          },
          required: ['heading', 'body'],
        },
      },
      quotes: {
        type: 'array',
        description: 'Optional pulled quotes, each placed after the section at afterSection (0-based index into sections). ONLY when you can attribute it to a real, named person or institution and you are confident it is real. Never invent a quote. Empty array if none.',
        items: {
          type: 'object',
          properties: {
            afterSection: { type: 'integer' },
            text: { type: 'string' },
            attribution: { type: 'string', description: 'Real person or institution, e.g. "Dr. Aran Patel, gastroenterologist, in a 2024 review".' },
          },
          required: ['afterSection', 'text', 'attribution'],
        },
      },
      lists: {
        type: 'array',
        description: 'Optional numbered lists, each placed after the section at afterSection (0-based). The "five things every tradition agrees on" moment. At most ONE list in the whole article. Empty array if none.',
        items: {
          type: 'object',
          properties: {
            afterSection: { type: 'integer' },
            items: { type: 'array', items: { type: 'string' } },
          },
          required: ['afterSection', 'items'],
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
  const atype = ARTICLE_TYPES[body.articleType ?? ''] ?? ARTICLE_TYPES.story
  const len = LENGTHS[body.length ?? ''] ?? LENGTHS.medium
  const shape =
    `\n${atype.brief}\n` +
    `LENGTH: ${len.words}, in ${len.sections}. This overrides any other length guidance. Set readingTime to match.\n`
  const prompt = isRemedae && !isReport
    ? `Write a full journal article for the Remedae journal.\n\nTopic: "${topic}".\n` +
      (notes ? `Notes and raw material to work from (treat as the reader-supplied source; do not go beyond what it and real, citeable knowledge support): ${notes}\n` : '') +
      (voice ? `\nTONE OF VOICE (follow it closely):\n${voice}\n` : '') +
      (guides ? `\nWRITING GUIDELINES:\n${guides}\n` : '') +
      `\nTHE REMEDAE JOURNAL BRIEF (this governs rules and voice):\n${REMEDAE_BRIEF}\n` +
      shape +
      (body.knowledge ? `\nCOMPANY KNOWLEDGE (facts to draw on; never contradict them or invent beyond them):\n${body.knowledge}\n` : '') + brandNameRule(brand) + ' British English. Call the journal_article tool with the finished piece: sections in reading order (heading and body only), then any real attributed quotes in "quotes" and at most one numbered list in "lists", each pointing at the section it follows via afterSection.'
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
    '- The first paragraph is a lede: at most two sentences, under 45 words, landing one concrete image or moment. It is set in large type, so keep it brief; everything after it is ordinary paragraphs separated by blank lines. Never run a section into one long block.\n' +
    '- British English. No hype, no buzzwords, no emoji. Never use em dashes or en dashes: use commas, colons, full stops, or the word "and".\n' +
    '- A pulled quote is welcome only when it is real and attributable to a named person; never invent one. Use a numbered list sparingly.\n' +
    '- Always end with a short set of key design takeaways the client can leverage and learn from.\n' +
    (isReport ? '' : shape) + '\n' +
    'Call the journal_article tool with the finished piece.'

  // Long articles routinely overflow the tool-argument parser (array fields
  // arrive as raw "<parameter>" strings). So we ask for the article as a JSON
  // document, and use the API's native structured output (a JSON schema on
  // output_config.format) so the response is guaranteed valid JSON: no
  // hand-repair of quotes or newlines in long prose.
  const jsonPrompt =
    prompt.replace(/Call the journal_article tool with the finished piece[^\n]*/, '') +
    '\nReturn the finished article as the JSON object described by the output schema: title, dek and readingTime as plain strings; sections as {heading, body} in reading order, with paragraphs inside body separated by a blank line; quotes and lists (each pointing at the section it follows via afterSection, 0-based; empty arrays if none); takeaways as an array of strings.'

  const ARTICLE_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'dek', 'readingTime', 'sections', 'quotes', 'lists', 'takeaways'],
    properties: {
      title: { type: 'string' },
      dek: { type: 'string' },
      readingTime: { type: 'string' },
      sections: {
        type: 'array',
        items: { type: 'object', additionalProperties: false, required: ['heading', 'body'], properties: { heading: { type: 'string' }, body: { type: 'string' } } },
      },
      quotes: {
        type: 'array',
        items: { type: 'object', additionalProperties: false, required: ['afterSection', 'text', 'attribution'], properties: { afterSection: { type: 'integer' }, text: { type: 'string' }, attribution: { type: 'string' } } },
      },
      lists: {
        type: 'array',
        items: { type: 'object', additionalProperties: false, required: ['afterSection', 'items'], properties: { afterSection: { type: 'integer' }, items: { type: 'array', items: { type: 'string' } } } },
      },
      takeaways: { type: 'array', items: { type: 'string' } },
    },
  }

  let resp: Response
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      // Sonnet 5 thinks adaptively by default and max_tokens caps thinking +
      // text together; a demanding brief can spend the whole budget deliberating.
      // Medium effort keeps the reasoning proportionate so the article itself
      // always fits, and the ceiling has headroom for the long pieces.
      // (Kept under the edge function's wall-clock so long pieces still return.)
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 9000,
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: ARTICLE_SCHEMA } },
        messages: [{ role: 'user', content: jsonPrompt }],
      }),
    })
  } catch (e) {
    return json({ error: `Request failed: ${e instanceof Error ? e.message : e}` }, 502)
  }
  if (!resp.ok) return json({ error: `Anthropic ${resp.status}: ${(await resp.text()).slice(0, 300)}` }, 502)
  const data = await resp.json()
  const text = (data.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n')
  type Sec = { heading?: string; body?: string; quote?: { text: string; attribution?: string }; list?: string[] }
  type Article = {
    title?: string; sections?: Sec[]
    quotes?: { afterSection?: number; text?: string; attribution?: string }[]
    lists?: { afterSection?: number; items?: string[] }[]
  }
  let article: Article | undefined
  let parseNote = ''
  {
    const s = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    const start = s.indexOf('{'), end = s.lastIndexOf('}')
    if (start >= 0 && end > start) {
      const raw = s.slice(start, end + 1)
      // Pass 1: as written. Pass 2: repair the two slips models make in long
      // JSON strings, raw newlines/tabs inside a string and unescaped inner
      // double quotes (detected as a quote followed by something that cannot
      // legally follow a closing quote).
      // Repair pass is a cheap linear scan (no backtracking regex, which can
      // stall the isolate on 30KB+ bodies): escape raw newlines/tabs and bare
      // inner quotes that appear inside string literals.
      const repair = (src: string): string => {
        let out = '', inStr = false, esc = false
        for (let i = 0; i < src.length; i++) {
          const c = src[i]
          if (inStr) {
            if (esc) { out += c; esc = false; continue }
            if (c === '\\') { out += c; esc = true; continue }
            if (c === '\n') { out += '\\n'; continue }
            if (c === '\r') continue
            if (c === '\t') { out += '\\t'; continue }
            if (c === '"') {
              // A closing quote is followed (after spaces) by , : } ] or end.
              let j = i + 1
              while (j < src.length && (src[j] === ' ' || src[j] === '\n' || src[j] === '\r' || src[j] === '\t')) j++
              const nxt = src[j]
              if (nxt === undefined || nxt === ',' || nxt === ':' || nxt === '}' || nxt === ']') { inStr = false; out += c }
              else out += '\\"'
              continue
            }
            out += c
          } else {
            if (c === '"') inStr = true
            out += c
          }
        }
        return out
      }
      try { article = JSON.parse(raw); parseNote = '' }
      catch (e1) {
        parseNote = String(e1).slice(0, 120)
        try { article = JSON.parse(repair(raw)); parseNote = '' } catch (e2) { parseNote += ' | repaired: ' + String(e2).slice(0, 120) }
      }
    }
  }

  // The API sometimes hands back an array-valued tool argument as a raw string
  // (a leaked "<parameter name=...>[...]" wrapper around the JSON). Recover the
  // JSON inside so a fully written article is never thrown away.
  const recover = (v: unknown): unknown => {
    if (typeof v !== 'string') return v
    const s = v.trim()
    const start = s.search(/[[{]/)
    if (start < 0) return v
    const endBracket = s.lastIndexOf(']'), endBrace = s.lastIndexOf('}')
    const end = Math.max(endBracket, endBrace)
    if (end <= start) return v
    try { return JSON.parse(s.slice(start, end + 1)) } catch { return v }
  }
  if (article) {
    for (const k of ['sections', 'quotes', 'lists', 'takeaways'] as const) {
      const rec = recover((article as Record<string, unknown>)[k])
      if (rec !== undefined) (article as Record<string, unknown>)[k] = rec
    }
    for (const k of ['title', 'dek', 'readingTime'] as const) {
      const val = (article as Record<string, unknown>)[k]
      if (typeof val === 'string') (article as Record<string, unknown>)[k] = val.replace(/<\/?parameter[^>]*>/g, '').trim()
    }
  }

  // Reattach top-level quotes/lists to their sections (the app's contract).
  if (article && Array.isArray(article.sections) && article.sections.length) {
    const secs = article.sections
    const at = (n: unknown) => Math.min(secs.length - 1, Math.max(0, Number.isFinite(Number(n)) ? Math.floor(Number(n)) : 0))
    for (const q of article.quotes ?? []) {
      if (q?.text?.trim() && q?.attribution?.trim()) secs[at(q.afterSection)].quote = { text: q.text.trim(), attribution: q.attribution.trim() }
    }
    for (const l of (article.lists ?? []).slice(0, 1)) {
      const items = (l?.items ?? []).map((s) => String(s).trim()).filter(Boolean)
      if (items.length) secs[at(l.afterSection)].list = items
    }
    delete article.quotes
    delete article.lists
  }

  if (!article || !Array.isArray(article.sections) || !article.sections.length) {
    // Surface why: stop reason and a glimpse of what came back, so a truncated
    // or refused response is diagnosable from the app instead of a blank error.
    const stop = data.stop_reason ?? 'unknown'
    const keys = article ? Object.keys(article as object).join(',') : 'none'
    const secType = article ? `${typeof article.sections}/${Array.isArray(article.sections)}` : 'n/a'
    const glimpse = `keys=${keys} sections=${secType} parse=${parseNote} sample=${JSON.stringify(article?.sections ?? null).slice(0, 200)} text=${text.slice(0, 120)}`
    console.error('generate-journal: no article', { stop, glimpse })
    return json({ error: `No article returned (stop: ${stop})`, detail: glimpse }, 502)
  }
  if (!article.title || !article.title.trim()) article.title = topic // model sometimes omits the title; fall back to the topic
  return json({ result: enforceBrandName(article) })
})

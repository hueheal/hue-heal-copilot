// ============================================================================
// Hue & Heal — Studio Co-pilot :: generate-social-style
// Reads a brand's inspiration text + reference images and returns a social
// STYLE PROFILE (background treatment, text tone, headline font, motif, tagline,
// alignment) that drives the template engine — so each brand world renders a
// distinct social look instead of inheriting Hue & Heal's.
// Secret: ANTHROPIC_API_KEY, optional ANTHROPIC_MODEL.
// Deploy:  npx supabase functions deploy generate-social-style --project-ref <ref>
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const MODEL = Deno.env.get('ANTHROPIC_VISION_MODEL') ?? Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5'

interface ImageInput { type: string; dataBase64: string }
interface Body { inspiration?: string; images?: ImageInput[]; brandName?: string; accentColor?: string }

const TOOL = {
  name: 'social_style',
  description: 'A social template style profile for the brand.',
  input_schema: {
    type: 'object',
    properties: {
      background: { type: 'string', enum: ['atmos', 'ink', 'accent', 'sand', 'photo'], description: 'atmos=warm gradient; ink=dark solid; accent=brand-colour solid; sand=light solid; photo=photo-led cover' },
      bgColor: { type: 'string', description: 'Optional hex for the ink/accent ground if a specific colour is implied; else omit' },
      textTone: { type: 'string', enum: ['cream', 'ink'], description: 'Light (cream) or dark (ink) text — pick for contrast against the background' },
      headlineFont: { type: 'string', enum: ['serif', 'sans'], description: 'serif = elegant/editorial; sans = modern/clean' },
      motif: { type: 'string', enum: ['rule', 'none'], description: 'A small accent rule under headlines, or none for a cleaner look' },
      tagline: { type: 'string', description: 'A short brand tagline for covers, or empty string if none' },
      align: { type: 'string', enum: ['left', 'center'], description: 'Headline alignment' },
      rationale: { type: 'string', description: 'One sentence on the look you chose' },
    },
    required: ['background', 'textTone', 'headlineFont', 'motif', 'tagline', 'align'],
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY is not set on the function.' }, 500)

  let body: Body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }
  const inspiration = (body.inspiration ?? '').trim()
  const images = Array.isArray(body.images) ? body.images.slice(0, 4) : []
  if (!inspiration && !images.length) return json({ error: 'Add inspiration or reference images' }, 400)

  const content: unknown[] = []
  for (const im of images) {
    if (im?.type?.startsWith('image/') && im.dataBase64) {
      content.push({ type: 'image', source: { type: 'base64', media_type: im.type, data: im.dataBase64 } })
    }
  }
  content.push({
    type: 'text',
    text:
      `Design a social-media template style for the brand "${body.brandName ?? 'this brand'}"` +
      (body.accentColor ? ` (brand accent ${body.accentColor})` : '') + '.\n' +
      (inspiration ? `The brand describes the look they want: "${inspiration}".\n` : '') +
      (images.length ? 'Use the attached reference image(s) as the visual direction.\n' : '') +
      'Choose a background treatment, text tone (must contrast the background), headline font, whether to use an accent rule, a short tagline (or empty), and alignment. ' +
      'Make it feel distinctly like THIS brand, not a generic wellness studio. Call the social_style tool.',
  })

  let resp: Response
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'social_style' },
        messages: [{ role: 'user', content }],
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
  if (!toolUse?.input) return json({ error: 'No style returned' }, 502)
  return json({ style: toolUse.input })
})

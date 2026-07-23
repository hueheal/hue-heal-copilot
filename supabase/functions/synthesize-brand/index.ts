// ============================================================================
// Hue & Heal — Studio Co-pilot :: synthesize-brand
// Reads uploaded brand inputs (logo image, brand-guideline PDF, tone-of-voice
// docs) and asks Claude to draft a starting brand identity for a new workspace:
// accent colour, headline font, tone of voice, writing guidelines, image
// creative-direction master prompt + negatives, and suggested modules.
// Returned to the onboarding wizard for review-then-apply.
// Secret: ANTHROPIC_API_KEY, optional ANTHROPIC_MODEL.
// Deploy:  npx supabase functions deploy synthesize-brand --project-ref <ref>
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5'

interface FileInput { name: string; type: string; dataBase64: string }
interface Body { files: FileInput[]; notes?: string }

const MODULES = ['social', 'newsletter', 'proposals', 'clients', 'reports', 'calendar', 'research', 'linkedin']

const TOOL = {
  name: 'brand_identity',
  description: 'A starting brand identity synthesised from the uploaded materials.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Brand name if evident from the files' },
      accent_color: { type: 'string', description: 'Primary brand colour as a hex string, e.g. #3E5C4B' },
      display_font: { type: 'string', enum: ['ivyora', 'poppins'], description: 'ivyora only for Hue & Heal itself; poppins for all other brands' },
      tone_of_voice: { type: 'string', description: 'How the brand sounds — 2-4 sentences' },
      writing_guidelines: { type: 'string', description: 'Concrete dos/donts + structure for written content' },
      image_master_prompt: { type: 'string', description: 'A rich photographic creative-direction master prompt for image generation, in the structured style of a premium editorial brief' },
      image_negatives: { type: 'string', description: 'What generated images must avoid' },
      suggested_modules: { type: 'array', items: { type: 'string', enum: MODULES }, description: 'Which copilot modules this brand likely needs' },
      summary: { type: 'string', description: 'One sentence on what you inferred' },
    },
    required: ['accent_color', 'display_font', 'tone_of_voice', 'writing_guidelines', 'image_master_prompt', 'image_negatives', 'suggested_modules'],
  },
}

function contentBlocks(files: FileInput[]): unknown[] {
  const blocks: unknown[] = []
  for (const f of files) {
    if (f.type.startsWith('image/')) {
      blocks.push({ type: 'image', source: { type: 'base64', media_type: f.type, data: f.dataBase64 } })
    } else if (f.type === 'application/pdf') {
      blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: f.dataBase64 } })
    } else if (f.type.startsWith('text/') || /\.(txt|md)$/i.test(f.name)) {
      let text = ''
      try { text = new TextDecoder().decode(Uint8Array.from(atob(f.dataBase64), (c) => c.charCodeAt(0))) } catch { /* skip */ }
      if (text) blocks.push({ type: 'text', text: `File "${f.name}":\n${text.slice(0, 8000)}` })
    }
  }
  return blocks
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY is not set on the function.' }, 500)

  let body: Body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }
  const files = Array.isArray(body.files) ? body.files : []
  if (!files.length) return json({ error: 'No files provided' }, 400)

  const instruction =
    'You are a brand strategist + art director. From the uploaded brand materials (logo, guidelines, tone-of-voice docs), ' +
    'synthesise a starting brand identity for a new white-label workspace in a wellness/lifestyle studio tool. ' +
    'Infer the primary brand colour as an accurate hex. Write a distinctive tone of voice and concrete writing guidelines. ' +
    'Write a rich, premium editorial photographic creative-direction master prompt (photography, lighting, colour, human authenticity, ' +
    'composition, environment, mood) plus a negatives list. Suggest the copilot modules this brand most needs. ' +
    'Use display_font "poppins" (Ivy Ora is reserved for Hue & Heal itself). ' +
    (body.notes ? `Additional context: ${body.notes}. ` : '') +
    'Call the brand_identity tool with your result.'

  let resp: Response
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'brand_identity' },
        messages: [{ role: 'user', content: [...contentBlocks(files), { type: 'text', text: instruction }] }],
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
  return json({ brand: toolUse.input })
})

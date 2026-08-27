// ============================================================================
// Shared role engine: one persona run = charter + brand voice + knowledge +
// a live workspace snapshot -> a structured deliverable with sections, and
// the operational ledger the role raises to its controller (tool needs and
// experiment proposals). Used by role-agent (on demand) and role-scheduler
// (cadenced runs + the weekly digest).
// ============================================================================
import { enforceBrandName, brandNameRule } from './brandName.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const MODEL = 'claude-sonnet-5'

export interface RoleDef { name: string; title: string; charter: string; instructions?: string }
export interface BrandDef { name?: string; tagline?: string; voice?: string; guidelines?: string; knowledge?: string }

export const DELIVERABLE_TOOL = {
  name: 'deliver',
  description: 'Return the finished deliverable for this run.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Short name for this deliverable, e.g. "September content plan".' },
      summary: { type: 'string', description: '2-3 sentences: the headline of what you concluded or produced.' },
      sections: {
        type: 'array',
        description: 'The body of the deliverable, in order. 2-6 sections.',
        items: { type: 'object', properties: { heading: { type: 'string' }, body: { type: 'string', description: 'Plain prose; short paragraphs separated by blank lines. Bullet lines may start with "- ".' } }, required: ['heading', 'body'] },
      },
      actions: {
        type: 'array',
        description: 'Concrete content pieces you propose, each spawnable as a draft. Empty if none.',
        items: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['carousel', 'portrait', 'story', 'journal', 'newsletter'] },
            topic: { type: 'string', description: 'The topic/brief for the piece, specific enough to write from.' },
            note: { type: 'string', description: 'Why this piece, in one line.' },
          },
          required: ['kind', 'topic'],
        },
      },
      needs: {
        type: 'array',
        description: 'Tools, data or access you need to run your division better. Only real, justified needs; usually 0-2.',
        items: { type: 'object', properties: { title: { type: 'string' }, detail: { type: 'string', description: 'What it unlocks and why it matters now.' } }, required: ['title', 'detail'] },
      },
      experiments: {
        type: 'array',
        description: 'Experiments you want approval to run. Only when the snapshot justifies one; usually 0-2.',
        items: { type: 'object', properties: { title: { type: 'string' }, detail: { type: 'string', description: 'Hypothesis, method, and how success is measured.' } }, required: ['title', 'detail'] },
      },
    },
    required: ['title', 'summary', 'sections', 'actions', 'needs', 'experiments'],
  },
}

export function roleSystem(role: RoleDef, brand: BrandDef): string {
  return [
    `You are the ${role.name}${role.title ? ` (${role.title})` : ''} of ${brand.name ?? 'this company'}. You run this division; the founder is your controller and reads your deliverables to run the business.`,
    `YOUR CHARTER: ${role.charter}`,
    role.instructions?.trim() ? `STANDING INSTRUCTIONS FROM THE CONTROLLER: ${role.instructions}` : '',
    brand.tagline ? `Brand tagline: "${brand.tagline}".` : '',
    brand.voice ? `Brand voice (write in it): ${brand.voice}` : '',
    brand.guidelines ? `Writing guidelines: ${brand.guidelines}` : '',
    brand.knowledge ? `COMPANY KNOWLEDGE (facts to draw on; never contradict them or invent beyond them):\n${brand.knowledge}` : '',
    brandNameRule(brand.name),
    'Work from the WORKSPACE SNAPSHOT you are given: reference real pieces by title, real cadence numbers, real pipeline names. Never invent metrics, pieces or results that are not in the snapshot; where data is missing, say so and raise it as a need.',
    'Be concrete and opinionated. Rank things. Cut things. A deliverable that could have been written without the snapshot is a failure.',
    'British English. Never use em dashes or en dashes: use commas, colons or full stops.',
    'Use the deliver tool to return the result.',
  ].filter(Boolean).join('\n')
}

export async function runPersona(role: RoleDef, brand: BrandDef, facts: string, task: string): Promise<Record<string, unknown>> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 6000,
      system: roleSystem(role, brand),
      tools: [DELIVERABLE_TOOL],
      tool_choice: { type: 'tool', name: 'deliver' },
      messages: [{ role: 'user', content: `WORKSPACE SNAPSHOT (live, factual):\n${facts}\n\nYOUR TASK:\n${task}` }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `Anthropic ${res.status}`)
  }
  const data = await res.json() as { content: { type: string; input?: Record<string, unknown> }[] }
  const use = data.content.find((c) => c.type === 'tool_use')
  if (!use?.input) throw new Error('The role returned nothing')
  return enforceBrandName(use.input)
}

export const DIGEST_TASK =
  'Write your weekly digest for the controller. Cover: 1) what your division shipped this week (by title, from the snapshot), 2) an honest performance readout of cadence and mix against what you would expect, 3) what is blocked or slipping and why, 4) your plan for next week with the specific pieces proposed as actions. Keep it tight enough to read in two minutes.'

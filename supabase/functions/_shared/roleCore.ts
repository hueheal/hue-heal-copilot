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

export interface RoleDef { name: string; title: string; charter: string; instructions?: string; owns?: string; defers?: string }
export interface BrandDef { name?: string; tagline?: string; voice?: string; guidelines?: string; knowledge?: string }
/** The rest of the org, as this role sees it. Colleagues are always from the
    same workspace: a role never learns that another brand world exists. */
export interface OrgDef {
  colleagues?: { name: string; title: string; owns?: string }[]
  /** Pre-rendered brief: colleagues' latest deliverables, live decisions, inbox. */
  brief?: string
}

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
      handoffs: {
        type: 'array',
        description: 'Notes to a named colleague, for anything that touches THEIR remit or answers something in your inbox. This is how you work with them instead of over them. Usually 0-2, empty if the org is a single seat.',
        items: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'The colleague by name, exactly as listed in THE ORG.' },
            subject: { type: 'string', description: 'One line: what you need from them or are telling them.' },
            body: { type: 'string', description: 'The detail, including what you have already decided on your side so they can work with it rather than around it.' },
          },
          required: ['to', 'subject', 'body'],
        },
      },
    },
    required: ['title', 'summary', 'sections', 'actions', 'needs', 'experiments', 'handoffs'],
  },
}

export function roleSystem(role: RoleDef, brand: BrandDef, org: OrgDef = {}): string {
  const ws = brand.name ?? 'this company'
  const colleagues = (org.colleagues ?? []).filter((c) => c.name !== role.name)
  return [
    `You are the ${role.name}${role.title ? ` (${role.title})` : ''} of ${ws}. You run this division; the founder is your controller and reads your deliverables to run the business.`,
    `YOUR CHARTER: ${role.charter}`,
    role.owns ? `YOUR REMIT: you own ${role.owns}.${role.defers ? ` You do not own ${role.defers}: those decisions belong to a colleague.` : ''}` : '',
    role.instructions?.trim() ? `STANDING INSTRUCTIONS FROM THE CONTROLLER: ${role.instructions}` : '',
    /* The workspace wall. Roles are hired per brand world and must never
       reason across them, even when the same founder runs both. */
    `WORKSPACE: you work for ${ws} and only ${ws}. Every fact you are given belongs to ${ws}. Never carry over audience, positioning, plans, results, examples or copy from any other company or brand, including any you may have worked on before. If you cannot answer from ${ws}'s own material, say so.`,
    colleagues.length
      ? [
          `THE ORG: you are one of several roles ${ws} employs. Your colleagues:`,
          ...colleagues.map((c) => `- ${c.name}${c.title ? ` (${c.title})` : ''}${c.owns ? `: owns ${c.owns}` : ''}`),
          'ORG PROTOCOL:',
          '- Read the ORG BRIEF before you decide anything. Your work sits on top of theirs.',
          "- Never redo, contradict or quietly overwrite a colleague's live decision. If you think one is wrong, leave it standing and write them a handoff explaining why, so the controller sees one disagreement rather than two conflicting plans.",
          '- Anything that falls inside a colleague\'s remit is theirs to decide: propose it to them as a handoff, do not decide it yourself.',
          '- Anything in YOUR INBOX was written to you by a colleague: address it explicitly in this deliverable, and reply with a handoff when it needs an answer.',
          '- Build on their work by name ("picking up the Editor-in-chief\'s note on…"), so the org reads as one team rather than parallel opinions.',
        ].join('\n')
      : '',
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

export async function runPersona(role: RoleDef, brand: BrandDef, facts: string, task: string, org: OrgDef = {}): Promise<Record<string, unknown>> {
  const message = [
    `WORKSPACE SNAPSHOT (live, factual):\n${facts}`,
    org.brief?.trim() ? `ORG BRIEF (what your colleagues have decided and asked of you):\n${org.brief.trim()}` : '',
    `YOUR TASK:\n${task}`,
  ].filter(Boolean).join('\n\n')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 6000,
      system: roleSystem(role, brand, org),
      tools: [DELIVERABLE_TOOL],
      tool_choice: { type: 'tool', name: 'deliver' },
      messages: [{ role: 'user', content: message }],
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
  'Write your weekly digest for the controller. Cover: 1) what your division shipped this week (by title, from the snapshot), 2) an honest performance readout of cadence and mix against what you would expect, 3) what is blocked or slipping and why, including anything you are waiting on from a colleague, 4) how your work lined up with the rest of the org this week: what you picked up from a colleague, what you handed over, and any disagreement still standing, 5) your plan for next week with the specific pieces proposed as actions. Keep it tight enough to read in two minutes.'

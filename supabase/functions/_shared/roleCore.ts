// ============================================================================
// Shared role engine: one persona run = charter + principles + brand voice +
// knowledge + the department playbook + a live workspace snapshot -> a
// structured deliverable with sections, and the operational ledger the seat
// raises to the founder (tool needs and experiment proposals). Used by
// role-worker (jobs), role-scheduler (cadenced runs, digests, the Friday
// retro) and telegram-bridge.
// ============================================================================
import { enforceBrandName, brandNameRule } from './brandName.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const MODEL = 'claude-sonnet-5'

/* Metering. List prices per million tokens in USD, converted to pence so a
   department budget reads in pounds. An estimate, labelled as one in the UI. */
const USD_PER_M_IN = 3
const USD_PER_M_OUT = 15
const GBP_PER_USD = 0.79
export interface Usage { input_tokens: number; output_tokens: number }
export const costPence = (u: Usage): number =>
  Math.round(((u.input_tokens / 1e6) * USD_PER_M_IN + (u.output_tokens / 1e6) * USD_PER_M_OUT) * GBP_PER_USD * 100 * 100) / 100
export const addUsage = (a: Usage, b: Usage): Usage => ({ input_tokens: a.input_tokens + b.input_tokens, output_tokens: a.output_tokens + b.output_tokens })
export const ZERO: Usage = { input_tokens: 0, output_tokens: 0 }

export interface RoleDef {
  name: string; title: string; charter: string; instructions?: string
  owns?: string; defers?: string
  /** From org/roles: the frameworks the seat works from and the lines it keeps. */
  principles?: string; never?: string; learnsFrom?: string
  seat?: 'lead' | 'member'; dept?: string
}
export interface BrandDef { name?: string; tagline?: string; voice?: string; guidelines?: string; knowledge?: string }
/** The rest of the org, as this seat sees it. Colleagues are always from the
    same workspace: a seat never learns that another brand world exists. */
export interface OrgDef {
  colleagues?: { name: string; title: string; owns?: string }[]
  /** Pre-rendered brief: colleagues' latest deliverables, live decisions, inbox. */
  brief?: string
  /** The department's living playbook, rewritten every Friday. */
  playbook?: string
  /** Tools the department has been granted, plus the in-house rule. */
  tools?: string
  /** What images the seat may request, from the brand's prompt library. */
  imagery?: string
  /** For a lead compiling: the team's contributions to this task. */
  contributions?: string
  /** For a member: who briefed them and why. */
  briefedBy?: string
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
        description: 'Tools, data, access or budget you need. Only real, justified needs; usually 0-2. In-house first: ask for an outside tool only when the work genuinely cannot be done with what you have.',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            detail: { type: 'string', description: 'What it unlocks and why it matters now.' },
            tool: { type: 'string', description: 'The tool key from TOOLS if this is a request for one, else omit.' },
            cost: { type: 'string', description: 'Estimated cost in pounds, e.g. "£29/month" or "about £4 per asset", if known.' },
          },
          required: ['title', 'detail'],
        },
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
      images: {
        type: 'array',
        description: 'Production images to generate, only if the deliverable needs them and IMAGES says you may. At most 3. Empty otherwise.',
        items: {
          type: 'object',
          properties: {
            purpose: { type: 'string', description: 'What the image is for, e.g. "hero for the reflux condition page" or "day 3 feed post".' },
            category: { type: 'string', description: 'A category from IMAGES.' },
            module: { type: 'string', description: 'The module within the category, when the category has them (e.g. a tradition).' },
            subject: { type: 'string', description: 'The specific scene: who, where, the object and the gesture. No style words.' },
            surface: { type: 'string', description: 'A surface from IMAGES.' },
          },
          required: ['purpose', 'category', 'subject', 'surface'],
        },
      },
      external: {
        type: 'boolean',
        description: 'True if acting on this deliverable would put something in front of the public or a third party, or commit money: publishing, posting, sending, outreach, a price or offer change, spend. Such deliverables wait for the founder\'s approval. Internal plans, research and drafts are false.',
      },
    },
    required: ['title', 'summary', 'sections', 'actions', 'needs', 'experiments', 'handoffs', 'external'],
  },
}

export function roleSystem(role: RoleDef, brand: BrandDef, org: OrgDef = {}): string {
  const ws = brand.name ?? 'this company'
  const colleagues = (org.colleagues ?? []).filter((c) => c.name !== role.name)
  const isLead = role.seat !== 'member'
  return [
    isLead
      ? `You are the ${role.name}${role.title ? ` (${role.title})` : ''} of ${ws}. You lead your department; the founder is your controller, talks only to department leads, and reads your deliverables to run the business.`
      : `You are the ${role.name}${role.title ? ` (${role.title})` : ''} of ${ws}. You are a member of a department and report to its lead, who briefed you and will compile your work. The founder does not read your work directly.`,
    `YOUR CHARTER: ${role.charter}`,
    role.owns ? `YOUR REMIT: you own ${role.owns}.${role.defers ? ` You do not own ${role.defers}: those decisions belong to a colleague.` : ''}` : '',
    role.principles ? `YOUR PRINCIPLES (the thinking you work from${role.learnsFrom ? `, learned from ${role.learnsFrom}` : ''}; apply them by name where they bite):\n${role.principles}` : '',
    role.never ? `LINES YOU DO NOT CROSS:\n${role.never}` : '',
    role.instructions?.trim() ? `STANDING INSTRUCTIONS FROM THE FOUNDER: ${role.instructions}` : '',
    org.playbook?.trim() ? `DEPARTMENT PLAYBOOK (what your department has learned so far; it is rewritten every Friday from real results, so treat it as the current best practice and build on it):\n${org.playbook.trim()}` : '',
    org.tools?.trim() ? `TOOLS: ${org.tools.trim()}` : '',
    org.imagery?.trim() ? org.imagery.trim() : '',
    /* The workspace wall. Seats are hired per brand world and must never
       reason across them, even when the same founder runs both. */
    `WORKSPACE: you work for ${ws} and only ${ws}. Every fact you are given belongs to ${ws}. Never carry over audience, positioning, plans, results, examples or copy from any other company or brand, including any you may have worked on before. If you cannot answer from ${ws}'s own material, say so.`,
    colleagues.length
      ? [
          `THE ORG: you are one of several seats ${ws} employs. Your colleagues:`,
          ...colleagues.map((c) => `- ${c.name}${c.title ? ` (${c.title})` : ''}${c.owns ? `: owns ${c.owns}` : ''}`),
          'ORG PROTOCOL:',
          '- Read the ORG BRIEF before you decide anything. Your work sits on top of theirs.',
          "- Never redo, contradict or quietly overwrite a colleague's live decision. If you think one is wrong, leave it standing and write them a handoff explaining why, so the founder sees one disagreement rather than two conflicting plans.",
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
    'Write for a design-led founder who is short on time: plain, calm, no jargon, no filler, no headings that restate the obvious. Refer to them as "the founder" or "you"; never assume their gender or use he or she for them.',
    'British English. Never use em dashes or en dashes: use commas, colons or full stops.',
    'Use the deliver tool to return the result.',
  ].filter(Boolean).join('\n')
}

/** One tool-forced call. Every model call in the org goes through here so
    usage is always counted. */
export async function callTool(system: string, message: string, tool: { name: string }, maxTokens = 6000): Promise<{ input: Record<string, unknown>; usage: Usage }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL, max_tokens: maxTokens, system,
      tools: [tool], tool_choice: { type: 'tool', name: tool.name },
      messages: [{ role: 'user', content: message }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `Anthropic ${res.status}`)
  }
  const data = await res.json() as { content: { type: string; input?: Record<string, unknown> }[]; usage?: Usage }
  const use = data.content.find((c) => c.type === 'tool_use')
  if (!use?.input) throw new Error('The seat returned nothing')
  return { input: use.input, usage: data.usage ?? ZERO }
}

export async function runPersona(role: RoleDef, brand: BrandDef, facts: string, task: string, org: OrgDef = {}): Promise<{ output: Record<string, unknown>; usage: Usage }> {
  const message = [
    `WORKSPACE SNAPSHOT (live, factual):\n${facts}`,
    org.brief?.trim() ? `ORG BRIEF (what your colleagues have decided and asked of you):\n${org.brief.trim()}` : '',
    org.briefedBy?.trim() ? `YOUR BRIEF FROM YOUR LEAD:\n${org.briefedBy.trim()}` : '',
    org.contributions?.trim() ? `YOUR TEAM'S CONTRIBUTIONS (you briefed them on parts of this task; judge their work, keep what is good, correct what is not, and compile one deliverable you are prepared to sign. Credit them by name where you use their work):\n${org.contributions.trim()}` : '',
    `YOUR TASK:\n${task}`,
  ].filter(Boolean).join('\n\n')
  const { input, usage } = await callTool(roleSystem(role, brand, org), message, DELIVERABLE_TOOL)
  return { output: enforceBrandName(input), usage }
}

/* ---- Delegation: a lead decides whether the task needs the team ---- */
export const PLAN_TOOL = {
  name: 'plan',
  description: 'Decide how to handle this task: alone, or by briefing members of your team on the parts that need their remit.',
  input_schema: {
    type: 'object',
    properties: {
      approach: { type: 'string', enum: ['solo', 'team'], description: 'solo: you answer it yourself. team: parts of it need a member\'s remit.' },
      reason: { type: 'string', description: 'One line on why.' },
      assignments: {
        type: 'array',
        description: 'Only when approach is team. One brief per member you need; at most one per member. Empty for solo.',
        items: { type: 'object', properties: { to: { type: 'string', description: 'The member by name, exactly as listed.' }, brief: { type: 'string', description: 'A specific brief they can act on without asking you anything: what you need, in what form, and what you have already decided.' } }, required: ['to', 'brief'] },
      },
    },
    required: ['approach', 'reason', 'assignments'],
  },
}

export async function planTask(lead: RoleDef, brand: BrandDef, team: { name: string; title: string; owns: string }[], task: string, org: OrgDef): Promise<{ approach: 'solo' | 'team'; reason: string; assignments: { to: string; brief: string }[]; usage: Usage }> {
  const system = [
    roleSystem(lead, brand, org).replace('Use the deliver tool to return the result.', ''),
    'You are deciding how to handle a task before doing it. Your team, who report to you:',
    ...team.map((m) => `- ${m.name} (${m.title}): owns ${m.owns}`),
    'Brief a member only when a part of the task genuinely sits in their remit and would be better for their depth; a focused task you can answer yourself should be solo. Lean by default: every brief costs time and money.',
    'Use the plan tool.',
  ].join('\n')
  const { input, usage } = await callTool(system, `YOUR TASK:\n${task}`, PLAN_TOOL, 1200)
  const approach = input.approach === 'team' ? 'team' : 'solo'
  const assignments = Array.isArray(input.assignments) ? (input.assignments as { to?: string; brief?: string }[]).filter((a) => a?.to && a?.brief).map((a) => ({ to: String(a.to), brief: String(a.brief) })) : []
  return { approach: assignments.length ? approach : 'solo', reason: String(input.reason ?? ''), assignments, usage }
}

/* ---- The Friday retro: the department rewrites its playbook ---- */
export const RETRO_TOOL = {
  name: 'retro',
  description: 'Return the week\'s lessons and the rewritten department playbook.',
  input_schema: {
    type: 'object',
    properties: {
      lessons: { type: 'array', description: '3-6 one-line lessons from this week, each grounded in something that actually happened.', items: { type: 'string' } },
      playbook: { type: 'string', description: 'The whole playbook, rewritten. 300-700 words, plain prose with short headed parts: what works here, what does not, standing rules, open questions. Keep what still holds, drop what was disproved, add what was learned. It must read as current best practice, not a diary.' },
    },
    required: ['lessons', 'playbook'],
  },
}

export async function runRetro(lead: RoleDef, brand: BrandDef, weekReport: string, currentPlaybook: string, org: OrgDef): Promise<{ lessons: string[]; playbook: string; usage: Usage }> {
  const system = [
    roleSystem(lead, brand, { ...org, playbook: undefined }).replace('Use the deliver tool to return the result.', ''),
    'It is Friday. You are running your department\'s weekly learning: read what happened, what the founder approved or declined, and what your team learned from the people you study, and rewrite the playbook so next week starts sharper. Honest about what did not work. Use the retro tool.',
  ].join('\n')
  const message = [
    `CURRENT PLAYBOOK:\n${currentPlaybook.trim() || '(empty: this is the first one)'}`,
    `THIS WEEK IN YOUR DEPARTMENT:\n${weekReport.trim() || 'No work was done this week.'}`,
  ].join('\n\n')
  const { input, usage } = await callTool(system, message, RETRO_TOOL, 3000)
  return {
    lessons: Array.isArray(input.lessons) ? (input.lessons as unknown[]).map(String).slice(0, 8) : [],
    playbook: String(input.playbook ?? currentPlaybook),
    usage,
  }
}

export const DIGEST_TASK =
  'Write your weekly digest for the founder. Cover: 1) what your department shipped this week (by title, from the snapshot), 2) an honest performance readout of cadence and mix against what you would expect, 3) what is blocked or slipping and why, including anything you are waiting on from a colleague, 4) how your work lined up with the rest of the org this week: what you picked up from a colleague, what you handed over, and any disagreement still standing, 5) your plan for next week with the specific pieces proposed as actions. Keep it tight enough to read in two minutes.'

/* ---- The chief of staff: routing a founder's message, and the desk ---- */
export const ROUTE_TOOL = {
  name: 'route',
  description: 'Turn the founder\'s message into work for the departments that own it, and a short reply to the founder.',
  input_schema: {
    type: 'object',
    properties: {
      reply: { type: 'string', description: 'What you say back to the founder right now, in two or three short sentences: what you have passed on, to whom, and the one thing you will bring back first. No lists.' },
      assignments: {
        type: 'array',
        description: 'One brief per department lead that genuinely owns a part of the message. Leave out departments the message does not concern. Empty if it is a note for the record only.',
        items: { type: 'object', properties: { to: { type: 'string', description: 'The lead by name, exactly as listed.' }, brief: { type: 'string', description: 'The specific brief for that lead, carrying the founder\'s words and context they need, and what is expected back.' } }, required: ['to', 'brief'] },
      },
      decisions: { type: 'array', description: 'Anything in the message that is a decision the founder has just made and the org must now treat as settled. One line each. Empty if none.', items: { type: 'string' } },
    },
    required: ['reply', 'assignments', 'decisions'],
  },
}

export async function routeMessage(chief: RoleDef, brand: BrandDef, leads: { name: string; title: string; owns: string }[], message: string, org: OrgDef): Promise<{ reply: string; assignments: { to: string; brief: string }[]; decisions: string[]; usage: Usage }> {
  const system = [
    roleSystem(chief, brand, org).replace('Use the deliver tool to return the result.', ''),
    'The founder has just sent a message to the org. The department leads you can brief:',
    ...leads.map((l) => `- ${l.name} (${l.title}): owns ${l.owns}`),
    'Route it. Brief every lead whose remit the message touches: a priority stated for their area, work asked of them, a decision that changes their plan, or context they must work from. When the founder assigns work or sets priorities, assignments must not be empty: the leads must hear it in their own brief even if they cannot finish it yet, and it is their job, not yours, to say what they still need. Two leads get the same part only when both genuinely own it. Never withhold a brief because the org brief says a lead is waiting on the founder; pass the founder\'s words on and let the lead reply. Carry the founder\'s own words into each brief. Use the route tool.',
  ].join('\n')
  const { input, usage } = await callTool(system, `THE FOUNDER'S MESSAGE:\n${message}`, ROUTE_TOOL, 2000)
  const assignments = Array.isArray(input.assignments) ? (input.assignments as { to?: string; brief?: string }[]).filter((a) => a?.to && a?.brief).map((a) => ({ to: String(a.to), brief: String(a.brief) })) : []
  const decisions = Array.isArray(input.decisions) ? (input.decisions as unknown[]).map(String).filter(Boolean) : []
  return { reply: String(input.reply ?? ''), assignments, decisions, usage }
}

export const DESK_TASK =
  'Write the founder\'s desk from the replies your colleagues have sent back (in YOUR TEAM\'S CONTRIBUTIONS) and the briefing they answered. Sections, in this order and with these headings: "Now" (the single thing the founder should do or decide first, and why it unblocks the most), "Next" (at most three, one line each), "Parked" (everything else, one line each with why it can wait), "Decisions waiting on you" (each with a proposed default so the founder can answer in a word). Under 300 words. Do not repeat the replies; compress them. Propose no content pieces, raise no needs, no experiments.'

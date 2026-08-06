import { type DeckSlide, sid } from './decks'
import { deckTemplate } from './decks'

/* ============================================================
   The five design phases of a client engagement, each with
   branded template starting points (1920×1080 decks, A4 portrait
   documents, or step-by-step forms). Structures follow industry
   practice; guidance text is overwritten by you or the copilot.
   ============================================================ */

export type PhaseKey = 'engage' | 'research' | 'discovery' | 'design' | 'deliver'
export type DocFormat = 'deck' | 'a4' | 'form'

export interface PhaseTemplate {
  kind: string
  title: string
  desc: string
  format: DocFormat
  /** Seeds the document's pages (decks and A4) — forms seed steps in the editor. */
  seed?: (clientName: string) => DeckSlide[]
  /** For form templates: maps to the existing form kinds. */
  formKind?: string
}

export interface Phase {
  key: PhaseKey
  num: string
  label: string
  blurb: string
  docWord: string
  templates: PhaseTemplate[]
}

const s = (layout: DeckSlide['layout'], eyebrow: string, title: string, body = '', extra?: Partial<DeckSlide>): DeckSlide =>
  ({ id: sid(), layout, eyebrow, title, body, ...extra })

const cover = (kind: string, client: string, subtitle: string): DeckSlide =>
  ({ id: sid(), layout: 'cover', theme: 'ink', eyebrow: kind, title: `${client} · ${kind}`, body: subtitle })

/* ---- Page-set seeds ---- */
const SETS: Record<string, (c: string) => DeckSlide[]> = {
  proposal: (c) => [
    cover('Design proposal', c, 'Scope, approach and fees.'),
    s('statement', 'The opportunity', 'What we heard', `The brief as we understand it: what ${c} is trying to change, and why now.`),
    s('content', 'Approach', 'How we would work', 'The shape of the engagement: phases, rhythm, and how decisions get made together.'),
    s('timeline', 'Roadmap', 'Phases and milestones', 'The engagement across weeks: what happens in each phase and what lands at the end of each.', { bullets: ['01 Engage — terms & kick-off', '02 Research — field study', '03 Discovery — direction', '04 Design — concept to spec', '05 Deliver — handover'] }),
    s('content', 'Team', 'Who you get', 'The people on the work, what each brings, and how much of them you have.'),
    s('terms', 'Investment', 'Fees', 'Fees by phase with what each includes; payment schedule and what would change the price.', { bullets: ['Phase 1 · Engage — £[…]', 'Phase 2 · Research — £[…]', 'Phase 3 · Discovery — £[…]', 'Phase 4 · Design — £[…]', 'Phase 5 · Deliver — £[…]'] }),
    s('statement', 'Next', 'Where this starts', 'What saying yes looks like, and the first two weeks.'),
  ],
  kickoff: (c) => [
    cover('Kick-off', c, 'Team, rhythm and ways of working.'),
    s('content', 'Intent', 'What we are here to do', 'The engagement goal in plain words, and what success looks like for both sides.'),
    s('split', 'Team', 'The two teams', 'Studio side and client side: names, roles, and who holds which decisions.'),
    s('list', 'Rhythm', 'How we will work', '', { bullets: ['Weekly working session — [day/time]', 'Sprint showcase — every two weeks', 'Async updates in [channel]', 'Decision log kept in the client space'] }),
    s('content', 'Materials', 'What we need from you', 'Access, brand assets, data and introductions, with owners and dates.'),
    s('timeline', 'First month', 'The opening moves', '', { bullets: ['Week 1 — immersion & access', 'Week 2 — field research begins', 'Week 3 — first signals shared', 'Week 4 — synthesis working session'] }),
  ],
  discovery: (c) => [
    cover('Design discovery', c, 'Direction, principles and references.'),
    s('statement', 'The frame', 'The opportunity, framed', 'The single clearest articulation of the opportunity this work pursues.'),
    s('content', 'What we know', 'Grounding', 'The evidence this direction stands on: research signals, market reality, constraints.'),
    s('list', 'Principles', 'Experience principles', 'The principles every decision will answer to.', { bullets: ['…', '…', '…'] }),
    s('content', 'Direction', 'The design direction', 'The direction in words and feeling: what it will be like to encounter, and why it fits.'),
    s('split', 'References', 'The world it belongs to', 'Reference points that carry the intended feeling, and what precisely we take from each.'),
    s('content', 'Implications', 'What this means', 'What the direction implies for space, service, digital and brand.'),
    s('statement', 'Next', 'The path from here', 'What we design first, and the decision needed to begin.'),
  ],
  roadmap: (c) => [
    cover('Engagement roadmap', c, 'Phases, dates and dependencies.'),
    s('timeline', 'Roadmap', 'The engagement at a glance', 'Every phase with its window, deliverables and the dependency that gates it.', { bullets: ['01 Engage — [dates]', '02 Research — [dates]', '03 Discovery — [dates]', '04 Design — [dates]', '05 Deliver — [dates]'] }),
    s('terms', 'Dependencies', 'What the plan relies on', '', { bullets: ['Access to [site/system] by [date]', 'Client review turnaround within [n] days', 'Content and data delivered by [date]'] }),
  ],
  research: (c) => [
    cover('Research', c, 'What we set out to learn, and what we found.'),
    s('content', 'Objectives', 'The questions', 'What this research was designed to answer, and why it matters now.'),
    s('content', 'Method', 'How we looked', 'Who we spoke to or observed, where, and how the evidence was analysed.'),
    s('content', 'Theme 01', 'First theme', 'The finding, the evidence, and a voice from the field.'),
    s('content', 'Theme 02', 'Second theme', 'The finding, the evidence, and what surprised us.'),
    s('content', 'Theme 03', 'Third theme', 'The finding, the evidence, and the assumption it challenges.'),
    s('content', 'Implications', 'What it means for design', 'The principles the findings demand.'),
    s('list', 'Next', 'Recommended moves', '', { bullets: ['Now — …', 'Next — …', 'Later — …'] }),
  ],
  contract: (c) => [
    cover('Agreement', c, 'Terms of engagement.'),
    s('terms', 'Parties & scope', 'The engagement', `Between Hue & Heal and ${c}: the services, deliverables and exclusions, in plain English.`),
    s('terms', 'Commercials', 'Fees and payment', 'Fees, invoicing schedule, expenses, and late-payment terms.', { bullets: ['Fees — £[…] by phase', 'Invoicing — [schedule]', 'Payment — within [n] days'] }),
    s('terms', 'Rights', 'IP and confidentiality', 'Who owns what and when ownership transfers; what stays confidential on both sides.'),
    s('terms', 'Working terms', 'Changes, delays and exit', 'Change control, revision rounds, delay handling, and how either side ends the engagement well.'),
    s('content', 'Signatures', 'Agreed', 'Names, roles, signatures and dates for both parties.', { bullets: undefined }),
  ],
  brief: (c) => [
    cover('Creative brief', c, 'The problem, on one page.'),
    s('terms', 'The brief', 'What we are solving', 'Background, the problem, the audience, the single desired outcome, constraints, and how success is judged.', { bullets: ['Background — …', 'Problem — …', 'Audience — …', 'Outcome — …', 'Constraints — …', 'Success — …'] }),
  ],
  workshop: (c) => [
    cover('Workshop pack', c, 'Agenda, exercises and outputs.'),
    s('list', 'Agenda', 'The session', '', { bullets: ['Arrivals & intent — 15m', 'Exercise 1 — …', 'Break', 'Exercise 2 — …', 'Synthesis & next steps'] }),
    s('content', 'Exercise 01', 'First exercise', 'What we will do, in pairs or groups, and the artefact it produces.'),
    s('content', 'Exercise 02', 'Second exercise', 'What we will do and the decision it feeds.'),
    s('content', 'Outputs', 'What leaves the room', 'The decisions and materials the workshop must produce to count.'),
  ],
  spec: (c) => [
    cover('Specification', c, 'Schedules, finishes and suppliers.'),
    s('terms', 'Overview', 'How to read this spec', 'Scope of the specification, revision status, and who to ask.'),
    s('terms', 'Schedule 01', 'Materials & finishes', 'Item, location, finish, supplier and reference for each.', { bullets: ['Item — location — finish — supplier', '…'] }),
    s('terms', 'Schedule 02', 'Lighting', 'Fixture, position, temperature, dimming and control.', { bullets: ['Fixture — position — spec', '…'] }),
    s('content', 'Notes', 'Installation notes', 'Tolerances, sequencing and the details that protect the design intent.'),
  ],
  change: (c) => [
    cover('Change control', c, 'Scope change and impact.'),
    s('terms', 'The change', 'What is changing and why', 'The requested change, its origin, and the options considered.', { bullets: ['Change — …', 'Reason — …', 'Impact on scope — …', 'Impact on fees — £[…]', 'Impact on dates — …'] }),
  ],
  handover: (c) => [
    cover('Handover', c, 'What was built and how to run it.'),
    s('content', 'The work', 'What was delivered', 'The delivered scope, where everything lives, and the state it was left in.'),
    s('list', 'Running it', 'How to keep it true', 'The practices that keep the experience as designed.', { bullets: ['…', '…', '…'] }),
    s('content', 'Ownership', 'Who owns what now', 'Accounts, files, licences and access, transferred and confirmed.'),
    s('statement', 'Beyond', 'Where it can go next', 'The opportunities we see for the next season of the work.'),
  ],
  poe: (c) => [
    cover('Post-occupancy evaluation', c, 'Did it work? Measured.'),
    s('content', 'Method', 'How we measured', 'The measures agreed at the start, how data was gathered, and over what period.'),
    s('content', 'Findings', 'What the measurements say', 'Results against each success measure, honestly reported.'),
    s('content', 'Experience', 'What people say and do', 'Observed behaviour and gathered voice: where the design lands and where it strains.'),
    s('list', 'Adjustments', 'Recommended tuning', '', { bullets: ['…', '…', '…'] }),
  ],
  standards: (c) => [
    cover('Design standards', c, 'The rules, for rollout.'),
    s('content', 'Purpose', 'What these standards protect', 'The experience intent these standards exist to keep intact at scale.'),
    s('terms', 'Standards 01', 'Space & material', 'The non-negotiables for physical execution.', { bullets: ['…', '…'] }),
    s('terms', 'Standards 02', 'Service & digital', 'The non-negotiables for service moments and digital touchpoints.', { bullets: ['…', '…'] }),
    s('content', 'Governance', 'Keeping it true', 'Who approves deviations and how new sites get certified.'),
  ],
  casestudy: (c) => [
    cover('Case study', c, 'The story of the work.'),
    s('statement', 'The story', 'Where this began', 'The situation before, and the ambition that started the work.'),
    s('content', 'The work', 'What we did', 'The journey through research, discovery and design, told through decisions.'),
    s('split', 'The result', 'What changed', 'The outcome in experience and in numbers, with the client’s voice.'),
    s('statement', 'The lesson', 'What it taught the studio', 'The transferable insight this work gave us.'),
  ],
}

export const PHASES: Phase[] = [
  {
    key: 'engage', num: '01', label: 'Engage', blurb: 'Winning the work and setting terms.', docWord: 'document',
    templates: [
      { kind: 'Proposal', title: 'Design proposal', desc: 'Scope, approach and fees', format: 'deck', seed: SETS.proposal },
      { kind: 'Contract', title: 'Master services agreement', desc: 'Terms, IP and payment schedule', format: 'a4', seed: SETS.contract },
      { kind: 'Kick-off', title: 'Kick-off & ways of working', desc: 'Team, rhythm and decision log', format: 'deck', seed: SETS.kickoff },
      { kind: 'Brief', title: 'Creative brief', desc: 'The problem, in one page', format: 'a4', seed: SETS.brief },
      { kind: 'Onboarding', title: 'Onboarding questionnaire', desc: 'Completed step by step in the client space', format: 'form', formKind: 'onboarding' },
    ],
  },
  {
    key: 'research', num: '02', label: 'Research', blurb: 'Understanding the people and the place.', docWord: 'report',
    templates: [
      { kind: 'Report', title: 'Field study report', desc: 'Interviews, observation, synthesis', format: 'a4', seed: SETS.research },
      { kind: 'Report', title: 'Sensory audit', desc: 'Light, sound, material, temperature', format: 'a4', seed: SETS.research },
      { kind: 'Deck', title: 'Research readout', desc: 'Findings presented to the client', format: 'deck', seed: SETS.research },
      { kind: 'Report', title: 'Competitor benchmark', desc: 'How the category performs', format: 'a4', seed: SETS.research },
      { kind: 'UX review', title: 'UX review', desc: 'Journeys, findings, recommendations', format: 'deck', seed: (c) => deckTemplate('ux-review', c) },
    ],
  },
  {
    key: 'discovery', num: '03', label: 'Discovery', blurb: 'Framing the opportunity with the client.', docWord: 'presentation',
    templates: [
      { kind: 'Presentation', title: 'Design discovery', desc: 'Direction, principles, references', format: 'deck', seed: SETS.discovery },
      { kind: 'Roadmap', title: 'Engagement roadmap', desc: 'Phases, dates and dependencies', format: 'deck', seed: SETS.roadmap },
      { kind: 'Workshop', title: 'Workshop pack', desc: 'Agenda, exercises, outputs', format: 'a4', seed: SETS.workshop },
      { kind: 'Discovery', title: 'Discovery questionnaire', desc: 'Completed step by step in the client space', format: 'form', formKind: 'discovery' },
    ],
  },
  {
    key: 'design', num: '04', label: 'Design', blurb: 'Concept, detail and specification.', docWord: 'deck',
    templates: [
      { kind: 'Presentation', title: 'Concept directions', desc: 'Two or three routes, shown well', format: 'deck', seed: SETS.discovery },
      { kind: 'Brand guidelines', title: 'Brand guidelines', desc: 'Voice, colour, type, imagery, use', format: 'deck', seed: (c) => deckTemplate('brand-guidelines', c) },
      { kind: 'Presentation', title: 'Design review', desc: 'Progress shown for sign-off', format: 'deck', seed: (c) => deckTemplate('sprint-showcase', c) },
      { kind: 'Spec', title: 'Material & lighting spec', desc: 'Schedules, finishes, suppliers', format: 'a4', seed: SETS.spec },
      { kind: 'Product spec', title: 'Product design documentation', desc: 'Flows, UI decisions, states', format: 'deck', seed: (c) => deckTemplate('product-spec', c) },
      { kind: 'Change note', title: 'Change control note', desc: 'Scope change and cost impact', format: 'a4', seed: SETS.change },
    ],
  },
  {
    key: 'deliver', num: '05', label: 'Deliver', blurb: 'Handover, measurement and case study.', docWord: 'document',
    templates: [
      { kind: 'Presentation', title: 'Client handover', desc: 'What was built and how to run it', format: 'deck', seed: SETS.handover },
      { kind: 'Report', title: 'Post-occupancy evaluation', desc: 'Did it work? Measured.', format: 'a4', seed: SETS.poe },
      { kind: 'Report', title: 'Design standards manual', desc: 'The rules, for rollout', format: 'a4', seed: SETS.standards },
      { kind: 'Presentation', title: 'Case study', desc: 'The story, for the studio', format: 'deck', seed: SETS.casestudy },
    ],
  },
]

export function phaseOf(key: string | undefined | null): Phase {
  return PHASES.find((p) => p.key === key) ?? PHASES[0]
}

/** Blank starters, per the design. */
export function blankDeck(clientName: string): DeckSlide[] {
  return [cover('Presentation', clientName, ''), s('content', 'Section', '', '')]
}
export function blankA4(clientName: string): DeckSlide[] {
  return [cover('Document', clientName, ''), s('content', 'Section', '', '')]
}

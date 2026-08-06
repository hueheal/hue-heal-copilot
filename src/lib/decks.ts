/* ============================================================
   Presentation decks (1920×1080) for client design documents.
   Each design kind ships with an inbuilt structure drawn from
   industry practice — the sections a credible brand-guidelines,
   research, showcase, UX review or product spec deck contains.
   Pages are filled by hand or drafted by the copilot, and can be
   added, reordered or deleted freely.
   ============================================================ */

export type SlideLayout = 'cover' | 'content' | 'list' | 'statement' | 'split' | 'terms' | 'timeline'
export type SlideTheme = 'paper' | 'ink' | 'clay' | 'bone'

export interface DeckSlide {
  id: string
  layout: SlideLayout
  /** Page surface: paper (near-white), ink (near-black), clay (copper-brown), bone (sand). */
  theme?: SlideTheme
  eyebrow?: string
  title?: string
  body?: string
  bullets?: string[]
  image?: string
}

let dseq = 1
export const sid = () => `s-${dseq++}`

export const DECK_W = 1920
export const DECK_H = 1080

/** Kinds that present as decks (everything design-led except forms,
    contracts, proposals and invoices). */
export const DECK_KINDS = new Set(['brand-guidelines', 'research', 'sprint-showcase', 'ux-review', 'product-spec'])
export const isDeckKind = (kind: string) => DECK_KINDS.has(kind)

const s = (layout: DeckSlide['layout'], eyebrow: string, title: string, body = '', bullets?: string[]): DeckSlide =>
  ({ id: sid(), layout, eyebrow, title, body, ...(bullets ? { bullets } : {}) })

/* Inbuilt structures. Bodies carry guidance you overwrite (or the copilot fills). */
export function deckTemplate(kind: string, clientName: string): DeckSlide[] {
  switch (kind) {
    case 'brand-guidelines':
      return [
        { id: sid(), layout: 'cover', eyebrow: 'Brand guidelines', title: `${clientName} brand guidelines`, body: 'How the brand looks, speaks and behaves.' },
        s('statement', 'The brand idea', 'One sentence that holds it all', 'The single idea the brand exists to express. Everything else in this document serves it.'),
        s('content', 'Voice & tone', 'How the brand speaks', 'The personality in words: what it always sounds like, what it never sounds like, and how tone flexes by moment (calm in care, confident in sales, warm in service).'),
        s('list', 'Voice & tone', 'Dos and don’ts', 'Concrete guardrails your writers can apply immediately.', ['Do: …', 'Do: …', 'Don’t: …', 'Don’t: …']),
        s('content', 'Logo & wordmark', 'Using the mark', 'Clearspace, minimum sizes, placement, and misuse: what protects the mark’s presence across touchpoints.'),
        s('content', 'Colour', 'The palette and its feeling', 'Primary and supporting colours with their roles, ratios and accessibility pairings; what each colour carries emotionally.'),
        s('content', 'Typography', 'Type roles and hierarchy', 'Display, heading and body faces, when each is used, and the scale that keeps layouts calm and consistent.'),
        s('content', 'Imagery', 'Art direction', 'The photographic world: light, texture, casting, composition; what belongs in frame and what never does.'),
        s('content', 'Applications', 'The brand in the world', 'How it behaves across digital and physical: product UI, social, print, environments and packaging.'),
      ]
    case 'research':
      return [
        { id: sid(), layout: 'cover', eyebrow: 'Research findings', title: `What we learned with ${clientName}`, body: 'Findings, meaning and recommended moves.' },
        s('content', 'Objectives', 'What we set out to learn', 'The questions this research was designed to answer, and why they matter to the business now.'),
        s('content', 'Method', 'How we looked', 'Who we spoke to or observed, sample and context, and how the evidence was gathered and analysed.'),
        s('content', 'Theme 01', 'First key theme', 'The finding, the evidence behind it, and a voice from the research that brings it to life.'),
        s('content', 'Theme 02', 'Second key theme', 'The finding, the evidence behind it, and what surprised us.'),
        s('content', 'Theme 03', 'Third key theme', 'The finding, the evidence behind it, and where it challenges current assumptions.'),
        s('content', 'Implications', 'What it means for design', 'How these themes should shape the experience: principles the design must now honour.'),
        s('list', 'Next steps', 'Recommended moves', 'Ordered by impact and effort.', ['Now: …', 'Next: …', 'Later: …']),
      ]
    case 'sprint-showcase':
      return [
        { id: sid(), layout: 'cover', eyebrow: 'Sprint showcase', title: `${clientName} · sprint showcase`, body: 'What shipped, what we learned, what’s next.' },
        s('content', 'The goal', 'What this sprint set out to do', 'The sprint goal in plain words, and how it ladders to the wider programme.'),
        s('content', 'Shipped 01', 'First piece of work', 'What it is, the thinking behind it, and the decision it unlocks.'),
        s('content', 'Shipped 02', 'Second piece of work', 'What it is, the thinking behind it, and what changed from the last review.'),
        s('content', 'Shipped 03', 'Third piece of work', 'What it is and why it matters for the experience.'),
        s('content', 'Learnings', 'What the sprint taught us', 'What worked, what resisted, and what we would do differently.'),
        s('list', 'Next sprint', 'Where we go from here', 'The focus for the coming sprint.', ['Focus: …', 'Decision needed: …', 'Date: …']),
      ]
    case 'ux-review':
      return [
        { id: sid(), layout: 'cover', eyebrow: 'UX review', title: `${clientName} experience review`, body: 'Journeys, findings and recommendations.' },
        s('content', 'Scope', 'What we reviewed', 'The journeys, platforms and states examined, and the lens used (heuristics, behavioural principles, accessibility).'),
        s('content', 'Summary', 'The experience at a glance', 'Overall read of the experience: where it is strong, where friction concentrates, and the pattern behind the findings.'),
        s('content', 'Finding 01', 'Highest-impact finding', 'What we observed, why it matters behaviourally, and the recommendation.'),
        s('content', 'Finding 02', 'Second finding', 'What we observed, why it matters, and the recommendation.'),
        s('content', 'Finding 03', 'Third finding', 'What we observed, why it matters, and the recommendation.'),
        s('list', 'Quick wins', 'Fix these first', 'Low-effort, high-relief changes.', ['…', '…', '…']),
        s('content', 'Roadmap', 'The deeper work', 'The structural improvements worth a proper design cycle, sequenced.'),
      ]
    case 'product-spec':
      return [
        { id: sid(), layout: 'cover', eyebrow: 'Product spec', title: `${clientName} product design documentation`, body: 'Intent, flows and interface decisions.' },
        s('content', 'The problem', 'Problem & intent', 'The user problem this design solves, the outcome it targets, and how we will know it worked.'),
        s('list', 'Principles', 'Experience principles', 'The principles every screen answers to.', ['…', '…', '…']),
        s('content', 'Flows', 'The user flows', 'The primary journeys step by step: entry, decision points, success and exit states.'),
        s('content', 'Key screens', 'UI decisions & rationale', 'The significant screens with the reasoning behind layout, hierarchy and interaction choices.'),
        s('content', 'States', 'States & edge cases', 'Empty, loading, error, and extreme-content states; what the interface promises in each.'),
        s('list', 'Open questions', 'Still to resolve', 'Decisions parked with owners.', ['…', '…']),
      ]
    default:
      return [
        { id: sid(), layout: 'cover', eyebrow: 'Document', title: `${clientName}`, body: '' },
        s('content', 'Section', 'First section', 'Write or draft with the copilot.'),
      ]
  }
}

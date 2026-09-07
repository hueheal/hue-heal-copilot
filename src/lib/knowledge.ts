/* ============================================================
   Knowledge (Phase 9): structured company context per workspace,
   stored on brand_profiles.knowledge. Injected into every
   generator so the copilot writes with the facts of the business,
   not around them.
   ============================================================ */

export interface Knowledge {
  business?: string   // what the company is and how it makes money
  audience?: string   // who it is for, specifically
  offerings?: string  // products/services, features, pricing that may be cited
  state?: string      // current state of play: what is live, in progress, blocked
  strategy?: string   // current priorities, positioning, goals
  decisions?: string  // settled calls that must not be reopened
  clients?: string    // past clients, case studies, typical client shapes
  team?: string       // key people and roles worth naming
  market?: string     // market, competitors, relevant trends
  technical?: string  // stack, repos, integrations, publishing contracts
  compliance?: string // legal, regulatory, claims constraints, risks
  links?: string      // website, channels, repos, documents
  faqs?: string       // recurring questions and their answers, terminology
}

export const KNOWLEDGE_FIELDS: { key: keyof Knowledge; label: string; hint: string; dossier: string }[] = [
  { key: 'business', label: 'Business', hint: 'What the company is, its arms, its stage, how it makes money.', dossier: 'Business' },
  { key: 'audience', label: 'Audience', hint: 'Who it is for, in specifics, and who it is not for.', dossier: 'Audience' },
  { key: 'offerings', label: 'Offers & pricing', hint: 'Offerings, tiers, prices the copilot may cite. It will never invent beyond this.', dossier: 'Offers and pricing' },
  { key: 'state', label: 'Current state of play', hint: 'What is live, published, in progress or blocked, with dates. Refresh this as things change.', dossier: 'Current state of play' },
  { key: 'strategy', label: 'Strategy & next 90 days', hint: 'Positioning, priorities in order, the goals for the quarter.', dossier: 'Strategy and next 90 days' },
  { key: 'decisions', label: 'Decisions already made', hint: 'Settled calls the org must not reopen, and why.', dossier: 'Decisions already made' },
  { key: 'clients', label: 'Clients & proof', hint: 'Past clients, case studies, testimonials, results.', dossier: 'Clients and proof' },
  { key: 'team', label: 'Team & partners', hint: 'Key people, roles, suppliers and partners worth naming.', dossier: 'Team and partners' },
  { key: 'market', label: 'Market', hint: 'Market, alternatives, named competitors, trends.', dossier: 'Market' },
  { key: 'technical', label: 'Technical', hint: 'Stack, repos, hosting, integrations, how things get published.', dossier: 'Technical' },
  { key: 'compliance', label: 'Compliance & risks', hint: 'What may and may not be said, data handling, contracts, known risks.', dossier: 'Compliance and risks' },
  { key: 'links', label: 'Links', hint: 'Website, channels, repos, documents. One per line.', dossier: 'Links' },
  { key: 'faqs', label: 'FAQs, terminology & open questions', hint: 'Standard answers, words the company does or does not use, and what is still unknown.', dossier: 'Open questions' },
]

/** Parse a dossier written to docs/workspace-onboarding-prompt.md: level-two
    headings map to Knowledge fields. Unknown headings are kept under FAQs so
    nothing pasted is lost. Returns only the fields the dossier filled. */
export function parseDossier(text: string): Partial<Knowledge> {
  const norm = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim()
  const byHeading = new Map(KNOWLEDGE_FIELDS.map((f) => [norm(f.dossier), f.key]))
  const alias: Record<string, keyof Knowledge> = { 'products and services': 'offerings', 'offerings': 'offerings', 'clients and case studies': 'clients', 'strategy and goals': 'strategy', 'faqs and terminology': 'faqs', 'faqs': 'faqs', 'state of play': 'state', 'current state': 'state', 'compliance': 'compliance', 'risks': 'compliance', 'tech': 'technical', 'technology': 'technical' }
  const out: Partial<Knowledge> = {}
  let key: keyof Knowledge | null = null
  let buf: string[] = []
  const flush = () => {
    if (!key) return
    const body = buf.join('\n').trim()
    if (body && body.toUpperCase() !== 'UNKNOWN') out[key] = [out[key], body].filter(Boolean).join('\n\n')
  }
  for (const line of text.replace(/\r/g, '').split('\n')) {
    const h = line.match(/^#{1,3}\s+(.+?)\s*$/)
    if (h) {
      flush()
      const n = norm(h[1])
      const known = byHeading.get(n) ?? alias[n] ?? [...byHeading.entries()].find(([k]) => n.includes(k) || k.includes(n))?.[1]
      key = known ?? 'faqs'
      buf = known ? [] : [`${h[1]}:`]
      continue
    }
    if (key) buf.push(line)
  }
  flush()
  return out
}

/** Compact, prompt-ready digest for the content generators. Caps each
    section so a generous knowledge base cannot crowd out the actual brief.
    (Seats in the org read a far larger cut, server side.) */
export function knowledgeDigest(k: Knowledge | null | undefined, capPerSection = 700): string {
  if (!k) return ''
  const parts: string[] = []
  for (const f of KNOWLEDGE_FIELDS) {
    const v = (k[f.key] ?? '').trim()
    if (v) parts.push(`${f.label.toUpperCase()}: ${v.length > capPerSection ? `${v.slice(0, capPerSection)}…` : v}`)
  }
  return parts.join('\n')
}

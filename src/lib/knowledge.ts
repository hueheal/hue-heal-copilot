/* ============================================================
   Knowledge (Phase 9): structured company context per workspace,
   stored on brand_profiles.knowledge. Injected into every
   generator so the copilot writes with the facts of the business,
   not around them.
   ============================================================ */

export interface Knowledge {
  business?: string   // what the company is and how it makes money
  offerings?: string  // products/services, features, pricing that may be cited
  clients?: string    // past clients, case studies, typical client shapes
  team?: string       // key people and roles worth naming
  strategy?: string   // current priorities, positioning, goals
  market?: string     // market, competitors, relevant trends
  faqs?: string       // recurring questions and their answers, terminology
}

export const KNOWLEDGE_FIELDS: { key: keyof Knowledge; label: string; hint: string }[] = [
  { key: 'business', label: 'Business', hint: 'What the company is, who it serves, how it makes money.' },
  { key: 'offerings', label: 'Products & services', hint: 'Offerings, features, pricing the copilot may cite. It will never invent beyond this.' },
  { key: 'clients', label: 'Clients & case studies', hint: 'Past clients and results worth referencing in proposals and posts.' },
  { key: 'team', label: 'Team', hint: 'Key people and roles worth naming.' },
  { key: 'strategy', label: 'Strategy & goals', hint: 'Current priorities and positioning. Shapes emphasis, never quoted directly.' },
  { key: 'market', label: 'Market', hint: 'Market, competitors, trends the writing should be aware of.' },
  { key: 'faqs', label: 'FAQs & terminology', hint: 'Standard answers and words the company does or does not use.' },
]

/** Compact, prompt-ready digest. Caps each section so a generous knowledge
    base cannot crowd out the actual brief. */
export function knowledgeDigest(k: Knowledge | null | undefined, capPerSection = 700): string {
  if (!k) return ''
  const parts: string[] = []
  for (const f of KNOWLEDGE_FIELDS) {
    const v = (k[f.key] ?? '').trim()
    if (v) parts.push(`${f.label.toUpperCase()}: ${v.length > capPerSection ? `${v.slice(0, capPerSection)}…` : v}`)
  }
  return parts.join('\n')
}

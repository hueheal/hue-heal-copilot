// ============================================================================
// The org as defined in the org markdown files, read through the generated module, and
// the small helpers that map a hired role row back to its seat definition.
// Shared by every function so a seat is dressed identically wherever it runs.
// ============================================================================
import { ORG, type OrgRole, type OrgDept, type OrgTool } from './org.generated.ts'
import type { RoleDef } from './roleCore.ts'

export { ORG }
export type { OrgRole, OrgDept, OrgTool }

/** "Hue & Heal" -> "hue-heal", "Remedae" -> "remedae". Matches org/roles/experts/<brand>. */
export const brandSlug = (name?: string | null): string =>
  (name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const deptOf = (key: string | null | undefined): OrgDept | undefined => ORG.departments.find((d) => d.key === key)

/** The seat definition for a hired role: by key, preferring the brand's own
    version (the expert team differs per brand). Custom seats have none. */
export function seatFor(role: { key: string; dept?: string | null }, brandName?: string | null): OrgRole | undefined {
  const slug = brandSlug(brandName)
  const cands = ORG.roles.filter((r) => r.key === role.key && (!role.dept || r.dept === role.dept))
  return cands.find((r) => r.brand === slug) ?? cands.find((r) => !r.brand)
}

/** Seats a department offers for a given brand: brand-specific ones win. */
export function seatsIn(dept: string, brandName?: string | null): OrgRole[] {
  const slug = brandSlug(brandName)
  const all = ORG.roles.filter((r) => r.dept === dept)
  const mine = all.filter((r) => r.brand === slug)
  const generic = all.filter((r) => !r.brand)
  return [...mine, ...generic.filter((g) => !mine.some((m) => m.key === g.key))]
}

/** Dress a role row as the engine expects, with the seat's principles. */
export function roleDef(role: { key: string; dept?: string | null; seat?: string | null; name: string; title: string; charter: string; instructions?: string | null }, brandName?: string | null): RoleDef {
  const seat = seatFor(role, brandName)
  return {
    name: role.name, title: role.title, charter: role.charter, instructions: role.instructions ?? undefined,
    owns: seat?.owns || undefined, defers: seat?.defers || undefined,
    principles: seat?.principles || undefined, never: seat?.never || undefined, learnsFrom: seat?.learnsFrom || undefined,
    seat: role.seat === 'member' ? 'member' : 'lead', dept: role.dept ?? seat?.dept,
  }
}

export const ownsOf = (role: { key: string; dept?: string | null; charter: string }, brandName?: string | null): string => {
  const seat = seatFor(role, brandName)
  const first = role.charter.split('.')[0] ?? ''
  return seat?.owns || (first.length > 120 ? `${first.slice(0, 119).trimEnd()}…` : first)
}

/** Render the tools line for a department: what it has, what it could ask for. */
export function toolsLine(dept: OrgDept | undefined, granted: string[]): string {
  const have = ORG.tools.filter((t) => granted.includes(t.key) || t.key === 'anthropic')
  const could = ORG.tools.filter((t) => (dept?.tools ?? []).includes(t.key) && !have.some((h) => h.key === t.key))
  return [
    `you have ${have.map((t) => `${t.name} (${t.key})`).join(', ')}.`,
    could.length ? `Not granted yet but relevant to your department: ${could.map((t) => `${t.name} (${t.key}, ${t.status}, ${t.cost})`).join('; ')}.` : '',
    'In-house first: do the work with what you have. Ask for a tool as a need (with its key and the cost) only when the work genuinely cannot be done without it, and never assume it has been granted.',
  ].filter(Boolean).join(' ')
}

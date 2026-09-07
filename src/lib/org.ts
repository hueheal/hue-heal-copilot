import { ORG, type OrgDept, type OrgRole, type OrgTool } from './org.generated'

/* ============================================================
   The org, as defined in the org markdown files. Departments, seats and the
   tools registry. The founder talks to department leads; leads
   brief their members. The expert team differs per brand.
   ============================================================ */

export { ORG }
export type { OrgDept, OrgRole, OrgTool }

export const DEPARTMENTS: OrgDept[] = ORG.departments
export const TOOLS: OrgTool[] = ORG.tools

/** "Hue & Heal" -> "hue-heal", "Remedae" -> "remedae". Matches org/roles/experts/<brand>. */
export const brandSlug = (name?: string | null): string =>
  (name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const deptOf = (key: string | null | undefined): OrgDept | undefined => DEPARTMENTS.find((d) => d.key === key)
export const toolOf = (key: string): OrgTool | undefined => TOOLS.find((t) => t.key === key)

/** Seats a department offers for a brand: brand-specific ones win over generic. */
export function seatsIn(dept: string, brandName?: string | null): OrgRole[] {
  const slug = brandSlug(brandName)
  const all = ORG.roles.filter((r) => r.dept === dept)
  const mine = all.filter((r) => r.brand === slug)
  const generic = all.filter((r) => !r.brand)
  const seats = [...mine, ...generic.filter((g) => !mine.some((m) => m.key === g.key))]
  return seats.sort((a, b) => (a.seat === b.seat ? 0 : a.seat === 'lead' ? -1 : 1))
}

/** The seat definition behind a hired role, if it came from the org. */
export function seatFor(role: { key: string; dept?: string | null }, brandName?: string | null): OrgRole | undefined {
  const slug = brandSlug(brandName)
  const cands = ORG.roles.filter((r) => r.key === role.key && (!role.dept || r.dept === role.dept))
  return cands.find((r) => r.brand === slug) ?? cands.find((r) => !r.brand)
}

export const pounds = (pence: number): string => `£${(pence / 100).toFixed(pence >= 10000 ? 0 : 2)}`

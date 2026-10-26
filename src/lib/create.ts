import { listNewsletters } from './newsletter'
import { listJournal } from './journal'

/* The Content Studio model: families of content, each with formats that open an
   editor. Journal / Newsletter reuse the existing editors; Report is a new
   authored publication family. Social posts are made in Figma now, so they
   have no family here. */
export type FamilyKey = 'journal' | 'newsletter' | 'report'

export interface CFormat { key: string; label: string; sub: string; icon: string; to?: string; soon?: boolean }
export interface CFamily { key: FamilyKey; label: string; blurb: string; formats: CFormat[] }

export const FAMILIES: CFamily[] = [
  {
    key: 'journal', label: 'Journal',
    blurb: 'Long-form, design-led articles for the website Journal.',
    formats: [
      { key: 'article', label: 'Article', sub: 'Full journal piece', icon: '✎', to: '/create/journal' },
    ],
  },
  {
    key: 'newsletter', label: 'Newsletter',
    blurb: 'Branded email editions sent through Resend.',
    formats: [
      { key: 'edition', label: 'Edition', sub: 'Full email newsletter', icon: '✉', to: '/create/newsletter' },
    ],
  },
  {
    key: 'report', label: 'Report',
    blurb: 'Wider publications and reports authored by the studio.',
    formats: [
      { key: 'publication', label: 'Publication', sub: '“State of” report', icon: '◈', to: '/create/report' },
    ],
  },
]

export function familyOf(key: string): CFamily {
  return FAMILIES.find((f) => f.key === key) ?? FAMILIES[0]
}

export interface RecentItem {
  id: string
  family: FamilyKey
  title: string
  type: string
  status: string
  when: number // epoch ms
  to: string
}

const ts = (s?: string | null) => (s ? Date.parse(s) : 0)

/* One merged, recency-sorted feed across the content families, for the
   "Recent" strip and the Content library. Best-effort per source. */
export async function recentContent(): Promise<RecentItem[]> {
  const out: RecentItem[] = []
  const [newsletters, journal] = await Promise.all([
    listNewsletters().catch(() => []),
    listJournal().catch(() => []),
  ])
  for (const n of newsletters) out.push({ id: n.id, family: 'newsletter', title: n.subject || 'Untitled', type: 'Edition', status: n.status, when: ts(n.created_at), to: `/create/newsletter?open=${n.id}` })
  for (const a of journal) {
    const isReport = (a.kind ?? 'article') === 'report'
    out.push({ id: a.id, family: isReport ? 'report' : 'journal', title: a.title || 'Untitled', type: isReport ? 'Publication' : 'Article', status: a.status, when: ts(a.created_at), to: isReport ? '/create/report' : '/create/journal' })
  }
  return out.sort((a, b) => b.when - a.when)
}

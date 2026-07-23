/* Hue & Heal — Studio Co-pilot mock data.
   Stand-in for the operations backend. Shapes are designed to map cleanly
   onto a real API later (clients, proposals, invoices, social content). */

export type NavKey = 'dashboard' | 'calendar' | 'clients' | 'proposals' | 'social' | 'newsletter' | 'reports' | 'settings' | 'research' | 'linkedin'

export interface NavItem {
  key: NavKey
  label: string
  glyph: string
  path: string
}

export const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', glyph: '◳', path: '/' },
  { key: 'calendar', label: 'Calendar', glyph: '⊞', path: '/calendar' },
  { key: 'clients', label: 'Clients', glyph: '◎', path: '/clients' },
  { key: 'proposals', label: 'Proposals & Invoices', glyph: '✦', path: '/proposals' },
  { key: 'social', label: 'Social Copilot', glyph: '▦', path: '/social' },
  { key: 'newsletter', label: 'Newsletter', glyph: '✉', path: '/newsletter' },
  { key: 'reports', label: 'Reports', glyph: '◈', path: '/reports' },
  { key: 'research', label: 'Research', glyph: '⌕', path: '/research' },
  { key: 'linkedin', label: 'LinkedIn', glyph: 'in', path: '/linkedin' },
  { key: 'settings', label: 'Settings', glyph: '⚙', path: '/settings' },
]

export const USER = {
  name: 'Maria Valiji',
  role: 'Design Director',
  initials: 'MV',
}

/* ---- Dashboard headline metrics ---- */
export interface Metric {
  value: string
  label: string
}

export const METRICS: Metric[] = [
  { value: '£64k', label: 'Proposals out' },
  { value: '£13.2k', label: 'Invoiced this month' },
  { value: '8', label: 'Active clients' },
  { value: '5', label: 'Posts scheduled' },
]

/* ---- "Needs attention" feed ---- */
export type AttentionKind = 'invoice' | 'proposal' | 'post' | 'lead'
export interface AttentionItem {
  kind: AttentionKind
  glyph: string
  title: string
  meta: string
  action: string
  actionTone: 'accent' | 'muted' | 'positive'
  /* icon chip colours */
  chipBg: string
  chipFg: string
}

export const ATTENTION: AttentionItem[] = [
  {
    kind: 'invoice',
    glyph: '№',
    title: 'Maven · Retainer Q3',
    meta: 'Invoice · 12 days overdue',
    action: 'Chase',
    actionTone: 'accent',
    chipBg: 'var(--hh-copper)',
    chipFg: '#F6EFE4',
  },
  {
    kind: 'proposal',
    glyph: '◈',
    title: 'Aman · Experience design',
    meta: 'Proposal · sent 6 days ago',
    action: 'Follow up',
    actionTone: 'muted',
    chipBg: 'var(--hh-anthracite)',
    chipFg: 'var(--hh-ember)',
  },
  {
    kind: 'post',
    glyph: '▦',
    title: '“Guide to Hotels” carousel',
    meta: 'Scheduled · today 9:00',
    action: 'Ready',
    actionTone: 'positive',
    chipBg: 'var(--hh-mushroom)',
    chipFg: '#2A211A',
  },
  {
    kind: 'lead',
    glyph: '◎',
    title: 'Wild Botanic · intro call',
    meta: 'Thursday 14:00',
    action: 'Prep',
    actionTone: 'muted',
    chipBg: 'var(--hh-cacao)',
    chipFg: 'var(--hh-ember)',
  },
]

/* ---- Greeting helpers (design shows a live date + time-of-day greeting) ---- */
export function greeting(d: Date): string {
  const h = d.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function longDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

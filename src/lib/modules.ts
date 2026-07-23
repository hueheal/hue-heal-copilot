import type { NavKey } from '../data/studio'

/* Copilot modules. A brand world enables a subset during onboarding and the
   sidebar is built from them. Dashboard + Settings are always present. */

export const CORE_NAV: NavKey[] = ['dashboard', 'settings']

export interface ModuleOption {
  key: string
  label: string
  description: string
  comingSoon?: boolean
}

export const MODULE_OPTIONS: ModuleOption[] = [
  { key: 'social', label: 'Social Copilot', description: 'On-brand posts, carousels & stories' },
  { key: 'newsletter', label: 'Newsletter', description: 'Branded email campaigns' },
  { key: 'proposals', label: 'Proposals & Invoices', description: 'Priced proposals and billing' },
  { key: 'clients', label: 'CRM', description: 'Clients & pipeline' },
  { key: 'reports', label: 'Reports', description: 'Performance & insight decks' },
  { key: 'calendar', label: 'Calendar', description: 'Schedule across everything' },
  { key: 'research', label: 'Research', description: 'Audience & market insight', comingSoon: true },
  { key: 'linkedin', label: 'LinkedIn', description: 'Long-form professional posts', comingSoon: true },
]

/** Sensible defaults for a brand that hasn't chosen (and existing brands). */
export const DEFAULT_MODULES = ['calendar', 'clients', 'proposals', 'social', 'newsletter', 'reports']

/** Suggested module sets keyed by a brand's primary function (onboarding). */
export const FUNCTION_PRESETS: { key: string; label: string; modules: string[] }[] = [
  { key: 'social', label: 'Social & content', modules: ['social', 'newsletter', 'calendar', 'reports'] },
  { key: 'studio', label: 'Design / experience studio', modules: DEFAULT_MODULES },
  { key: 'agency', label: 'Agency / client services', modules: ['clients', 'proposals', 'social', 'newsletter', 'reports', 'calendar'] },
  { key: 'newsletter', label: 'Publisher / newsletter-led', modules: ['newsletter', 'social', 'reports', 'calendar'] },
]

export const COMING_SOON = new Set(MODULE_OPTIONS.filter((m) => m.comingSoon).map((m) => m.key))

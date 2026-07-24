/* Per-brand social style profile. Drives the template engine so each brand
   world renders a distinct look instead of inheriting Hue & Heal's art
   direction. Stored on brand_profiles.social_style (jsonb); null falls back to
   smart per-brand defaults. */
import type { Background } from './design'

export type BgTreatment = 'atmos' | 'ink' | 'accent' | 'sand' | 'photo'
export type TextTone = 'cream' | 'ink'
export type HeadlineFont = 'serif' | 'sans'
export type Motif = 'rule' | 'none'

export interface SocialStyle {
  background: BgTreatment
  /** Optional explicit base colour for ink/accent treatments; else derived. */
  bgColor?: string
  textTone: TextTone
  headlineFont: HeadlineFont
  motif: Motif
  tagline: string
  align: 'left' | 'center'
}

export const CREAM = '#F4F0E7'
export const INK = '#1E1B18'
const SAND = '#ECE6DA'

/** Dark or light text for legibility on a hex background. */
export function readableText(hex: string): TextTone {
  const h = hex.replace('#', '')
  if (h.length !== 6) return 'cream'
  const c = (i: number) => { const v = parseInt(h.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  const L = 0.2126 * c(0) + 0.7152 * c(2) + 0.0722 * c(4)
  return L > 0.5 ? 'ink' : 'cream'
}

interface BrandLike { name?: string; display_font?: string; accent_color?: string; social_style?: Record<string, unknown> | null }

/** Smart default look for a brand with no saved profile. The Hue & Heal parent
    keeps its warm editorial system; white-label brands get a clean, distinct
    default (dark ground, sans headline, no house tagline). */
export function defaultStyle(brand: BrandLike | null | undefined): SocialStyle {
  const isParent = !brand || brand.display_font === 'ivyora' || brand.name === 'Hue & Heal'
  if (isParent) {
    return { background: 'atmos', textTone: 'cream', headlineFont: 'serif', motif: 'rule', tagline: 'Designing the future of wellness', align: 'left' }
  }
  return { background: 'ink', textTone: 'cream', headlineFont: 'sans', motif: 'none', tagline: '', align: 'left' }
}

/** The style to render with: the brand's saved profile, else the default. */
export function resolveStyle(brand: BrandLike | null | undefined): SocialStyle {
  const raw = brand?.social_style
  if (raw && typeof raw === 'object') {
    const d = defaultStyle(brand)
    const r = raw as Partial<SocialStyle>
    return {
      background: r.background ?? d.background,
      bgColor: r.bgColor ?? d.bgColor,
      textTone: r.textTone ?? d.textTone,
      headlineFont: r.headlineFont ?? d.headlineFont,
      motif: r.motif ?? d.motif,
      tagline: r.tagline ?? d.tagline,
      align: r.align ?? d.align,
    }
  }
  return defaultStyle(brand)
}

/** Resolve a style's background treatment into a concrete slide Background. */
export function backgroundFor(style: SocialStyle, accentHex: string): Background {
  switch (style.background) {
    case 'ink': return { type: 'solid', value: style.bgColor || INK }
    case 'sand': return { type: 'solid', value: style.bgColor || SAND }
    case 'accent': return { type: 'solid', value: style.bgColor || accentHex }
    case 'photo': return { type: 'atmos', value: 'atmos' } // upload a photo for the full look
    case 'atmos':
    default: return { type: 'atmos', value: 'atmos' }
  }
}

/** Foreground colour for headings/body given the style + its resolved bg. */
export function fgFor(style: SocialStyle, accentHex: string): string {
  if (style.background === 'accent') return readableText(style.bgColor || accentHex) === 'ink' ? INK : CREAM
  if (style.background === 'sand') return INK
  return style.textTone === 'ink' ? INK : CREAM
}

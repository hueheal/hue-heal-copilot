/* Hue & Heal — Social design model.
   A post's `design` is a set of slides; each slide has a background + positioned
   elements. Boxes are in PERCENT of the canvas so they scale to any display size;
   font sizes are in real-canvas px (e.g. 72 = 72px on the 1080-wide export). */
import type { Accent } from '../database.types'
import type { InstaFormat } from './formats'

export type FontKey = 'serif' | 'sans' | 'voice'
export type ElementType = 'text' | 'shape' | 'image' | 'pill' | 'logo'

export interface Box { x: number; y: number; w: number; h: number } // percent 0–100

export type PlateStyle = 'none' | 'dark' | 'light'

export interface ElStyle {
  color?: string
  fontKey?: FontKey
  fontSize?: number // real-canvas px
  fontWeight?: number
  align?: 'left' | 'center' | 'right'
  lineHeight?: number
  letterSpacing?: number // em
  italic?: boolean
  uppercase?: boolean
  bg?: string // shape fill
  radius?: number // shape corner %
  opacity?: number
  plate?: PlateStyle // legibility backing behind text
}

export type ScrimStyle = 'none' | 'gradient' | 'shade'

export interface DesignElement {
  id: string
  type: ElementType
  box: Box
  style: ElStyle
  content: string // text, or image URL
  role?: string // stable slot id ('headline','tagline','eyebrow'…) — lets template
  // switches preserve edited content by matching roles
  accentRef?: boolean // this element's colour/fill tracks the design accent
}

export interface Background {
  type: 'solid' | 'atmos' | 'image'
  value: string // hex, 'atmos', or image URL
}

export interface Slide {
  id: string
  background: Background
  scrim?: ScrimStyle // legibility overlay for photo backgrounds
  scrimStrength?: number // 0–100 intensity, default 55
  elements: DesignElement[]
}

export interface Design {
  format: InstaFormat
  accent: Accent
  templateId: string
  slides: Slide[]
}

export function accentHex(accent: Accent): string {
  return accent === 'lime' ? '#D2DC4E' : accent === 'terracotta' ? '#9A4A26' : '#CE8A53'
}

/* On screen: real Ivy Ora (Typekit) for the serif/voice — brand-critical.
   In the PNG/ZIP export, Ivy Ora (Adobe Fonts) can't be embedded, so it falls back
   to the self-hosted HHSerif; the moment licensed Ivy Ora .otf files are dropped into
   /public/fonts/ivyora and registered as HHSerif, exports become true Ivy Ora too. */
export function fontVar(key: FontKey | undefined): string {
  if (key === 'sans') return "'HHSans', 'Poppins', system-ui, sans-serif"
  return "'ivyora-display', 'HHSerif', Georgia, serif" // serif + voice (voice adds font-style:italic)
}

let idc = 0
export function eid(prefix = 'el'): string {
  idc += 1
  return `${prefix}-${idc}`
}

export function isDesign(d: unknown): d is Design {
  return !!d && typeof d === 'object' && Array.isArray((d as Design).slides) && (d as Design).slides.length > 0
}

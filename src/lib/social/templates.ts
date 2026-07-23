/* Hue & Heal — on-brand social templates.
   Each template seeds a Design (background + positioned elements) from a brief.
   Elements stay fully editable afterwards (the "hybrid" part). */
import type { Accent } from '../database.types'
import { INSTAGRAM_FORMATS, type InstaFormat } from './formats'
import { type Design, type Slide, type DesignElement, accentHex, eid } from './design'

export interface TemplateSeed {
  headline: string
  sector?: string
  accent: Accent
  /** Brand world's wordmark text — defaults to the Hue & Heal parent. */
  brandName?: string
}

/** Tagline line — only the parent brand has a house tagline; others start blank. */
export function taglineFor(seed: TemplateSeed): string {
  const n = (seed.brandName ?? '').trim()
  return !n || n === 'Hue & Heal' ? 'Designing the future of wellness' : ''
}

/** Quote attribution — "— Brand". */
export function attributionFor(seed: TemplateSeed): string {
  return `— ${(seed.brandName ?? '').trim() || 'Hue & Heal'}`
}

/** Wordmark string for a slide: "brand." (the trailing dot is the house style). */
export function wordmarkFor(seed: TemplateSeed): string {
  const n = (seed.brandName ?? '').trim()
  if (!n || n === 'Hue & Heal') return 'hue&heal.'
  return `${n}.`
}

export interface TemplateDef {
  id: string
  label: string
  /** which formats it suits; empty = all */
  formats?: InstaFormat[]
  build: (format: InstaFormat, seed: TemplateSeed) => Slide
}

const INK = '#1E1B18'
const CREAM = '#F4F0E7'

function text(
  content: string,
  box: DesignElement['box'],
  style: DesignElement['style'],
  extra?: { role?: string; accentRef?: boolean },
): DesignElement {
  return { id: eid('t'), type: 'text', box, style, content, ...extra }
}
function shape(box: DesignElement['box'], bg: string, radius = 0, extra?: { role?: string; accentRef?: boolean }): DesignElement {
  return { id: eid('s'), type: 'shape', box, style: { bg, radius }, content: '', ...extra }
}

/* ---- Templates ---- */
export const TEMPLATES: TemplateDef[] = [
  {
    id: 'guide',
    label: 'Guide cover',
    build: (format, seed) => {
      const acc = accentHex(seed.accent)
      const big = format === 'story' ? 108 : 92
      return {
        id: eid('slide'),
        background: { type: 'atmos', value: 'atmos' },
        elements: [
          text(wordmarkFor(seed), { x: 8, y: 6, w: 40, h: 8 }, { color: CREAM, fontKey: 'serif', fontSize: 34, fontWeight: 300 }, { role: 'wordmark' }),
          text((seed.sector ?? 'Hospitality').toUpperCase(), { x: 8, y: 60, w: 60, h: 6 }, { color: acc, fontKey: 'sans', fontSize: 20, letterSpacing: 0.18, uppercase: true }, { role: 'eyebrow', accentRef: true }),
          text('A guide to', { x: 8, y: 66, w: 60, h: 8 }, { color: CREAM, fontKey: 'sans', fontSize: 22, letterSpacing: 0.12, uppercase: true, opacity: 0.8 }, { role: 'kicker' }),
          text(seed.headline || 'Hotels', { x: 8, y: 71, w: 84, h: 18 }, { color: CREAM, fontKey: 'serif', fontSize: big, fontWeight: 300, lineHeight: 1.0 }, { role: 'headline' }),
          shape({ x: 8, y: 90, w: 12, h: 0.6 }, acc, 0, { accentRef: true }),
          text(taglineFor(seed), { x: 8, y: 92, w: 70, h: 6 }, { color: CREAM, fontKey: 'voice', fontSize: 30, italic: true, opacity: 0.85 }, { role: 'tagline' }),
        ],
      }
    },
  },
  {
    id: 'quote',
    label: 'Quote',
    build: (_format, seed) => {
      const acc = accentHex(seed.accent)
      return {
        id: eid('slide'),
        background: { type: 'solid', value: '#ECE6DA' },
        elements: [
          text(wordmarkFor(seed), { x: 8, y: 7, w: 40, h: 8 }, { color: INK, fontKey: 'serif', fontSize: 34, fontWeight: 300 }, { role: 'wordmark' }),
          text('“', { x: 7, y: 22, w: 30, h: 20 }, { color: acc, fontKey: 'serif', fontSize: 180, lineHeight: 0.8 }, { accentRef: true }),
          text(seed.headline || 'A space should make you feel something before you understand why.', { x: 9, y: 34, w: 82, h: 40 }, { color: INK, fontKey: 'serif', fontSize: 68, fontWeight: 300, lineHeight: 1.12 }, { role: 'headline' }),
          text(attributionFor(seed), { x: 9, y: 86, w: 60, h: 6 }, { color: '#6E6456', fontKey: 'sans', fontSize: 24, letterSpacing: 0.04 }, { role: 'tagline' }),
        ],
      }
    },
  },
  {
    id: 'statement',
    label: 'Statement',
    build: (format, seed) => {
      const acc = accentHex(seed.accent)
      const big = format === 'story' ? 120 : 104
      return {
        id: eid('slide'),
        background: { type: 'atmos', value: 'atmos' },
        elements: [
          text(wordmarkFor(seed), { x: 8, y: 7, w: 40, h: 8 }, { color: CREAM, fontKey: 'serif', fontSize: 34, fontWeight: 300 }, { role: 'wordmark' }),
          text(seed.headline || 'The science of feeling well', { x: 8, y: 38, w: 84, h: 30 }, { color: CREAM, fontKey: 'serif', fontSize: big, fontWeight: 300, lineHeight: 1.02 }, { role: 'headline' }),
          shape({ x: 8, y: 72, w: 14, h: 0.7 }, acc, 0, { accentRef: true }),
          text((seed.sector ?? 'Wellness design').toUpperCase(), { x: 8, y: 75, w: 70, h: 6 }, { color: acc, fontKey: 'sans', fontSize: 22, letterSpacing: 0.18, uppercase: true }, { role: 'eyebrow', accentRef: true }),
        ],
      }
    },
  },
]

// Insert the photo-led editorial cover (centered, over a photo w/ gradient scrim + glass pill).
TEMPLATES.push({
  id: 'editorial',
  label: 'Editorial (photo)',
  build: (format, seed) => {
    const big = format === 'story' ? 150 : 128
    return {
      id: eid('slide'),
      background: { type: 'atmos', value: 'atmos' }, // upload a photo for the full look
      scrim: 'gradient',
      scrimStrength: 72,
      elements: [
        text(`${wordmarkFor(seed).replace(/\.$/, '')}’s guide to`, { x: 8, y: 8, w: 84, h: 6 }, { color: CREAM, fontKey: 'serif', fontSize: 30, align: 'center', letterSpacing: 0.02 }, { role: 'eyebrow' }),
        text('Wellness design in', { x: 8, y: 17, w: 84, h: 7 }, { color: CREAM, fontKey: 'sans', fontSize: 40, fontWeight: 400, align: 'center' }, { role: 'kicker' }),
        text(seed.headline || 'Hospitals', { x: 4, y: 23, w: 92, h: 18 }, { color: CREAM, fontKey: 'serif', fontSize: big, fontWeight: 300, align: 'center', lineHeight: 0.98 }, { role: 'headline' }),
        { id: eid('pill'), type: 'pill', box: { x: 30, y: 42, w: 40, h: 6 }, style: { color: CREAM, fontKey: 'voice', fontSize: 34, align: 'center' }, content: 'Part 1: Classrooms', role: 'pill', accentRef: false },
        text('Swipe to see how ⟶', { x: 8, y: 88, w: 84, h: 6 }, { color: CREAM, fontKey: 'voice', fontSize: 36, italic: true, align: 'center', opacity: 0.92 }, { role: 'tagline' }),
      ],
    }
  },
})

export function templateById(id: string): TemplateDef {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]
}

export interface ContentSlideInput {
  heading: string
  body: string
}

/** A carousel content slide (used for slides 2..N): number, heading, body. */
export function buildContentSlide(
  _format: InstaFormat,
  { index, total, heading, body, accent }: { index: number; total: number; heading: string; body: string; accent: Accent },
): Slide {
  const acc = accentHex(accent)
  return {
    id: eid('slide'),
    background: { type: 'atmos', value: 'atmos' },
    elements: [
      text(`0${index + 1} / 0${total}`, { x: 8, y: 8, w: 40, h: 6 }, { color: acc, fontKey: 'sans', fontSize: 22, letterSpacing: 0.16, uppercase: true }, { accentRef: true }),
      text(heading, { x: 8, y: 30, w: 84, h: 20 }, { color: CREAM, fontKey: 'serif', fontSize: 72, fontWeight: 300, lineHeight: 1.05 }, { role: 'heading' }),
      shape({ x: 8, y: 54, w: 12, h: 0.6 }, acc, 0, { accentRef: true }),
      text(body, { x: 8, y: 58, w: 82, h: 30 }, { color: CREAM, fontKey: 'sans', fontSize: 30, lineHeight: 1.5, opacity: 0.9 }, { role: 'body' }),
    ],
  }
}

/** Build a fresh Design. For carousels, lays out a cover + one slide per
    content item (the generated principles), instead of cloning the cover. */
export function buildDesign(
  format: InstaFormat,
  templateId: string,
  seed: TemplateSeed,
  slideCount = 1,
  contentSlides?: ContentSlideInput[],
): Design {
  const def = templateById(templateId)
  const spec = INSTAGRAM_FORMATS[format]
  if (!spec.multi) {
    return { format, accent: seed.accent, templateId, slides: [def.build(format, seed)] }
  }
  const cover = def.build(format, seed)
  let rest: Slide[]
  if (contentSlides && contentSlides.length) {
    rest = contentSlides.map((cs, i) =>
      buildContentSlide(format, { index: i, total: contentSlides.length, heading: cs.heading, body: cs.body, accent: seed.accent }),
    )
  } else {
    rest = Array.from({ length: Math.max(slideCount - 1, 0) }, () => def.build(format, seed))
  }
  return { format, accent: seed.accent, templateId, slides: [cover, ...rest] }
}

/* Hue & Heal — Instagram format registry.
   Exact pixel canvases per format. The co-design editor renders a scaled canvas
   and exports at the real px size. */
import type { PostFormat } from '../database.types'

export interface FormatSpec {
  key: InstaFormat
  label: string
  w: number
  h: number
  /** carousel = multiple slides at the given size */
  multi?: boolean
  hint: string
}

export type InstaFormat = 'square' | 'portrait' | 'story' | 'carousel'

export const INSTAGRAM_FORMATS: Record<InstaFormat, FormatSpec> = {
  square: { key: 'square', label: 'Square', w: 1080, h: 1080, hint: 'Feed · 1:1' },
  portrait: { key: 'portrait', label: 'Portrait', w: 1080, h: 1350, hint: 'Feed · 4:5' },
  story: { key: 'story', label: 'Story', w: 1080, h: 1920, hint: 'Story/Reel cover · 9:16' },
  carousel: { key: 'carousel', label: 'Carousel', w: 1080, h: 1350, multi: true, hint: 'Swipe · 4:5 slides' },
}

export const INSTAGRAM_FORMAT_LIST: FormatSpec[] = [
  INSTAGRAM_FORMATS.square,
  INSTAGRAM_FORMATS.portrait,
  INSTAGRAM_FORMATS.story,
  INSTAGRAM_FORMATS.carousel,
]

/** The subset of PostFormat values that are Instagram canvases. */
export function isInstaFormat(f: PostFormat): f is InstaFormat {
  return f === 'square' || f === 'portrait' || f === 'story' || f === 'carousel'
}

export function formatSpec(f: PostFormat): FormatSpec {
  return isInstaFormat(f) ? INSTAGRAM_FORMATS[f] : INSTAGRAM_FORMATS.portrait
}

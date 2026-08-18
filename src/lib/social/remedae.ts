/* ============================================================
   Remedae · Instagram template system.

   Built from the Remedae Figma social frames (Cover Editorial, Quick
   Glance, Recipe, Editorial, Journal) and the Claude "Instagram Hook
   Templates" set (question, number, list tease, reframe, POV, quiz,
   save, short cover, six opener), then extended into a full family
   that covers Remedae's content types: hooks, editorial covers,
   reference/save posts, remedy and recipe cards, evidence cards,
   quotes, product promos, and the carousel body + end slides.

   Design rules (all templates):
   - 4:5 first (1080×1350). Every layout is anchored top/bottom so it
     also holds on 1:1 and 9:16 (story keeps IG's safe zones clear).
   - One idea per plate. One hook, one promise, one cue. Never more
     than one cue per post.
   - Quando for headlines, Poppins for everything else. One *phrase*
     per headline is set in mint italic (the highlight device).
   - Dark forest ground by default; cream ground for "save" reference
     posts (they read as paper, which is what people bookmark).
   - Legibility floor: no type under 22px on the 1080 canvas (~8px on
     a phone). The Claude set used 11–13px eyebrows; those are raised.
   - Brand mark bottom-left, context label bottom-right, on every slide.
   - Photos always sit under a gradient scrim so cream type stays legible.
   ============================================================ */
import type { Slide, DesignElement, Background, FontPair, Box } from './design'
import { eid } from './design'
import { INSTAGRAM_FORMATS, type InstaFormat } from './formats'
import type { TemplateSeed, TemplateDef, ContentSlideInput } from './templates'

/* ---- palette + type ---- */
export const RD = {
  ink: '#0e1a12',
  charcoal: '#1a2b1e',
  mid: '#2d3f32',
  forest: '#364c3f',
  mint: '#a6d893',
  cream: '#ffffe8',
  yellow: '#fff236',
  creamDim: 'rgba(255,255,232,0.62)',
  creamFaint: 'rgba(255,255,232,0.4)',
  mintDim: 'rgba(166,216,147,0.7)',
  mintLine: 'rgba(166,216,147,0.16)',
  forestDim: 'rgba(54,76,63,0.6)',
  forestLine: 'rgba(54,76,63,0.16)',
}
export const REMEDAE_FONTS: FontPair = {
  serif: "'Quando', Georgia, serif",
  sans: "'HHSans', 'Poppins', system-ui, sans-serif",
}
export const REMEDAE_PALETTE = [RD.ink, RD.charcoal, RD.forest, RD.mint, RD.cream, RD.yellow]

/** Which brand worlds get this family. */
export function isRemedae(brandName?: string | null): boolean {
  return (brandName ?? '').trim().toLowerCase().startsWith('remedae')
}

/* ---- layout: px on the 1080-wide canvas, anchored top or bottom ---- */
const PAD = 80
function layout(format: InstaFormat) {
  const spec = INSTAGRAM_FORMATS[format]
  const W = spec.w, H = spec.h
  // Story: keep IG's top (profile) and bottom (reply) bands clear.
  const safeTop = format === 'story' ? 220 : 0
  const safeBottom = format === 'story' ? 260 : 0
  const pct = (px: number, total: number) => (px / total) * 100
  return {
    W, H,
    top: (x: number, y: number, w: number, h: number): Box => ({ x: pct(x, W), y: pct(safeTop + y, H), w: pct(w, W), h: pct(h, H) }),
    /** yb = distance from the canvas bottom to the element's bottom edge. */
    bottom: (x: number, yb: number, w: number, h: number): Box => ({ x: pct(x, W), y: pct(H - safeBottom - yb - h, H), w: pct(w, W), h: pct(h, H) }),
    /** Height fraction of the canvas (for shapes / images). */
    hpct: (px: number) => pct(px, H),
    fill: (): Box => ({ x: 0, y: 0, w: 100, h: 100 }),
  }
}

/* ---- atoms ---- */
function t(content: string, box: Box, style: DesignElement['style'], role?: string): DesignElement {
  return { id: eid('t'), type: 'text', box, style, content, role }
}
function shape(box: Box, bg: string, extra?: DesignElement['style'], role?: string): DesignElement {
  return { id: eid('s'), type: 'shape', box, style: { bg, ...extra }, content: '', role }
}
function img(url: string, box: Box, radiusPx = 0, role = 'image'): DesignElement {
  return { id: eid('i'), type: 'image', box, style: { radiusPx }, content: url, role }
}
function pill(content: string, box: Box, on: boolean, ground: 'dark' | 'light' = 'dark', role?: string): DesignElement {
  const dark = ground === 'dark'
  return {
    id: eid('p'), type: 'pill', box, content, role,
    style: {
      fontKey: 'sans', fontSize: 24, fontWeight: 500, letterSpacing: 0.06, uppercase: true, italic: false, align: 'left',
      color: on ? RD.mint : dark ? RD.cream : RD.forest,
      bg: on ? 'rgba(166,216,147,0.12)' : dark ? 'rgba(10,24,14,0.35)' : 'rgba(54,76,63,0.08)',
      border: `2px solid ${on ? RD.mint : dark ? 'rgba(255,255,232,0.5)' : 'rgba(54,76,63,0.35)'}`,
      radiusPx: 999,
    },
  }
}
const REMEDAE_MARK = { onDark: '/brand/remedae-logo.svg', onLight: '/brand/remedae-logo-ink.svg' }
function footer(L: ReturnType<typeof layout>, label: string, ground: 'dark' | 'light', seed: TemplateSeed): DesignElement[] {
  const logo = seed.logoUrl?.trim() || (ground === 'dark' ? REMEDAE_MARK.onDark : REMEDAE_MARK.onLight)
  return [
    { id: eid('logo'), type: 'logo', box: L.bottom(PAD, 56, 200, 40), style: { align: 'left' }, content: logo, role: 'wordmark' },
    t(label, L.bottom(480, 62, 520, 28), { color: ground === 'dark' ? RD.creamFaint : RD.forestDim, fontKey: 'sans', fontSize: 22, letterSpacing: 0.18, uppercase: true, align: 'right' }, 'label'),
  ]
}
function eyebrow(content: string, box: Box, color = RD.mintDim, role = 'eyebrow'): DesignElement {
  return t(content, box, { color, fontKey: 'sans', fontSize: 24, fontWeight: 500, letterSpacing: 0.22, uppercase: true }, role)
}
function headline(content: string, box: Box, size: number, color = RD.cream, role = 'headline', extra?: DesignElement['style']): DesignElement {
  return t(content, box, { color, fontKey: 'serif', fontSize: size, lineHeight: 0.98, letterSpacing: -0.04, hl: RD.mint, ...extra }, role)
}
function body(content: string, box: Box, size = 28, color = RD.creamDim, role = 'body'): DesignElement {
  return t(content, box, { color, fontKey: 'sans', fontSize: size, fontWeight: 300, lineHeight: 1.5 }, role)
}
/** The scroll-stopper cue: one per post, mint chevron implied by the arrow. */
function cue(content: string, box: Box, color = RD.creamDim, role = 'tagline'): DesignElement {
  return t(`${content}  ›`, box, { color, fontKey: 'sans', fontSize: 28, fontWeight: 500, letterSpacing: -0.01, hl: RD.mint }, role)
}
function rule(box: Box, ground: 'dark' | 'light' = 'dark'): DesignElement {
  return shape(box, ground === 'dark' ? RD.mintLine : RD.forestLine)
}
const dark = (bg = RD.ink): Background => ({ type: 'solid', value: bg })
const photoOr = (seed: TemplateSeed, fallback = RD.ink): { background: Background; scrim?: Slide['scrim']; scrimStrength?: number; scrimTint?: string } => {
  const p = seed.coverImage?.trim()
  return p ? { background: { type: 'image', value: p }, scrim: 'gradient', scrimStrength: 82, scrimTint: '14,26,18' } : { background: dark(fallback) }
}
function slide(bg: ReturnType<typeof photoOr> | Background, els: DesignElement[]): Slide {
  const b = 'background' in bg ? bg : { background: bg }
  return { id: eid('slide'), ...b, elements: els }
}
const item = (seed: TemplateSeed, i: number, fallback: string) => (seed.items?.[i]?.trim() || fallback)
/** Rough line count for a serif headline in a box, so bottom-anchored blocks
    can hug what sits under them (text renders from the top of its box). */
function linesFor(text: string, fontSize: number, boxW: number, em = 0.5): number {
  const perLine = Math.max(8, Math.floor(boxW / (fontSize * em)))
  return text.split('\n').reduce((n, para) => n + Math.max(1, Math.ceil(para.replace(/\*/g, '').length / perLine)), 0)
}
const first = (s: string, n: number) => s.split(/\s+/).slice(0, n).join(' ')

/* Placeholder copy is deliberately real Remedae-shaped copy, so a blank
   post already looks finished and the writer only has to swap words. */

/* ============================================================
   Templates
   ============================================================ */
export const REMEDAE_TEMPLATES: TemplateDef[] = [
  /* 1 · The question. Curiosity gap, nothing else on the plate. */
  {
    id: 'rd-question', label: 'The question', brand: 'remedae',
    build: (format, seed) => {
      const L = layout(format)
      return slide(photoOr(seed), [
        eyebrow('Ask Remedae', L.top(PAD, 60, 800, 30)),
        headline(seed.headline || 'Why does ginger stop *nausea* in four different traditions?', L.bottom(PAD, 330, 920, 440), 104),
        cue('Three of them agree on the reason', L.bottom(PAD, 210, 900, 40)),
        ...footer(L, 'answer in the caption', 'dark', seed),
      ])
    },
  },
  /* 2 · The number. One stat, set enormous, over a photograph. */
  {
    id: 'rd-number', label: 'The number', brand: 'remedae',
    build: (format, seed) => {
      const L = layout(format)
      return slide(photoOr(seed), [
        eyebrow('The gut remedy', L.top(PAD, 60, 800, 30), 'rgba(255,255,232,0.8)'),
        t('3bn', L.bottom(PAD, 520, 920, 230), { color: RD.mint, fontKey: 'serif', fontSize: 250, lineHeight: 0.85, letterSpacing: -0.06 }, 'stat'),
        headline(seed.headline || 'people already know it. Most doctors were never taught it.', L.bottom(PAD, 290, 860, 210), 58, RD.cream, 'headline', { lineHeight: 1.08, letterSpacing: -0.03 }),
        cue('Read what it is', L.bottom(PAD, 210, 900, 40)),
        ...footer(L, 'remedae.app · sources in caption', 'dark', seed),
      ])
    },
  },
  /* 3 · The list tease. Two given, two withheld. */
  {
    id: 'rd-list-tease', noPhoto: true, label: 'List tease', brand: 'remedae', formats: ['carousel', 'portrait', 'story'],
    build: (format, seed) => {
      const L = layout(format)
      const rows: DesignElement[] = []
      const shown = [item(seed, 0, 'Light before screens'), item(seed, 1, 'Warmth in the belly at dusk')]
      for (let i = 0; i < 4; i++) {
        const yb = 560 - i * 96
        rows.push(rule(L.bottom(PAD, yb + 84, 920, 2)))
        rows.push(t(`0${i + 1}`, L.bottom(PAD, yb + 30, 60, 30), { color: i < 2 ? RD.mint : 'rgba(166,216,147,0.35)', fontKey: 'sans', fontSize: 22, fontWeight: 500, letterSpacing: 0.16 }))
        if (i < 2) rows.push(t(shown[i], L.bottom(PAD + 72, yb + 22, 840, 50), { color: RD.cream, fontKey: 'serif', fontSize: 42, letterSpacing: -0.03 }, `item${i + 1}`))
        else {
          rows.push(shape(L.bottom(PAD + 72, yb + 38, 260, 12), 'rgba(255,255,232,0.12)', { radiusPx: 999 }))
          rows.push(shape(L.bottom(PAD + 350, yb + 38, 150, 12), 'rgba(255,255,232,0.12)', { radiusPx: 999 }))
        }
      }
      return slide(dark(), [
        eyebrow('Sleep · six traditions', L.top(PAD, 60, 800, 30)),
        headline(seed.headline || 'Four things every tradition says about *sleep.*', L.bottom(PAD, 690, 900, 250), 80),
        ...rows,
        cue('Keep swiping', L.bottom(PAD, 210, 900, 40)),
        ...footer(L, 'swipe for 03 and 04', 'dark', seed),
      ])
    },
  },
  /* 4 · The reframe. Told / traditionally used, two columns, one rule. */
  {
    id: 'rd-reframe', noPhoto: true, label: 'The reframe', brand: 'remedae',
    build: (format, seed) => {
      const L = layout(format)
      const pairs = [
        ['Drink it cold.', 'Warm water, every tradition, every time.'],
        ['Skip breakfast.', 'Eat when the sun is highest: Ayurveda, TCM.'],
        ['Take it at night.', 'Bitter herbs land better before noon.'],
      ]
      const rows: DesignElement[] = []
      pairs.forEach(([a, b], i) => {
        const yb = 520 - i * 120
        rows.push(rule(L.bottom(PAD, yb + 108, 920, 2)))
        rows.push(t(item(seed, i, a), L.bottom(PAD, yb + 30, 420, 60), { color: 'rgba(255,255,232,0.42)', fontKey: 'sans', fontSize: 27, fontWeight: 300, letterSpacing: -0.02, strike: true, lineHeight: 1.3 }, `told${i + 1}`))
        rows.push(t(seed.itemBodies?.[i]?.trim() || b, L.bottom(PAD + 460, yb + 20, 540, 80), { color: RD.mint, fontKey: 'serif', fontSize: 28, lineHeight: 1.28, letterSpacing: -0.02 }, `said${i + 1}`))
      })
      return slide(dark(), [
        eyebrow('The reframe', L.top(PAD, 60, 800, 30)),
        headline(seed.headline || 'You were told one thing.\n*Six traditions say another.*', L.bottom(PAD, 700, 920, 260), 76),
        ...rows,
        cue('Which one surprised you', L.bottom(PAD, 210, 900, 40)),
        ...footer(L, 'educational · not medical advice', 'dark', seed),
      ])
    },
  },
  /* 5 · The POV. Time-stamped, second person, no images. */
  {
    id: 'rd-pov', noPhoto: true, label: 'The POV', brand: 'remedae',
    build: (format, seed) => {
      const L = layout(format)
      return slide(dark(RD.charcoal), [
        eyebrow('3:14 am', L.top(PAD, 60, 800, 30)),
        headline(seed.headline || 'Awake\nagain*.*', L.bottom(PAD, 480, 920, 260), 130, RD.cream, 'headline', { lineHeight: 0.95, letterSpacing: -0.05 }),
        body('Unani calls it a heat imbalance. TCM calls it the liver hour. Modern medicine calls it cortisol. All three suggest the same first move.', L.bottom(PAD, 300, 760, 160), 27),
        cue('It takes four minutes', L.bottom(PAD, 210, 900, 40)),
        ...footer(L, 'sleep · 04', 'dark', seed),
      ])
    },
  },
  /* 6 · The quiz. Answer withheld, comments invited. */
  {
    id: 'rd-quiz', label: 'The quiz', brand: 'remedae',
    build: (format, seed) => {
      const L = layout(format)
      const opts = ['Kampo', 'Ayurveda', 'Unani', 'TCM']
      let x = PAD
      const pills = opts.map((o, i) => { const w = 60 + o.length * 20; const el = pill(o, L.bottom(x, 330, w, 56), false, 'dark', `option${i + 1}`); x += w + 14; return el })
      return slide(photoOr(seed), [
        eyebrow('Guess the tradition', L.top(PAD, 60, 800, 30), 'rgba(255,255,232,0.8)'),
        headline(seed.headline || 'Cardamom, ghee, and a *warm cup* at dusk.', L.bottom(PAD, 490, 920, 240), 74),
        body('Which tradition is this from?', L.bottom(PAD, 420, 900, 40), 24, RD.creamDim, 'kicker'),
        ...pills,
        cue('Say it in the comments', L.bottom(PAD, 210, 900, 40)),
        ...footer(L, 'answer tomorrow', 'dark', seed),
      ])
    },
  },
  /* 7 · The save. Built to be bookmarked: a whole small reference, on cream. */
  {
    id: 'rd-save', noPhoto: true, label: 'The save · cream', brand: 'remedae',
    build: (format, seed) => {
      const L = layout(format)
      const rows = [
        ['TCM', 'Warm water, no ice, all day'],
        ['Ayurveda', 'Triphala, an hour after dinner'],
        ['Unani', 'Fennel steeped, taken slowly'],
        ['Kampo', 'Ginger before, not after'],
        ['Modern', 'Twelve hours between last food and first'],
      ]
      const els: DesignElement[] = []
      rows.forEach(([tr, line], i) => {
        const yb = 560 - i * 78
        els.push(rule(L.bottom(PAD, yb + 66, 920, 2), 'light'))
        const hasPairs = Boolean(seed.itemBodies?.[i]?.trim())
        els.push(t(hasPairs ? item(seed, i, tr) : tr, L.bottom(PAD, yb + 22, 240, 30), { color: RD.forestDim, fontKey: 'sans', fontSize: 22, fontWeight: 500, letterSpacing: 0.14, uppercase: true }, `tradition${i + 1}`))
        els.push(t(hasPairs ? seed.itemBodies![i].trim() : item(seed, i, line), L.bottom(PAD + 260, yb + 16, 660, 44), { color: RD.forest, fontKey: 'serif', fontSize: 30, letterSpacing: -0.03 }, `line${i + 1}`))
      })
      return slide(dark(RD.cream), [
        eyebrow('One gut ache · five answers', L.top(PAD, 60, 800, 30), 'rgba(54,76,63,0.55)'),
        headline(seed.headline || 'Save this for the next time your *stomach turns.*', L.bottom(PAD, 665, 920, 260), 80, RD.forest, 'headline', { hl: '#5a7a64' }),
        ...els,
        t('Traditionally used, not medical advice', L.bottom(PAD, 210, 900, 36), { color: 'rgba(54,76,63,0.65)', fontKey: 'sans', fontSize: 24, fontWeight: 500 }, 'tagline'),
        ...footer(L, 'save for later', 'light', seed),
      ])
    },
  },
  /* 8 · Editorial cover (Figma "Cover Editorial"): full-bleed photo, pills, title, dek, Deep Dive. */
  {
    id: 'rd-cover', label: 'Editorial cover', brand: 'remedae',
    build: (format, seed) => {
      const L = layout(format)
      return slide(photoOr(seed, RD.charcoal), [
        pill('Energy & herbs', L.top(PAD, 64, 320, 56), true, 'dark', 'category'),
        pill('✧  2,500+ years', L.top(700, 64, 300, 56), false, 'dark', 'meta'),
        eyebrow('China · East Asia', L.bottom(PAD, 600, 900, 30), RD.mintDim, 'kicker'),
        headline(seed.headline || 'Traditional Chinese Medicine', L.bottom(PAD, 380, 920, 210), 92, RD.cream, 'headline', { lineHeight: 1.0, letterSpacing: -0.035 }),
        body(seed.dek || 'Two and a half thousand years of moving Qi, kindling the spleen, warming the channels.', L.bottom(PAD, 260, 860, 110), 30, 'rgba(255,255,232,0.85)', 'dek'),
        cue('Deep Dive', L.bottom(PAD, 190, 900, 40), RD.mint),
        ...footer(L, 'remedae.app', 'dark', seed),
      ])
    },
  },
  /* 9 · Editorial split (Figma "Editorial 2"): photo top, cream panel, read time, author. */
  {
    id: 'rd-editorial', noPhoto: true, label: 'Editorial split', brand: 'remedae',
    build: (format, seed) => {
      const L = layout(format)
      const photoH = format === 'story' ? 820 : format === 'square' ? 420 : 570
      const top = seed.coverImage?.trim()
        ? img(seed.coverImage.trim(), L.top(0, 0, L.W, photoH), 0, 'cover')
        : shape(L.top(0, 0, L.W, photoH), RD.forest)
      const y0 = photoH + 62 // where the panel content starts (from top)
      return slide(dark(RD.cream), [
        top,
        pill('TCM, in plain English', L.top(PAD, y0, 420, 56), false, 'light', 'category'),
        pill('11 min read', L.top(520, y0, 240, 56), false, 'light', 'meta'),
        headline(seed.headline || 'Kampo, in English. Why Japan still writes its own prescriptions.', L.top(PAD, y0 + 96, 920, 240), 66, RD.forest, 'headline', { hl: '#5a7a64', lineHeight: 1.04, letterSpacing: -0.03 }),
        body(seed.dek || 'Japan is the only country in the world where a doctor can prescribe you a 1,800-year-old herbal formula and your national health…', L.bottom(PAD, 236, 920, 120), 27, 'rgba(54,76,63,0.85)', 'dek'),
        rule(L.bottom(PAD, 200, 920, 2), 'light'),
        t('Yuko Tanaka', L.bottom(PAD, 150, 500, 30), { color: RD.forestDim, fontKey: 'sans', fontSize: 24, letterSpacing: 0.18, uppercase: true }, 'author'),
        t('Read  ›', L.bottom(760, 148, 240, 34), { color: RD.forest, fontKey: 'sans', fontSize: 28, fontWeight: 500, align: 'right' }, 'tagline'),
        ...footer(L, 'remedae.app', 'light', seed),
      ])
    },
  },
  /* 10 · Quick glance (Figma): a titled list of remedy cards. */
  {
    id: 'rd-glance', noPhoto: true, label: 'Quick glance', brand: 'remedae',
    build: (format, seed) => {
      const L = layout(format)
      const cards = [
        ['Ayurveda · Drink', 'Fennel & coriander infusion', 'Gentle after-meal tea. Warming, carminative.'],
        ['Ayurveda · Herbal', 'Triphala at night', 'Traditional tridoshic formula for elimination.'],
        ['Unani · Herbal', 'Honey & black seed', 'Spoonful on waking, in colder months.'],
        ['Modern · Breathwork', '4-7-8 breath before meals', 'Lowers sympathetic tone; steadies digestion.'],
      ]
      const n = format === 'square' ? 3 : 4
      const els: DesignElement[] = []
      cards.slice(0, n).forEach(([tag, name, line], i) => {
        const yb = 140 + (n - 1 - i) * 184 + 60
        els.push(shape(L.bottom(93, yb, 894, 168), 'rgba(54,76,63,0.42)', { radiusPx: 22, border: '2px solid rgba(166,216,147,0.14)' }))
        const thumb = seed.itemImages?.[i]?.trim()
        els.push(thumb ? img(thumb, L.bottom(120, yb + 26, 116, 116), 14, `thumb${i + 1}`) : shape(L.bottom(120, yb + 26, 116, 116), 'rgba(166,216,147,0.18)', { radiusPx: 14 }))
        els.push(t(tag, L.bottom(260, yb + 118, 600, 24), { color: RD.mintDim, fontKey: 'sans', fontSize: 20, fontWeight: 500, letterSpacing: 0.16, uppercase: true }, `tag${i + 1}`))
        els.push(t(item(seed, i, name), L.bottom(260, yb + 72, 640, 44), { color: RD.cream, fontKey: 'serif', fontSize: 34, letterSpacing: -0.02 }, `item${i + 1}`))
        els.push(t(seed.itemBodies?.[i]?.trim() || line, L.bottom(260, yb + 34, 640, 30), { color: RD.creamDim, fontKey: 'sans', fontSize: 22, fontWeight: 300 }, `line${i + 1}`))
        els.push(t('›', L.bottom(930, yb + 66, 40, 40), { color: RD.creamFaint, fontKey: 'sans', fontSize: 34, align: 'right' }))
      })
      return slideCentered(format, seed, els)
    },
  },
  /* 11 · Recipe card (Figma "Recipe"): tradition header, remedy, meta row, need / how. */
  {
    id: 'rd-recipe', noPhoto: true, label: 'Recipe card', brand: 'remedae',
    build: (format, seed) => {
      const L = layout(format)
      const cardH = format === 'square' ? 700 : 830
      const cardTop = format === 'story' ? 470 : format === 'square' ? 300 : 378
      const y = (px: number) => cardTop + px
      const els: DesignElement[] = [
        headline(seed.headline || 'What the world\'s healing systems say about: *Gut Ache*', L.top(120, 100, 840, 200), 60, RD.cream, 'headline', { align: 'center', lineHeight: 1.08 }),
        shape(L.top(79, cardTop, 922, cardH), 'rgba(54,76,63,0.42)', { radiusPx: 22, border: '2px solid rgba(166,216,147,0.12)' }),
        // header
        seed.itemImages?.[0]?.trim() ? img(seed.itemImages[0].trim(), L.top(112, y(36), 88, 88), 12, 'avatar') : shape(L.top(112, y(36), 88, 88), 'rgba(166,216,147,0.2)', { radiusPx: 12 }),
        t('Ayurveda', L.top(264, y(30), 500, 50), { color: RD.cream, fontKey: 'serif', fontSize: 44, letterSpacing: -0.02 }, 'tradition'),
        t('South Asia · c. 1500 BCE', L.top(264, y(96), 500, 24), { color: RD.mintDim, fontKey: 'sans', fontSize: 20, letterSpacing: 0.16, uppercase: true }, 'origin'),
        pill('●  Anecdotal reports', L.top(700, y(50), 260, 50), false, 'dark', 'evidence'),
        // remedy
        t(item(seed, 0, 'Warm lemon water on waking.'), L.top(176, y(250), 760, 60), { color: RD.cream, fontKey: 'serif', fontSize: 46, letterSpacing: -0.02 }, 'remedy'),
        body(seed.dek || 'Boil water, let cool to sipping temperature, squeeze in half a lemon. Drink slowly before anything else, said to open the srotas and prepare agni for the day.', L.top(176, y(320), 752, 120), 24, RD.creamDim, 'method'),
        // meta row
        ...(['Time', '5 min', 'Type', 'Morning drink', 'Daily', 'Once'].map((s, i) => {
          const col = Math.floor(i / 2), isLabel = i % 2 === 0
          const x = 176 + [0, 200, 480][col]
          return t(s, L.top(x, y(isLabel ? 484 : 516), 240, isLabel ? 24 : 40), isLabel
            ? { color: RD.mintDim, fontKey: 'sans', fontSize: 20, letterSpacing: 0.16, uppercase: true }
            : { color: RD.cream, fontKey: 'serif', fontSize: 30, letterSpacing: -0.02 }, isLabel ? undefined : `meta${col + 1}`)
        })),
        // two columns
        t('You\'ll need', L.top(176, y(600), 340, 24), { color: RD.mintDim, fontKey: 'sans', fontSize: 20, letterSpacing: 0.16, uppercase: true }),
        t('•  250ml filtered water\n•  ½ fresh lemon\n•  Optional: pinch of rock salt', L.top(176, y(640), 360, 140), { color: RD.cream, fontKey: 'sans', fontSize: 22, fontWeight: 300, lineHeight: 1.9 }, 'need'),
        t('How to do it', L.top(560, y(600), 340, 24), { color: RD.mintDim, fontKey: 'sans', fontSize: 20, letterSpacing: 0.16, uppercase: true }),
        t('01  Boil water; let cool 2 min\n02  Squeeze lemon directly in\n03  Sip slowly, before food or tea', L.top(560, y(640), 400, 140), { color: RD.cream, fontKey: 'sans', fontSize: 22, fontWeight: 300, lineHeight: 1.9, hl: RD.mint }, 'how'),
        ...footer(L, 'recipe · not medical advice', 'dark', seed),
      ]
      return slide(dark(), els)
    },
  },
  /* 12 · Pull quote. */
  {
    id: 'rd-quote', noPhoto: true, label: 'Pull quote', brand: 'remedae',
    build: (format, seed) => {
      const L = layout(format)
      return slide(dark(), [
        t('“', L.top(PAD - 8, 120, 300, 200), { color: 'rgba(166,216,147,0.18)', fontKey: 'serif', fontSize: 240, lineHeight: 0.6 }),
        headline(seed.headline || 'Your dadi made you *haldi doodh* when you couldn\'t sleep.', L.bottom(PAD, 420, 920, 400), 58, RD.cream, 'headline', { lineHeight: 1.18, letterSpacing: -0.025 }),
        shape(L.bottom(PAD, 330, 40, 2), RD.mint),
        t('She wasn\'t guessing.', L.bottom(PAD + 60, 318, 800, 30), { color: RD.creamDim, fontKey: 'sans', fontSize: 24, letterSpacing: 0.04 }, 'tagline'),
        ...footer(L, 'from the editors', 'dark', seed),
      ])
    },
  },
  /* 13 · Remedy spotlight: one word, set enormous. */
  {
    id: 'rd-remedy', label: 'Remedy spotlight', brand: 'remedae',
    build: (format, seed) => {
      const L = layout(format)
      return slide(photoOr(seed), [
        eyebrow('Remedy · 037', L.top(PAD, 60, 800, 30)),
        headline(first(seed.headline || 'Ginger', 2) + '*.*', L.bottom(PAD, 470, 920, 220), 200, RD.cream, 'headline', { lineHeight: 0.92, letterSpacing: -0.05 }),
        t('Zingiber officinale', L.bottom(PAD, 420, 900, 36), { color: RD.creamDim, fontKey: 'serif', fontSize: 30, italic: true }, 'kicker'),
        body(seed.dek || 'For nausea. For motion. For the cold edge of a winter morning.', L.bottom(PAD, 320, 700, 80), 28, 'rgba(255,255,232,0.72)', 'dek'),
        cue('Read the remedy', L.bottom(PAD, 210, 900, 40)),
        ...footer(L, 'remedae.app', 'dark', seed),
      ])
    },
  },
  /* 14 · Evidence card: what the research finds / doesn't yet show. */
  {
    id: 'rd-evidence', noPhoto: true, label: 'Evidence card', brand: 'remedae',
    build: (format, seed) => {
      const L = layout(format)
      return slide(dark(), [
        eyebrow('Reading the research', L.top(PAD, 60, 800, 30)),
        headline(seed.headline || 'What we know about *magnesium.*', L.bottom(PAD, 720, 920, 200), 70, RD.cream, 'headline', { lineHeight: 1.0 }),
        shape(L.bottom(PAD, 470, 920, 200), 'rgba(166,216,147,0.06)', { radiusPx: 14, border: '2px solid rgba(166,216,147,0.18)' }),
        t('What the research finds', L.bottom(PAD + 28, 620, 800, 24), { color: RD.mint, fontKey: 'sans', fontSize: 20, letterSpacing: 0.22, uppercase: true }),
        t(item(seed, 0, 'Glycinate, an hour before bed, improved sleep onset in a 2022 trial.'), L.bottom(PAD + 28, 500, 860, 100), { color: RD.cream, fontKey: 'serif', fontSize: 27, lineHeight: 1.3 }, 'finds'),
        shape(L.bottom(PAD, 250, 920, 200), 'rgba(255,255,232,0.04)', { radiusPx: 14, border: '2px solid rgba(255,255,232,0.1)' }),
        t('What it doesn\'t yet show', L.bottom(PAD + 28, 400, 800, 24), { color: RD.creamFaint, fontKey: 'sans', fontSize: 20, letterSpacing: 0.22, uppercase: true }),
        t(item(seed, 1, 'Whether other forms carry the same benefit. Trials are small.'), L.bottom(PAD + 28, 280, 860, 100), { color: RD.cream, fontKey: 'serif', fontSize: 27, lineHeight: 1.3 }, 'gap'),
        ...footer(L, 'evidence · sources in caption', 'dark', seed),
      ])
    },
  },
  /* 15 · Rhythmic type: three words, three rules. */
  {
    id: 'rd-rhythm', noPhoto: true, label: 'Three words', brand: 'remedae',
    build: (format, seed) => {
      const L = layout(format)
      const words = (seed.headline || 'Sleep. Sun. Breath.').replace(/\.$/, '').split(/[.,\n]+/).map((w) => w.trim()).filter(Boolean).slice(0, 3)
      while (words.length < 3) words.push(['Sleep', 'Sun', 'Breath'][words.length])
      const els: DesignElement[] = []
      words.forEach((w, i) => {
        const yb = 560 - i * 190
        els.push(rule(L.bottom(PAD, yb + 176, 920, 2)))
        els.push(t(`${w}*.*`, L.bottom(PAD, yb + 30, 800, 130), { color: RD.cream, fontKey: 'serif', fontSize: 136, lineHeight: 0.9, letterSpacing: -0.05, hl: RD.mint }, `word${i + 1}`))
        els.push(t(`0${i + 1}`, L.bottom(900, yb + 40, 100, 30), { color: 'rgba(166,216,147,0.55)', fontKey: 'sans', fontSize: 22, letterSpacing: 0.18, align: 'right' }))
      })
      els.push(rule(L.bottom(PAD, 560 - 2 * 190 + 4, 920, 2)))
      return slide(dark(), [
        eyebrow('The cheapest medicine', L.top(PAD, 60, 800, 30)),
        ...els,
        ...footer(L, 'three remedies, free', 'dark', seed),
      ])
    },
  },
  /* 16 · Six traditions opener: six names, one ache, a promise of order. */
  {
    id: 'rd-six', noPhoto: true, label: 'Six traditions', brand: 'remedae', formats: ['carousel', 'portrait', 'story'],
    build: (format, seed) => {
      const L = layout(format)
      const names = ['TCM', 'Ayurveda', 'Unani', 'Kampo', 'Native American', 'Modern medicine']
      const els: DesignElement[] = []
      names.forEach((n, i) => {
        const col = i % 2, row = Math.floor(i / 2)
        const x = PAD + col * 480, yb = 470 - row * 84
        els.push(rule(L.bottom(x, yb + 76, 440, 2)))
        els.push(t(`0${i + 1}`, L.bottom(x, yb + 32, 40, 24), { color: 'rgba(166,216,147,0.5)', fontKey: 'sans', fontSize: 20, fontWeight: 500 }))
        els.push(t(item(seed, i, n), L.bottom(x + 50, yb + 22, 390, 44), { color: 'rgba(255,255,232,0.88)', fontKey: 'serif', fontSize: 36, letterSpacing: -0.03 }, `item${i + 1}`))
      })
      return slide(dark(), [
        eyebrow('One ache · six answers', L.top(PAD, 60, 800, 30)),
        headline(seed.headline || 'Six traditions.\nOne gut ache.\n*What they each say.*', L.bottom(PAD, 600, 920, 300), 84),
        ...els,
        cue('Start with TCM', L.bottom(PAD, 210, 600, 40)),
        ...footer(L, '1 of 7', 'dark', seed),
      ])
    },
  },
  /* 17 · Short / Reel cover: practitioner, hook quote, duration. */
  {
    id: 'rd-short', label: 'Short cover', brand: 'remedae', formats: ['story', 'portrait', 'square'],
    build: (format, seed) => {
      const L = layout(format)
      return slide(photoOr(seed, RD.charcoal), [
        shape(L.top(PAD, 56, 46, 46), 'transparent', { radiusPx: 999, border: `2px solid ${RD.mint}` }),
        t('▶', L.top(PAD + 13, 66, 30, 30), { color: RD.mint, fontKey: 'sans', fontSize: 20 }),
        eyebrow('Shorts · Ayurveda', L.top(PAD + 66, 66, 700, 30), 'rgba(255,255,232,0.85)'),
        headline(seed.headline || 'Everyone gets the *turmeric* part wrong.', L.bottom(PAD, 320, 920, 320), 92),
        shape(L.bottom(PAD, 262, 40, 2), RD.mint),
        t('Dr Radhi N. · BAMS, 14 years practising', L.bottom(PAD + 60, 250, 840, 30), { color: 'rgba(255,255,232,0.75)', fontKey: 'sans', fontSize: 24, fontWeight: 300 }, 'author'),
        ...footer(L, '60 seconds', 'dark', seed),
      ])
    },
  },
  /* 18 · Remedae+ promo: the one place the yellow appears. */
  {
    id: 'rd-plus', noPhoto: true, label: 'Remedae+ promo', brand: 'remedae',
    build: (format, seed) => {
      const L = layout(format)
      return slide(dark(), [
        { id: eid('p'), type: 'pill', box: L.top(PAD, 60, 260, 56), content: '●  Remedae +', role: 'category', style: { fontKey: 'sans', fontSize: 22, fontWeight: 500, letterSpacing: 0.2, uppercase: true, italic: false, align: 'left', color: RD.yellow, bg: 'transparent', border: `2px solid ${RD.yellow}`, radiusPx: 999 } },
        headline(seed.headline || 'A quiet\npractice,\n*kept by you.*', L.bottom(PAD, 380, 920, 420), 124, RD.cream, 'headline', { hl: RD.yellow, lineHeight: 0.94, letterSpacing: -0.05 }),
        t(seed.dek || '14 days free, then £9 a month.', L.bottom(PAD, 300, 900, 40), { color: RD.creamDim, fontKey: 'serif', fontSize: 28, italic: true }, 'dek'),
        cue('Start free', L.bottom(PAD, 210, 900, 40), RD.yellow),
        ...footer(L, 'remedae +', 'dark', seed),
      ])
    },
  },
]

/* Quick glance is centered on the top block; a helper keeps that readable. */
function slideCentered(format: InstaFormat, seed: TemplateSeed, cards: DesignElement[]): Slide {
  const L = layout(format)
  return slide(dark(), [
    t('Global remedies', L.top(PAD, 118, 920, 30), { color: RD.mintDim, fontKey: 'sans', fontSize: 24, fontWeight: 500, letterSpacing: 0.22, uppercase: true, align: 'center' }, 'eyebrow'),
    headline(seed.headline || '5 remedies for *Gut Ache*', L.top(PAD, 158, 920, 90), 72, RD.cream, 'headline', { align: 'center', lineHeight: 1.04 }),
    t(seed.dek || 'Two and a half thousand years of moving Qi, kindling the spleen, warming the channels.', L.top(140, 318, 800, 90), { color: RD.creamDim, fontKey: 'sans', fontSize: 28, fontWeight: 300, lineHeight: 1.5, align: 'center' }, 'dek'),
    ...cards,
    ...footer(L, 'save for later', 'dark', seed),
  ])
}

/* ============================================================
   Carousel body + end slides
   ============================================================ */

/** Slides 2..N. Number and (optional) tradition up top, one heading, one
    short body, hairline, footer. With a photo the image takes the top
    half and the type sits below on the ground. */
export function buildRemedaeContentSlide(format: InstaFormat, input: ContentSlideInput & { index: number; total: number; seed: TemplateSeed }): Slide {
  const L = layout(format)
  const { index, total, heading, body: text, image, seed } = input
  // Slide numbers count the cover and the closing slide too.
  const pos = index + 2, all = total + 2
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n))
  const num = `${pad(pos)} / ${pad(all)}`
  const photo = image?.trim()
  const els: DesignElement[] = []
  if (photo) {
    const photoH = format === 'story' ? 900 : format === 'square' ? 440 : 660
    els.push(img(photo, L.top(0, 0, L.W, photoH), 0, 'image'))
    // A soft fade so the photo settles into the ground rather than cutting.
    els.push(shape(L.top(0, photoH - 120, L.W, 122), 'linear-gradient(180deg, rgba(14,26,18,0) 0%, #0e1a12 100%)'))
    els.push(t(num, L.top(PAD, photoH + 24, 600, 30), { color: RD.mint, fontKey: 'sans', fontSize: 22, fontWeight: 500, letterSpacing: 0.18 }, 'index'))
  } else {
    els.push(t(num, L.top(PAD, 60, 600, 30), { color: RD.mint, fontKey: 'sans', fontSize: 22, fontWeight: 500, letterSpacing: 0.18 }, 'index'))
    const p = Math.round((pos / all) * 100)
    els.push(shape(L.top(0, 0, L.W, 6), `linear-gradient(90deg, ${RD.mint} ${p}%, rgba(166,216,147,0.18) ${p}%)`))
  }
  // Bottom-anchored blocks: heading sits just above the rule, body just below.
  const hSize = photo ? 58 : 64
  const hText = heading || `Point ${index + 1}`
  const hH = Math.min(4, linesFor(hText, hSize, 920)) * hSize * 1.04
  els.push(headline(hText, L.bottom(PAD, 384, 920, hH), hSize, RD.cream, 'heading', { lineHeight: 1.04, letterSpacing: -0.03 }))
  els.push(shape(L.bottom(PAD, 356, 40, 2), RD.mint))
  els.push(body(text || '', L.bottom(PAD, 210, 860, 130), 28, 'rgba(255,255,232,0.78)', 'body'))
  els.push(...footer(L, `${pos} / ${all}`, 'dark', seed))
  return slide(dark(), els)
}

/** Closing slide: where to read the whole piece. Carousels that end on a
    clear next step keep saves and profile visits; this one is built for
    "save" + "link in bio". */
export function buildRemedaeEndSlide(format: InstaFormat, seed: TemplateSeed, total: number): Slide {
  const L = layout(format)
  const site = (seed.website || 'remedae.app').replace(/^https?:\/\//, '')
  return slide(dark(RD.charcoal), [
    eyebrow('The whole story', L.top(PAD, 60, 800, 30)),
    headline(`Read the full piece on *${site}*`, L.bottom(PAD, 420, 920, 300), 84),
    body(seed.headline || '', L.bottom(PAD, 330, 860, 80), 27, RD.creamDim, 'dek'),
    cue('Link in bio', L.bottom(PAD, 260, 600, 40)),
    t('Save this for later  ✧', L.bottom(PAD, 210, 600, 34), { color: RD.creamFaint, fontKey: 'sans', fontSize: 24, fontWeight: 500 }, 'kicker'),
    ...footer(L, `${total} / ${total}`, 'dark', seed),
  ])
}

/** The template a Remedae draft opens in. Photo-led drafts (article heroes,
    daily posts) start on the editorial cover; text drafts on the question. */
export function remedaeDefaultTemplate(format: InstaFormat, hasImage: boolean): string {
  if (format === 'story') return 'rd-short'
  if (format === 'carousel') return hasImage ? 'rd-cover' : 'rd-six'
  return hasImage ? 'rd-cover' : 'rd-question'
}

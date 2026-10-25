// ============================================================================
// The three post families, one per brand, as HTML slides at 1080 x 1350.
// Each follows the style its own brand chat defined:
//   Hue & Heal   the new website's type and colour (Newsreader and Poppins, the screen's
//                near black, the room halos) on the Brand Figma's post structures
//   Remedae      the Remedae Instagram system (docs/remedae-social-system.md,
//                src/lib/social/remedae.ts): forest ground, Quando headlines with one
//                mint *phrase*, Poppins, one cue ending in ›, the mark bottom-left
//   Moss Island  the Moss Island social set (its social-marketing.md "Grid look" and
//                the launch posts): teal sky, Newsreader titles, glass rows, cream
//                the game's own quest cards (moss-cards.mjs) on the category colour
// A slide is { kind, eyebrow, kicker, title, body, note, items: [{ title, text }],
// quest_id, cta, image_url }. Unknown kinds fall back to the brand's statement or
// closing slide. Asset URLs are served by render.mjs: /moss/... (Moss Island's
// art), /copilot/... (Copilot's public folder), /card/<id>.png (captured cards).
// ============================================================================
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
/** *phrase* becomes the brand's highlight. */
const hl = (s, open, close) => esc(s).replace(/\*([^*]+)\*/g, `${open}$1${close}`)
const plain = (s) => esc(String(s ?? '').replace(/\*/g, ''))

const FONTS = 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..500;1,6..72,200..500&family=Poppins:wght@300;400;500;600;700&family=Quando&display=block'
/* Shrinks any [data-fit] element until it fits its max height, so long titles never spill. */
const FIT = `<script>
document.fonts.ready.then(() => {
  for (const el of document.querySelectorAll('[data-fit]')) {
    const max = Number(el.dataset.fit); let fs = parseFloat(getComputedStyle(el).fontSize)
    while (el.scrollHeight > max && fs > 22) { fs -= 2; el.style.fontSize = fs + 'px' }
  }
  document.body.dataset.ready = '1'
})
</script>`
const page = (css, body, bg) => `<!doctype html><html><head><meta charset="utf-8"><link href="${FONTS}" rel="stylesheet"><style>
*{box-sizing:border-box;margin:0;padding:0}html,body{width:1080px;height:1350px;overflow:hidden}
body{position:relative;background:${bg}}${css}</style></head><body>${body}${FIT}</body></html>`

/* ---------------------------------------------------------------- Hue & Heal */
// Set from the new website (hueandheal.com: src/styles/global.css, docs/COLOUR-SYSTEM.md,
// the Halo cards of the Design Your Next Chapter deck) and laid out on the post
// structures of the Hue & Heal Brand Figma (qDrGcT3SPOrIuEiVaiBw0E, 170:1124):
// cinematic photos fading to the screen's near black, a tracked eyebrow, a centred
// stack, a glass pill, "Swipe to see how", the halo ring on black for pauses and
// labelled "Experience:" lines on example slides.
// Two voices, as on the site: Newsreader (variable, opsz) for every title, lede and
// cue; Poppins for body copy and small text. The font files are the site's own
// (@fontsource 5.3, OFL), served by render.mjs from ./hh. The type system, one
// 1.25 scale on a 34px base, is documented in TYPE-SYSTEM.md beside the concepts.
const HH = {
  ground: '#07080b',            // the Halo card black (site .hh-card); the photo fades end here
  ink: '#ece7dd',               // --screen, primary type
  ink2: 'rgba(236,231,221,.86)', // body over photography
  mute: '#a9a398',              // --mute, secondary type (8.1:1)
  em: '#fff8ef',                // the emphasis on a photograph (site .ah__title em)
  sig: 'linear-gradient(95deg,#f2a98e 0%,#d49bc9 50%,#9fb6ee 100%)', // --em, the signature word on dark
  k: '#c7b9e6',                 // --k, the site's label colour when no room is named
}
/* The three rooms, from the site's halo tokens: accent (type safe), depth, complement. */
const ROOMS = {
  studio: { a: '#d98a6c', d: '#9c4a2f', c: '#a3a88c', lock: 'hue-heal-studio.svg' },
  lab: { a: '#8db59c', d: '#2f6a52', c: '#b58a71', lock: 'hue-heal-lab.svg' },
  mind: { a: '#aeb2da', d: '#76789d', c: '#dabfb4', lock: 'hue-heal-mind.svg' },
}
const HH_MARK = readFileSync(join(here, 'hh-wordmark.txt'), 'utf8').trim()
const lockup = (room) => {
  try { const svg = readFileSync(join(here, 'hh', ROOMS[room].lock), 'utf8'); return { d: svg.match(/ d="([^"]+)"/)[1], vb: svg.match(/viewBox="([^"]+)"/)[1] } } catch { return null }
}
const LOCKS = Object.fromEntries(Object.keys(ROOMS).map((r) => [r, lockup(r)]))
/** The wordmark, or the room's own lockup (hue&heal: Studio) when the room is known. */
const hhWordmark = (h, room, c = HH.ink) => {
  const l = room && LOCKS[room]
  const vb = l ? l.vb : '0 0 549 107'
  const [, , w, vh] = vb.split(' ').map(Number)
  return `<svg viewBox="${vb}" style="height:${Math.round((h * vh) / 107)}px;width:${Math.round((h * w) / 107)}px;display:block;margin:0 auto" fill="${c}"><path d="${l ? l.d : HH_MARK}"/></svg>`
}
/** Which room a slide belongs to: kicker studio|lab|mind on pause, statement and close, else read from the eyebrow. */
function roomOf(s) {
  const k = String(s.kicker || '').trim().toLowerCase()
  if (ROOMS[k]) return k
  const e = String(s.eyebrow || '').toLowerCase()
  if (/coach|mind|chapter|creativ/.test(e)) return 'mind'
  if (/\blab\b|remedae|moss island|product/.test(e)) return 'lab'
  if (/experience design|studio|founder|wellness design|hospitality|guest|spa|hotel/.test(e)) return 'studio'
  return ''
}
const F = '/hh/fonts/'
const HH_CSS = `
@font-face{font-family:'HH Serif';src:url(${F}newsreader-latin-opsz-normal.woff2) format('woff2');font-weight:200 800;font-style:normal;font-display:block}
@font-face{font-family:'HH Serif';src:url(${F}newsreader-latin-opsz-italic.woff2) format('woff2');font-weight:200 800;font-style:italic;font-display:block}
${[300, 400, 500, 600].map((w) => `@font-face{font-family:'HH Sans';src:url(${F}poppins-latin-${w}-normal.woff2) format('woff2');font-weight:${w};font-display:block}`).join('\n')}
body{color:${HH.ink};font-family:'HH Sans',Poppins,sans-serif;font-weight:300;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;font-kerning:normal}
/* ---- The scale: 1.25 on 36px. 29 36 45 56 70 88 110 138 172 ---- */
.ey{position:absolute;left:80px;right:80px;top:68px;text-align:center;font-weight:500;font-size:26px;line-height:1.3;letter-spacing:.24em;text-transform:uppercase;color:rgba(236,231,221,.8);text-wrap:balance}
.kick{font-weight:500;font-size:45px;line-height:1.2;letter-spacing:-.005em}
.d{font-family:'HH Serif',serif;font-weight:300;font-variation-settings:'opsz' 72;text-wrap:balance;padding-bottom:.08em;margin-bottom:-.08em}
.d em{font-style:italic;font-weight:300;padding-right:.04em}
.xl{font-size:172px;line-height:.94;letter-spacing:-.032em}
.l{font-size:110px;line-height:.98;letter-spacing:-.026em}
.m{font-size:88px;line-height:1.04;letter-spacing:-.02em}
.lede{font-family:'HH Serif',serif;font-weight:350;font-variation-settings:'opsz' 36;font-size:45px;line-height:1.28;letter-spacing:-.01em;text-wrap:pretty}
.body{font-weight:300;font-size:36px;line-height:1.5;letter-spacing:-.005em;color:${HH.ink2};text-wrap:pretty}
.lbl{font-weight:500;color:var(--a);letter-spacing:.005em}
.cue{position:absolute;left:0;right:0;bottom:62px;display:flex;justify-content:center;align-items:center;gap:18px;font-family:'HH Serif',serif;font-style:italic;font-weight:300;font-variation-settings:'opsz' 36;font-size:36px;line-height:1;color:rgba(236,231,221,.8)}
.cue i{position:relative;width:54px;height:1.5px;background:currentColor;top:2px}
.cue i::after{content:'';position:absolute;right:0;top:-5px;width:11px;height:11px;border-top:1.5px solid currentColor;border-right:1.5px solid currentColor;transform:rotate(45deg)}
.pill{display:inline-block;padding:16px 36px 18px;border-radius:999px;font-weight:500;font-size:29px;line-height:1.2;letter-spacing:.005em;color:${HH.ink};
  background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.04)),rgba(8,9,12,.34);backdrop-filter:blur(28px) saturate(1.35);
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.2),inset 0 1.5px 0 rgba(255,255,255,.3),0 30px 60px -30px rgba(0,0,0,.6)}
.cta{font-weight:500;font-size:36px;line-height:1.3;color:var(--a);letter-spacing:.005em}
/* ---- Grounds ---- */
.photo{position:absolute;inset:0;background-size:cover;background-position:center}
.photo::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,8,11,.6) 0px,rgba(7,8,11,0) 240px,rgba(7,8,11,0) calc(var(--t,760px) - 340px),rgba(7,8,11,.5) calc(var(--t,760px) - 130px),rgba(7,8,11,.82) calc(var(--t,760px) + 60px),rgba(7,8,11,.94) calc(var(--t,760px) + 280px),${HH.ground} 100%)}
.on-photo{text-shadow:0 0 26px rgba(5,6,8,.6),0 0 3px rgba(5,6,8,.4)}
.on-photo .d em{color:${HH.em}}
.on-dark .d em{background:${HH.sig};-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-box-decoration-break:clone;box-decoration-break:clone}
/* The room mist (site .halo), still: main, depth and complement in soft light. */
.mist{position:absolute;left:50%;top:var(--y,46%);width:1400px;height:1400px;transform:translate(-50%,-50%);filter:blur(36px) saturate(1.05);opacity:.9;
  background:radial-gradient(30% 24% at 40% 58%,color-mix(in oklab,var(--a) 40%,transparent),transparent 70%),radial-gradient(26% 28% at 62% 50%,color-mix(in oklab,var(--dd) 46%,transparent),transparent 72%),radial-gradient(22% 16% at 52% 68%,color-mix(in oklab,var(--c) 12%,transparent),transparent 70%)}
/* The halo ring of the Halo cards: a dark centre with light gathering at its edge. */
.ring{position:absolute;left:50%;top:var(--y,47%);width:var(--w,1000px);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;
  background:radial-gradient(closest-side,${HH.ground} 56%,color-mix(in oklab,var(--a) 45%,${HH.ground}) 60%,color-mix(in oklab,var(--a) 80%,${HH.ground}) 64.5%,color-mix(in oklab,var(--a) 45%,${HH.ground}) 75%,color-mix(in oklab,var(--a) 14%,${HH.ground}) 88%,${HH.ground} 100%)}
.stack{position:absolute;left:80px;right:80px;text-align:center}
.stack > *{margin-left:auto;margin-right:auto}
.left{position:absolute;left:80px;right:80px;text-align:left}
`
/* A fit that keeps a role's size unless the copy is long: steps down to a floor until the
   block fits its height and no word overflows the measure. It runs before the shared FIT. */
const HH_FIT = `<script>
for (const f of ['300 100px "HH Serif"', 'italic 300 100px "HH Serif"', '350 40px "HH Serif"', '300 34px "HH Sans"', '500 34px "HH Sans"']) document.fonts.load(f)
document.fonts.ready.then(() => {
  for (const el of document.querySelectorAll('[data-hh]')) {
    const [maxH, min] = el.dataset.hh.split(',').map(Number)
    let fs = parseFloat(getComputedStyle(el).fontSize)
    const over = () => el.scrollHeight > maxH + 2 || el.scrollWidth > el.clientWidth + fs * 0.15
    while (over() && fs > min) { fs = Math.max(min, fs * 0.96); el.style.fontSize = fs.toFixed(1) + 'px' }
    // A short title that breaks onto a second line for one word is drawn back onto one line,
    // if that costs no more than an eighth of its size.
    if (el.hasAttribute('data-one')) {
      const lh = () => parseFloat(getComputedStyle(el).lineHeight), base = fs
      if (el.getBoundingClientRect().height > lh() * 1.6 && el.getBoundingClientRect().height < lh() * 2.6) {
        let f = base
        while (f > base * 0.875 && el.getBoundingClientRect().height > lh() * 1.6) { f -= 1; el.style.fontSize = f + 'px' }
        if (el.getBoundingClientRect().height > lh() * 1.6) el.style.fontSize = base + 'px'
      }
    }
  }
  // The photo darkens just above where the words begin, so a tall stack is never left on bare photograph.
  const txt = document.querySelector('[data-text]'), ph = document.querySelector('.photo')
  if (txt && ph) ph.style.setProperty('--t', Math.round(txt.getBoundingClientRect().top) + 'px')
})
</script>`
/* Typographer's quotes: ' becomes ’ and "x" becomes “x”. */
const curly = (t) => String(t ?? '').replace(/(^|[\s(])"/g, '$1\u201c').replace(/"/g, '\u201d').replace(/(^|[\s(])'/g, '$1\u2018').replace(/'/g, '\u2019')
const em = (t) => hl(curly(t), '<em>', '</em>')
const txt = (t) => plain(curly(t))
const hhEyebrow = (t) => (t ? `<p class="ey">${txt(t)}</p>` : '')
const hhCue = (t) => (t ? `<p class="cue on-photo"><span>${txt(t).replace(/\s*(-+>|⟶|→|›)\s*$/, '')}</span><i></i></p>` : '')
const BOTTOM = 156 // every photo slide's stack ends on this line, above the cue

function hhSlide(s, ctx) {
  const room = roomOf(s)
  const R = ROOMS[room] ?? { a: HH.k, d: '#76789d', c: '#f2a98e' }
  const vars = `--a:${R.a};--dd:${R.d};--c:${R.c}`
  // The cover takes the post's photo; other slides only their own.
  const photo = s.image_url || (s.kind === 'cover' ? ctx.photo : '')
  const bg = () => (photo ? `<div class="photo" style="background-image:url('${photo}')"></div>` : `<div class="mist" style="--y:50%"></div>`)
  const tone = photo ? 'on-photo' : 'on-dark'
  const wrap = (inner) => `<div style="position:absolute;inset:0;${vars}">${inner}</div>${HH_FIT}`
  switch (s.kind) {
    case 'cover':
      // The series cover: eyebrow; kicker, the title, its tail; a glass pill; the cue.
      return wrap(`${bg()}${hhEyebrow(s.eyebrow)}<div class="stack ${tone}" data-text style="bottom:${BOTTOM}px">
        ${s.kicker ? `<p class="kick" style="margin-bottom:10px">${txt(s.kicker)}</p>` : ''}
        <h1 class="d xl" data-hh="360,104" data-one style="max-width:920px">${em(s.title)}</h1>
        ${s.body ? `<p class="kick" style="margin-top:12px">${txt(s.body)}</p>` : ''}
        ${s.note ? `<p style="margin-top:40px"><span class="pill">${txt(s.note)}</span></p>` : ''}</div>${hhCue(s.cta)}`)
    case 'feature': {
      // One named example: its photo, its name, then labelled lines.
      const rows = (s.items ?? []).slice(0, 3).map((it) => `<p class="body" style="margin-top:.65em;font-size:inherit"><span class="lbl">${txt(it.title)}</span> ${txt(it.text)}</p>`).join('')
      return wrap(`${bg()}${hhEyebrow(s.eyebrow)}<div class="left ${tone}" data-text style="bottom:${BOTTOM}px">
        ${s.kicker ? `<p class="lbl" style="font-size:36px;margin-bottom:14px">${txt(s.kicker)}</p>` : ''}
        <h2 class="d l" data-hh="214,78" data-one style="max-width:920px">${em(s.title)}</h2>
        ${s.body ? `<p class="lede" style="margin-top:22px;color:${HH.ink2}">${txt(s.body)}</p>` : ''}
        <div data-hh="440,30" style="margin-top:8px;font-size:36px;max-width:900px">${rows}</div></div>${hhCue(s.cta)}`)
    }
    case 'tip':
      // One idea in a series: a centred title and three short lines.
      return wrap(`${bg()}${hhEyebrow(s.eyebrow)}<div class="stack ${tone}" data-text style="bottom:${BOTTOM}px">
        <h2 class="d l" data-hh="230,80" data-one style="max-width:920px">${em(s.title)}</h2>
        <p class="body" data-hh="230,30" style="margin-top:30px;max-width:840px;white-space:pre-line">${txt(s.body)}</p></div>${hhCue(s.cta)}`)
    case 'pause':
      // The coaching pause, set like the Halo cards: the word in the ring's dark centre, a prompt beneath it.
      return wrap(`<div class="ring"></div>${hhEyebrow(s.eyebrow)}
        <div class="stack" style="top:47%;transform:translateY(-50%)">
          <h2 class="d" data-hh="240,90" style="font-size:138px;line-height:1;letter-spacing:-.03em;max-width:560px">${em(s.title)}</h2>
          ${s.body ? `<p class="lede" data-hh="180,36" style="margin-top:34px;max-width:500px;color:${HH.mute};text-wrap:balance">${txt(s.body)}</p>` : ''}</div>`)
    case 'statement':
      // A line set large: over its own photo at the foot, or on the room's light, centred.
      return wrap(`${bg()}${hhEyebrow(s.eyebrow)}<div class="stack ${tone}" data-text style="${photo ? `bottom:${BOTTOM}px` : 'top:50%;transform:translateY(-50%)'}">
        <h2 class="d l" data-hh="${photo ? 520 : 640},66" style="max-width:900px">${em(s.title)}</h2>
        ${s.body ? `<p class="lede" style="margin-top:34px;max-width:820px;color:${photo ? HH.ink2 : HH.mute}">${txt(s.body)}</p>` : ''}</div>${hhCue(s.cta)}`)
    default: // close: the question or the call, on the room's light, the lockup below
      return wrap(`<div class="mist" style="--y:44%"></div>${hhEyebrow(s.eyebrow)}<div class="stack on-dark" style="top:45%;transform:translateY(-50%)">
        <h2 class="d m" data-hh="440,62" style="max-width:900px">${em(s.title)}</h2>
        ${s.body ? `<p class="lede" style="margin-top:34px;max-width:760px;color:${HH.mute}">${txt(s.body)}</p>` : ''}
        ${s.cta ? `<p class="cta" style="margin-top:40px">${txt(s.cta)}</p>` : ''}</div>
        <div style="position:absolute;left:0;right:0;bottom:96px">${hhWordmark(44, room)}</div>`)
  }
}

/* ---------------------------------------------------------------- Remedae */
const RD = { ink: '#0e1a12', charcoal: '#1a2b1e', forest: '#364c3f', mint: '#a6d893', cream: '#ffffe8', creamDim: 'rgba(255,255,232,.72)', mintDim: 'rgba(166,216,147,.75)', mintLine: 'rgba(166,216,147,.16)', forestDim: 'rgba(54,76,63,.62)', forestLine: 'rgba(54,76,63,.16)' }
const RD_LOGO = '/copilot/brand/remedae-logo.svg'
const RD_LOGO_INK = '/copilot/brand/remedae-logo-ink.svg'
const RD_CSS = `body{color:${RD.cream};font-family:Poppins,sans-serif;font-weight:300}
.p{position:absolute;inset:0;padding:80px 80px 150px;display:flex;flex-direction:column}
.q{font-family:Quando,Georgia,serif;letter-spacing:-.04em;line-height:.98}
.q em{font-style:italic;color:${RD.mint}}
.cream .q em{color:#5a7a64}
.ey{font-weight:500;font-size:24px;letter-spacing:.22em;text-transform:uppercase;color:${RD.mintDim}}
.body{font-size:30px;line-height:1.5;color:${RD.creamDim}}
.cue{font-weight:500;font-size:30px;color:${RD.creamDim}}.cue b{color:${RD.mint};font-weight:500}
.mark{position:absolute;left:80px;bottom:56px;height:36px}
.pill{display:inline-block;padding:10px 24px;border-radius:999px;font-weight:500;font-size:24px;letter-spacing:.06em;text-transform:uppercase;border:2px solid rgba(255,255,232,.5);background:rgba(10,24,14,.35);margin-right:12px}
.pill.on{color:${RD.mint};border-color:${RD.mint};background:rgba(166,216,147,.12)}
.photo{position:absolute;inset:0;background-size:cover;background-position:center}
.photo::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(14,26,18,.78) 0%,rgba(14,26,18,.25) 30%,rgba(14,26,18,0) 46%,rgba(14,26,18,.97) 100%)}`
const rq = (s) => hl(s, '<em>', '</em>')
const noChevron = (t) => String(t ?? '').replace(/[\s›>»]+$/, '')
const rcue = (t) => (t ? `<p class="cue" style="margin-top:36px">${plain(noChevron(t))}  <b>›</b></p>` : '')

function remedaeSlide(s, ctx) {
  const mark = (ink = false) => `<img class="mark" src="${ink ? RD_LOGO_INK : RD_LOGO}">`
  const idx = ctx.total > 1 && ctx.index > 0 ? `${String(ctx.index + 1).padStart(2, '0')} / ${String(ctx.total).padStart(2, '0')}` : ''
  switch (s.kind) {
    case 'cover':
      return `${s.image_url || ctx.photo ? `<div class="photo" style="background-image:url('${s.image_url || ctx.photo}')"></div>` : ''}<section class="p" style="z-index:1">
        <div>${s.eyebrow ? `<span class="pill on">${plain(s.eyebrow)}</span>` : ''}${s.kicker ? `<span class="pill">${plain(s.kicker)}</span>` : ''}</div>
        <h1 class="q" data-fit="420" style="margin-top:auto;font-size:96px">${rq(s.title)}</h1>
        ${s.body ? `<p class="body" data-fit="140" style="margin-top:26px">${plain(s.body)}</p>` : ''}${rcue(s.cta)}</section>${mark()}`
    case 'question':
      return `<section class="p">${s.eyebrow ? `<p class="ey">${plain(s.eyebrow)}</p>` : ''}
        <h1 class="q" data-fit="700" style="margin-top:auto;font-size:118px">${rq(s.title)}</h1>
        ${s.body ? `<p class="body" style="margin-top:30px">${plain(s.body)}</p>` : ''}${rcue(s.cta)}</section>${mark()}`
    case 'number':
      return `${ctx.photo ? `<div class="photo" style="background-image:url('${ctx.photo}')"></div>` : ''}<section class="p" style="z-index:1">${s.eyebrow ? `<p class="ey">${plain(s.eyebrow)}</p>` : ''}
        <p class="q" data-fit="260" style="margin-top:auto;font-size:250px;line-height:.85;color:${RD.mint}">${plain(s.kicker || s.title)}</p>
        <h2 class="q" data-fit="300" style="margin-top:30px;font-size:64px;line-height:1.04">${rq(s.kicker ? s.title : s.body)}</h2>${rcue(s.cta)}</section>${mark()}`
    case 'remedy':
      // The founder's carousel shape: tradition and region top-left, number top-right,
      // a "for ..." eyebrow, the remedy's name, how plus one fact, a short care note.
      // With its own photo, the photo sits in the top half and settles into the forest.
      return `${s.image_url ? `<div style="position:absolute;left:0;right:0;top:0;height:640px;background:url('${s.image_url}') center/cover"></div><div style="position:absolute;left:0;right:0;top:420px;height:222px;background:linear-gradient(180deg,rgba(14,26,18,0),${RD.ink})"></div><div style="position:absolute;left:0;right:0;top:0;height:200px;background:linear-gradient(180deg,rgba(14,26,18,.7),rgba(14,26,18,0))"></div>` : `<div style="position:absolute;left:0;right:0;top:0;height:6px;background:linear-gradient(90deg,${RD.mint} ${Math.round(((ctx.index + 1) / ctx.total) * 100)}%,rgba(166,216,147,.18) 0)"></div>`}
        <section class="p" style="z-index:1"><div style="display:flex;justify-content:space-between"><p class="ey">${plain(s.eyebrow)}</p><p class="ey" style="color:${RD.mint}">${idx}</p></div>
        ${s.kicker ? `<p class="ey" style="margin-top:auto;color:${RD.creamDim};letter-spacing:.12em">${plain(s.kicker)}</p>` : ''}
        <h2 class="q" data-fit="300" style="${s.kicker ? 'margin-top:20px' : 'margin-top:auto'};font-size:96px">${rq(s.title)}</h2>
        <div style="width:40px;height:2px;background:${RD.mint};margin:34px 0 28px"></div>
        <p class="body" data-fit="260">${plain(s.body)}</p>
        ${s.note ? `<p style="margin-top:24px;font-size:24px;line-height:1.5;color:${RD.mintDim}">${plain(s.note)}</p>` : ''}</section>${mark()}`
    case 'glance': {
      // The save, on cream: a small reference people keep.
      const rows = (s.items ?? []).slice(0, 6).map((it) => `<div style="display:grid;grid-template-columns:250px 1fr;gap:20px;padding:22px 0;border-top:2px solid ${RD.forestLine}"><p style="font-weight:500;font-size:21px;letter-spacing:.12em;text-transform:uppercase;color:${RD.forestDim};padding-top:6px">${plain(it.title)}</p><p style="font-size:28px;line-height:1.4;color:${RD.forest}">${plain(it.text)}</p></div>`).join('')
      return `<section class="p cream">${s.eyebrow ? `<p class="ey" style="color:${RD.forestDim}">${plain(s.eyebrow)}</p>` : ''}
        <h2 class="q" data-fit="300" style="margin:26px 0 40px;font-size:80px;color:${RD.forest}">${rq(s.title)}</h2>${rows}
        ${s.cta ? `<p class="cue" style="margin-top:auto;color:${RD.forest}">${plain(noChevron(s.cta))}  <b style="color:#5a7a64">›</b></p>` : ''}</section>${mark(true)}`
    }
    case 'myth':
      return `<section class="p">${s.eyebrow ? `<p class="ey">${plain(s.eyebrow)}</p>` : ''}
        <p style="margin-top:auto;font-size:40px;line-height:1.35;color:rgba(255,255,232,.45);text-decoration:line-through;text-decoration-color:${RD.mint}">${plain(s.kicker)}</p>
        <h2 class="q" data-fit="520" style="margin-top:40px;font-size:84px">${rq(s.title)}</h2>
        ${s.body ? `<p class="body" style="margin-top:30px">${plain(s.body)}</p>` : ''}${rcue(s.cta)}</section>${mark()}`
    case 'hook': {
      const list = (s.items ?? []).slice(0, 6).map((it, i) => `<p style="display:flex;gap:22px;font-size:28px;line-height:1.4;padding:12px 0;border-top:2px solid ${RD.mintLine}"><span style="color:${RD.mint};font-weight:500;width:40px">${String(i + 1).padStart(2, '0')}</span>${plain(it.title)}</p>`).join('')
      return `<section class="p">${s.eyebrow ? `<p class="ey">${plain(s.eyebrow)}</p>` : ''}
        <h2 class="q" data-fit="360" style="margin-top:${list ? 40 : 'auto'}${list ? 'px' : ''};font-size:90px">${rq(s.title)}</h2>
        ${list ? `<div style="margin-top:auto">${list}</div>` : ''}${rcue(s.cta || 'Save this, and find more at remedae.app')}</section>${mark()}`
    }
    default: // statement
      return `<section class="p">${s.eyebrow ? `<p class="ey">${plain(s.eyebrow)}</p>` : ''}${idx ? `<p class="ey" style="position:absolute;right:80px;top:80px;color:${RD.mint}">${idx}</p>` : ''}
        <h2 class="q" data-fit="420" style="margin-top:auto;font-size:78px;line-height:1.04">${rq(s.title)}</h2>
        <div style="width:40px;height:2px;background:${RD.mint};margin:34px 0 28px"></div>
        <p class="body" data-fit="300">${plain(s.body)}</p>${rcue(s.cta)}</section>${mark()}`
  }
}

/* ---------------------------------------------------------------- Moss Island */
const KIND = {
  MOVE: { name: 'Move', base: '#E2754C', deep: '#9E3F1F', tint: '#FBE3D8' },
  PLAY: { name: 'Play', base: '#F2BE5E', deep: '#87580B', tint: '#FDF0D3' },
  REST: { name: 'Rest', base: '#4E5AAE', deep: '#343C85', tint: '#E3E5F6' },
  CARE: { name: 'Care', base: '#8ED3AF', deep: '#2B6F52', tint: '#E1F3E9' },
  GROW: { name: 'Grow', base: '#2F6E46', deep: '#24563A', tint: '#DDEBE1' },
}
const art = (p) => `/moss/${p}`
const MOSS_CSS = `body{font-family:Poppins,sans-serif;color:#0E2419}
.sky{background:radial-gradient(70% 55% at 50% 42%,#A6D5DA 0%,#7FBFC4 45%,#559EA4 100%)}
.serif{font-family:Newsreader,serif;font-weight:300;letter-spacing:-.01em}
.white{color:#fff;text-shadow:0 2px 18px rgba(14,36,25,.18)}
.pad{position:absolute;inset:0;padding:96px 88px}
.glass{background:radial-gradient(120% 140% at 20% 0%,rgba(255,255,255,.55),rgba(255,255,255,.18));border:2px solid rgba(255,255,255,.7);backdrop-filter:blur(14px);border-radius:40px}
.btn{display:inline-block;padding:28px 56px;border-radius:999px;background:#fff;color:#1F5B3A;font-size:38px;font-weight:600;box-shadow:0 18px 40px rgba(14,36,25,.18)}`

function mossSlide(s, ctx) {
  const sky = (inner) => `<div class="sky" style="position:absolute;inset:0"></div>${inner}`
  switch (s.kind) {
    case 'sky':
      // The title and its line are held above the island, however long they run.
      return sky(`<div class="pad" style="text-align:center"><h1 class="serif white" data-fit="270" style="font-size:140px;line-height:.95;margin-top:20px">${plain(s.title)}</h1>
        ${s.body ? `<p class="white" data-fit="110" style="font-size:40px;line-height:1.35;margin-top:26px;font-weight:500">${plain(s.body)}</p>` : ''}</div>
        <img src="${art('isl/hd/forest-4.webp')}" style="position:absolute;left:230px;top:580px;width:620px">
        ${s.eyebrow ? `<div style="position:absolute;left:0;right:0;bottom:92px;text-align:center"><span class="glass" style="display:inline-block;padding:22px 44px;font-size:34px;font-weight:600;color:#0E2419">${plain(s.eyebrow)}</span></div>` : ''}`)
    case 'scene': {
      const scene = ctx.pack && ctx.hasArt(`cal/${ctx.pack}.webp`) ? art(`cal/${ctx.pack}.webp`) : ctx.photo
      return `<div style="position:absolute;inset:0;background:#12301F"></div>
        ${scene ? `<img src="${scene}" style="position:absolute;left:0;top:0;width:1080px;height:860px;object-fit:cover">` : ''}
        <div style="position:absolute;left:0;right:0;top:700px;height:200px;background:linear-gradient(rgba(12,26,18,0),#12301F)"></div>
        <div style="position:absolute;left:0;right:0;top:860px;bottom:0;padding:40px 88px 0">
          <h1 class="serif" data-fit="230" style="font-size:96px;line-height:1.02;color:#fff">${plain(s.title)}</h1>
          ${s.body ? `<p data-fit="150" style="font-size:34px;line-height:1.45;color:#CFE3D6;margin-top:24px">${plain(s.body)}</p>` : ''}</div>`
    }
    case 'steps': {
      const rows = (s.items ?? []).slice(0, 4).map((it, i) => `<div class="glass" style="display:flex;gap:30px;align-items:flex-start;padding:36px 40px">
        <span style="flex:none;width:72px;height:72px;border-radius:50%;background:#F6B93B;color:#3D2702;font-weight:700;font-size:34px;display:grid;place-items:center">${i + 1}</span>
        <div><h3 style="font-size:40px;font-weight:600;line-height:1.2">${plain(it.title)}</h3>${it.text ? `<p style="font-size:30px;line-height:1.45;margin-top:10px;color:#173726">${plain(it.text)}</p>` : ''}</div></div>`).join('')
      return sky(`<div class="pad"><h2 class="serif white" data-fit="210" style="font-size:96px;line-height:1">${plain(s.title)}</h2><div style="display:grid;gap:28px;margin-top:60px">${rows}</div></div>
        <img src="${art('moss/2x/forest-happy.webp')}" style="position:absolute;right:70px;bottom:40px;width:170px">`)
    }
    case 'quest': {
      // The game's own quest card, exactly as the app shows it, on its category colour.
      const q = ctx.quest(s.quest_id)
      if (!q) return mossSlide({ ...s, kind: 'statement' }, ctx)
      const k = KIND[q.word] ?? KIND.CARE
      const card = ctx.card(s.quest_id)
      return `<div style="position:absolute;inset:0;background:radial-gradient(90% 70% at 30% 10%,${k.tint} 0%,${k.base} 70%)"></div>
        ${card
          ? `<img src="${card}" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);max-width:900px;max-height:1250px;border-radius:44px;box-shadow:0 30px 70px rgba(14,36,25,.24)">`
          : `<div style="position:absolute;left:72px;right:72px;top:96px;bottom:96px;background:#FFFCF5;border-radius:48px;padding:72px"><h2 style="font-size:64px;font-weight:600;color:#0E2419">${esc(q.title)}</h2><p style="font-size:33px;margin-top:22px;color:#3E4F45">${esc(q.why)}</p></div>`}
        ${ctx.questTotal > 1 ? `<span style="position:absolute;right:56px;top:40px;font-size:26px;font-weight:600;color:${k.base === '#2F6E46' || k.base === '#4E5AAE' ? '#fff' : '#0E2419'};opacity:.8">${ctx.questIndex} of ${ctx.questTotal}</span>` : ''}`
    }
    case 'close':
      return sky(`<div class="pad" style="text-align:center"><h2 class="serif white" data-fit="230" style="font-size:100px;line-height:1.02;margin-top:40px">${plain(s.title || 'Now accepting Founding Families')}</h2>
        ${s.body ? `<p class="white" data-fit="170" style="font-size:36px;line-height:1.45;margin:36px auto 0;max-width:860px;font-weight:500">${plain(s.body)}</p>` : ''}</div>
        <img src="${art('moss/2x/forest-scarfhappy.webp')}" style="position:absolute;left:50%;transform:translateX(-50%);top:660px;width:280px">
        <div style="position:absolute;left:0;right:0;bottom:110px;text-align:center"><span class="btn">${plain(s.cta || 'Apply via the link in bio')}</span></div>`)
    default: // statement, on the sky
      return sky(`<div class="pad"><h2 class="serif white" data-fit="330" style="font-size:96px;line-height:1.02">${plain(s.title)}</h2>
        ${s.body ? `<div class="glass" style="margin-top:60px;padding:40px 44px"><p data-fit="520" style="font-size:36px;line-height:1.45;color:#173726">${plain(s.body)}</p></div>` : ''}</div>
        <img src="${art('moss/2x/forest-happy.webp')}" style="position:absolute;right:70px;bottom:40px;width:170px">`)
  }
}

export const FAMILIES = {
  'Hue & Heal': { css: HH_CSS, bg: HH.ground, slide: hhSlide },
  Remedae: { css: RD_CSS, bg: RD.ink, slide: remedaeSlide, cream: '#ffffe8' },
  'Moss Island': { css: MOSS_CSS, bg: '#559EA4', slide: mossSlide },
}

/** The HTML for one slide of a post. */
export function slideHtml(company, s, ctx) {
  const f = FAMILIES[company] ?? FAMILIES['Hue & Heal']
  const bg = company === 'Remedae' && s.kind === 'glance' ? f.cream : company === 'Remedae' && s.kind === 'hook' ? RD.charcoal : f.bg
  return page(f.css, f.slide(s, ctx), bg)
}

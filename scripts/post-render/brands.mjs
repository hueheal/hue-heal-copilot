// ============================================================================
// The three post families, one per brand, as HTML slides at 1080 x 1350.
// Each follows the style its own brand chat defined:
//   Hue & Heal   the Hue & Heal Brand Figma (qDrGcT3SPOrIuEiVaiBw0E, 170:1124): warm
//                cinematic photos, Ivy Ora with italic, tracked eyebrows, halos on black
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

const TYPEKIT = '<link rel="stylesheet" href="https://use.typekit.net/oeh6lcv.css">'
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
const page = (css, body, bg) => `<!doctype html><html><head><meta charset="utf-8">${TYPEKIT}<link href="${FONTS}" rel="stylesheet"><style>
*{box-sizing:border-box;margin:0;padding:0}html,body{width:1080px;height:1350px;overflow:hidden}
body{position:relative;background:${bg}}${css}</style></head><body>${body}${FIT}</body></html>`

/* ---------------------------------------------------------------- Hue & Heal */
// From the Hue & Heal Brand Figma (file qDrGcT3SPOrIuEiVaiBw0E, frame 170:1124):
// warm, cinematic full-bleed photography fading to near black; a tiny tracked
// eyebrow at the top; a centred stack of a small Poppins line, a large light
// Ivy Ora title that mixes roman and *italic*, and a glass pill; "Swipe to see
// how" in Ivy Ora italic at the foot; closing and pause slides on black with a
// glowing halo. Ivy Ora comes from the studio's Adobe Fonts kit (it loads on
// localhost, which is why the slides are served rather than opened as files).
const HH = { ground: '#0a0908', ink: '#F4F0E7', mute: 'rgba(244,240,231,.82)', faint: 'rgba(244,240,231,.62)' }
const HALO = { studio: '#d98a6c', lab: '#8db59c', mind: '#aeb2da' }
const HH_MARK = readFileSync(join(here, 'hh-wordmark.txt'), 'utf8').trim()
const hhWordmark = (h, c = HH.ink) => `<svg viewBox="0 0 549 107" style="height:${h}px;width:${Math.round(h * 549 / 107)}px;display:block;margin:0 auto" fill="${c}"><path d="${HH_MARK}"/></svg>`
const HH_CSS = `body{color:${HH.ink};font-family:Poppins,sans-serif;font-weight:300}
.ivy{font-family:'ivyora-display','Newsreader',Georgia,serif;font-weight:300;letter-spacing:-.01em}
.ivy em{font-style:italic}
.ey{position:absolute;left:0;right:0;top:62px;text-align:center;font-weight:400;font-size:22px;letter-spacing:.32em;text-transform:uppercase;color:${HH.mute}}
.photo{position:absolute;inset:0;background-size:cover;background-position:center}
.fade::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,9,8,.42) 0%,rgba(10,9,8,0) 22%,rgba(10,9,8,0) 42%,rgba(10,9,8,.78) 72%,rgba(10,9,8,.94) 100%)}
.stack{position:absolute;left:70px;right:70px;text-align:center}
.pill{display:inline-block;padding:10px 30px;border-radius:999px;background:rgba(244,240,231,.16);border:1px solid rgba(244,240,231,.3);backdrop-filter:blur(8px);font-family:'ivyora-display','Newsreader',serif;font-style:italic;font-size:32px}
.swipe{position:absolute;left:0;right:0;bottom:64px;text-align:center;font-family:'ivyora-display','Newsreader',serif;font-style:italic;font-size:30px;color:${HH.mute}}
.lbl{font-weight:600;color:${HH.ink}}
.glow{position:absolute;left:50%;top:50%;width:900px;height:900px;transform:translate(-50%,-52%);border-radius:50%;background:radial-gradient(closest-side,rgba(217,138,108,.34),rgba(217,138,108,.1) 55%,transparent 75%)}
.ring{position:absolute;left:50%;top:50%;width:620px;height:620px;transform:translate(-50%,-55%);border-radius:50%;background:radial-gradient(closest-side,${HH.ground} 72%,var(--h) 80%,color-mix(in oklab,var(--h) 35%,transparent) 88%,transparent 100%)}`
const ivy = (t) => hl(t, '<em>', '</em>')
const hhEyebrow = (t) => (t ? `<p class="ey">${plain(t)}</p>` : '')
const hhSwipe = (t) => (t ? `<p class="swipe">${plain(t).replace(/\s*(-+>|⟶|→)\s*$/, '')}  ⟶</p>` : '')
const haloOf = (k) => HALO[String(k || '').toLowerCase()] ?? HALO.studio

function hhSlide(s, ctx) {
  // The cover takes the post's photo; other slides only their own, else the warm glow.
  const photo = s.image_url || (s.kind === 'cover' ? ctx.photo : '')
  const bg = photo ? `<div class="photo fade" style="background-image:url('${photo}')"></div>` : '<div class="glow"></div>'
  switch (s.kind) {
    case 'cover':
      // The series cover: eyebrow, small line, the big Ivy Ora title, a line, a pill, swipe.
      return `${bg}${hhEyebrow(s.eyebrow)}<div class="stack" style="bottom:${s.cta ? 150 : 110}px">
        ${s.kicker ? `<p style="font-size:42px;font-weight:400;margin-bottom:8px">${plain(s.kicker)}</p>` : ''}
        <h1 class="ivy" data-fit="400" style="font-size:150px;line-height:1">${ivy(s.title)}</h1>
        ${s.body ? `<p style="font-size:38px;font-weight:500;margin-top:30px">${plain(s.body)}</p>` : ''}
        ${s.note ? `<p style="margin-top:24px"><span class="pill">${plain(s.note)}</span></p>` : ''}</div>${hhSwipe(s.cta)}`
    case 'feature': {
      // One example, named: the photo, its name in Ivy Ora, then labelled lines.
      const rows = (s.items ?? []).slice(0, 3).map((it) => `<p style="font-size:27px;line-height:1.5;margin-top:18px"><span class="lbl">${plain(it.title)}</span> ${plain(it.text)}</p>`).join('')
      return `${bg}${hhEyebrow(s.eyebrow)}<div style="position:absolute;left:72px;right:72px;bottom:92px">
        <h2 class="ivy" data-fit="200" style="font-size:96px;line-height:1">${ivy(s.title)}</h2>
        ${s.body ? `<p style="font-size:27px;line-height:1.5;margin-top:18px;color:${HH.mute}">${plain(s.body)}</p>` : ''}${rows}</div>`
    }
    case 'tip':
      // One idea in a series: the eyebrow names the series, a centred title and three short lines.
      return `${bg}${hhEyebrow(s.eyebrow)}<div class="stack" style="bottom:96px">
        <h2 class="ivy" data-fit="230" style="font-size:100px;line-height:.98">${ivy(s.title)}</h2>
        <p data-fit="190" style="font-size:28px;line-height:1.55;margin-top:22px;color:${HH.mute};white-space:pre-line">${plain(s.body)}</p></div>`
    case 'pause':
      // The coaching pause: a word inside a glowing ring, on black.
      return `${hhEyebrow(s.eyebrow)}<div class="ring" style="--h:${haloOf(s.kicker || 'lab')};display:grid;place-items:center">
        <h2 class="ivy" data-fit="260" style="font-size:${s.title.length > 10 ? 96 : 130}px;line-height:1;text-align:center;max-width:470px">${ivy(s.title)}</h2></div>
        ${s.body ? `<div class="stack" style="bottom:150px"><p style="font-size:28px;line-height:1.55;color:${HH.mute}">${plain(s.body)}</p></div>` : ''}`
    case 'statement':
      return `${bg}${hhEyebrow(s.eyebrow)}<div class="stack" style="top:50%;transform:translateY(-50%)">
        <h2 class="ivy" data-fit="640" style="font-size:96px;line-height:1.04">${ivy(s.title)}</h2>
        ${s.body ? `<p style="font-size:30px;line-height:1.55;margin-top:30px;color:${HH.mute}">${plain(s.body)}</p>` : ''}</div>${hhSwipe(s.cta)}`
    default: // close: the question or the call, on black with a warm glow, the wordmark below
      return `<div class="glow"></div>${hhEyebrow(s.eyebrow)}<div class="stack" style="top:50%;transform:translateY(-58%)">
        <h2 class="ivy" data-fit="420" style="font-size:96px;line-height:1.04">${ivy(s.title)}</h2>
        ${s.body ? `<p style="font-size:30px;line-height:1.55;margin-top:30px;color:${HH.mute}">${plain(s.body)}</p>` : ''}
        ${s.cta ? `<p style="font-size:28px;margin-top:26px;color:${HH.faint}">${plain(s.cta)}</p>` : ''}</div>
        <div style="position:absolute;left:0;right:0;bottom:120px">${hhWordmark(46)}</div>`
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

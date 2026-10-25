// ============================================================================
// The Founder's Digest email, set in the Hue & Heal website's design (the same
// system as the Letter in the site repo, netlify/lib/letter.mjs): a deep night
// ground with a day edition for mail apps set to light, Newsreader for
// headlines and Poppins for text, and the room halos used to tell the parts
// apart: Studio coral for Hue & Heal, Lab sage for the ventures, Mind
// periwinkle for coaching.
// ============================================================================

export interface DigestPost {
  company: string; format: string; headline: string; caption: string; hashtags: string[]
  slides: { heading: string; body: string }[]; image_url?: string | null; post_id?: string | null; why?: string
}
export interface DigestContent {
  date: string; dateLong: string; headline: string; opening: string
  pulse: { company: string; items: { n: string; label: string }[] }[]
  priorities: { company: string; text: string; by: string }[]
  news: { title: string; snippet: string; so_what: string; tag: string; source: string; url: string; date?: string }[]
  posts: DigestPost[]
  coaching: { n: number; of: number; title: string; lesson: string; principle: string; case: string; apply: string; drill: string; term: { word: string; meaning: string } }
  next_steps: { company: string; title: string; detail: string; by: string; carried?: boolean }[]
  overdue: { company: string; title: string; due: string }[]
  question: string
}

const C = { ground: '#0b0d12', card: '#141821', ink: '#ece7dd', mute: '#b3ada2', faint: '#8a857c', rule: 'rgba(236,231,221,0.14)' }
const HUE: Record<string, string> = { 'Hue & Heal': '#d98a6c', Remedae: '#8db59c', 'Moss Island': '#7fb8bd', coaching: '#aeb2da', Industry: '#8a857c' }
const SERIF = "'Newsreader',Georgia,'Times New Roman',serif"
const SANS = "'Poppins',Helvetica,Arial,sans-serif"

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
const nl = (s: unknown) => esc(s).replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>')
const hueOf = (company: string) => HUE[company] ?? C.faint

/** "by Tue 27 Oct", "today", "tomorrow" from a YYYY-MM-DD and today's date. */
export function byLabel(by: string, today: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(by)) return ''
  const d = new Date(`${by}T12:00:00Z`), t = new Date(`${today}T12:00:00Z`)
  const days = Math.round((d.getTime() - t.getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d)
}

const STYLE = `
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  a { text-decoration:none; }
  .day-only { display:none; max-height:0; overflow:hidden; mso-hide:all; }
  @media (prefers-color-scheme: light) {
    .bg { background:#f4f1ec !important; }
    .card { background:#ffffff !important; border-color:rgba(27,34,50,0.12) !important; }
    .ink { color:#1b2232 !important; }
    .mute { color:#4c5263 !important; }
    .faint { color:#6b6f7c !important; }
    .rule { border-color:rgba(27,34,50,0.14) !important; }
    .btn { background:#1b2232 !important; color:#f4f1ec !important; }
    .night-only { display:none !important; max-height:0 !important; overflow:hidden !important; }
    .day-only { display:block !important; max-height:none !important; overflow:visible !important; }
  }
  @media (max-width: 620px) {
    .px { padding-left:22px !important; padding-right:22px !important; }
    .h1 { font-size:34px !important; line-height:1.06 !important; }
    .stack { display:block !important; width:100% !important; }
    .stack-pad { padding:0 0 14px 0 !important; }
  }`

const label = (t: string, colour = C.faint, cls = 'faint') => `<p class="${cls}" style="margin:0 0 10px;font-family:${SANS};font-weight:400;font-size:13px;color:${colour}">${esc(t)}</p>`
const p = (html: string, cls = 'mute', colour = C.mute, size = 16, mb = 16) => `<p class="${cls}" style="margin:0 0 ${mb}px;font-family:${SANS};font-weight:300;font-size:${size}px;line-height:1.65;color:${colour}">${html}</p>`
const h2 = (t: string) => `<h2 class="ink" style="margin:0 0 6px;font-family:${SERIF};font-weight:300;font-size:30px;line-height:1.08;letter-spacing:-0.5px;color:${C.ink}">${esc(t)}</h2>`
const button = (text: string, href: string) => `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td class="btn" style="border-radius:999px;background:${C.ink}"><a class="btn" href="${esc(href)}" style="display:inline-block;padding:12px 22px;font-family:${SANS};font-weight:500;font-size:14px;color:#0b0d12;border-radius:999px">${esc(text)}</a></td></tr></table>`
const textLink = (text: string, href: string) => `<a class="ink" href="${esc(href)}" style="font-family:${SANS};font-weight:500;font-size:14px;color:${C.ink};border-bottom:1px solid ${C.ink}">${esc(text)}</a>`
const rule = () => `<tr><td class="px" style="padding:8px 40px"><div class="rule" style="border-top:1px solid ${C.rule};height:1px;line-height:1px">&nbsp;</div></td></tr>`
const dot = (company: string) => `<span style="display:inline-block;width:8px;height:8px;border-radius:8px;background:${hueOf(company)};margin-right:7px;vertical-align:1px"></span>`
const tag = (company: string, extra = '') => `<p class="faint" style="margin:0 0 6px;font-family:${SANS};font-weight:400;font-size:12px;letter-spacing:0.2px;color:${C.faint}">${dot(company)}${esc(company)}${extra ? ` &nbsp;&middot;&nbsp; ${esc(extra)}` : ''}</p>`
const card = (inner: string, pad = '24px 24px 8px') => `<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border:1px solid ${C.rule};border-radius:18px"><tr><td style="padding:${pad}">${inner}</td></tr></table>`

export function digestEmail(d: DigestContent, opts: { base: string; appUrl: string }): { subject: string; preheader: string; html: string; text: string } {
  const base = opts.base.replace(/\/$/, '')
  const app = opts.appUrl.replace(/\/$/, '')
  const rows: string[] = []
  const subject = `${d.headline}`.slice(0, 110)
  const preheader = d.priorities[0]?.text ? `Today: ${d.priorities[0].text}`.slice(0, 140) : d.opening.slice(0, 140)

  // Masthead
  rows.push(`<tr><td class="px" align="center" style="padding:36px 40px 24px">
    <img class="night-only" src="${base}/email/wordmark-ink.png" width="140" alt="hue&amp;heal" style="display:block;width:140px;height:auto;border:0;margin:0 auto">
    <!--[if !mso]><!--><div class="day-only"><img src="${base}/email/wordmark-night.png" width="140" alt="hue&amp;heal" style="display:block;width:140px;height:auto;border:0;margin:0 auto"></div><!--<![endif]-->
    <p class="faint" style="margin:14px 0 0;font-family:${SANS};font-weight:400;font-size:13px;color:${C.faint}">Founder's Digest &nbsp;&middot;&nbsp; ${esc(d.dateLong)}</p>
  </td></tr>`)

  // Arrival
  rows.push(`<tr><td class="px" style="padding:6px 40px 4px">
    <h1 class="h1 ink" style="margin:0 0 16px;font-family:${SERIF};font-weight:300;font-size:40px;line-height:1.04;letter-spacing:-1px;color:${C.ink}">${esc(d.headline)}</h1>
    ${p(nl(d.opening), 'mute', C.mute, 17)}
  </td></tr>`)

  // Pulse: live numbers per company
  const pulse = d.pulse.filter((x) => x.items.length)
  if (pulse.length) {
    const cells = pulse.map((x) => `<td class="stack stack-pad" valign="top" width="${Math.floor(100 / pulse.length)}%" style="padding:0 12px 16px 0">
        ${tag(x.company)}
        ${x.items.slice(0, 3).map((it) => `<p class="ink" style="margin:0;font-family:${SERIF};font-weight:300;font-size:24px;line-height:1.15;color:${C.ink}">${esc(it.n)} <span class="mute" style="font-family:${SANS};font-size:13px;color:${C.mute}">${esc(it.label)}</span></p>`).join('')}
      </td>`).join('')
    rows.push(`<tr><td class="px" style="padding:12px 40px 8px">${card(`${label('The pulse')}<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>`, '22px 22px 6px')}</td></tr>`)
  }

  // Today's three
  if (d.priorities.length) {
    const items = d.priorities.map((x, i) => `<tr><td class="rule" style="padding:14px 0;${i ? `border-top:1px solid ${C.rule};` : ''}">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
          <td valign="top" width="34" class="ink" style="font-family:${SERIF};font-size:26px;line-height:1;color:${hueOf(x.company)}">${i + 1}</td>
          <td valign="top">${tag(x.company, x.by ? `by ${byLabel(x.by, d.date)}` : '')}${p(esc(x.text), 'ink', C.ink, 16, 0)}</td>
        </tr></table></td></tr>`).join('')
    rows.push(`<tr><td class="px" style="padding:26px 40px 6px">${label('Today\'s three')}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table></td></tr>`)
    rows.push(rule())
  }

  // Industry news
  if (d.news.length) {
    const items = d.news.map((n, i) => `<tr><td class="rule" style="padding:18px 0;${i ? `border-top:1px solid ${C.rule};` : ''}">
        ${tag(n.tag || 'Industry', n.source)}
        <p class="ink" style="margin:0 0 8px;font-family:${SERIF};font-size:21px;line-height:1.22;color:${C.ink}"><a class="ink" href="${esc(n.url)}" style="color:${C.ink}">${esc(n.title)}</a></p>
        ${p(esc(n.snippet), 'mute', C.mute, 15, 8)}
        <p class="ink" style="margin:0;font-family:${SERIF};font-style:italic;font-weight:300;font-size:17px;line-height:1.45;color:${C.ink}">${esc(n.so_what)}</p>
      </td></tr>`).join('')
    rows.push(`<tr><td class="px" style="padding:26px 40px 6px">${label('In the industry')}${h2('What moved this week')}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table></td></tr>`)
    rows.push(rule())
  }

  // Ready to post
  if (d.posts.length) {
    rows.push(`<tr><td class="px" style="padding:26px 40px 4px">${label('Ready to post')}${h2('One for each channel')}${p('Each one is saved as a draft in Copilot. Open it to check the slides, change anything, then post.', 'mute', C.mute, 15, 4)}</td></tr>`)
    for (const post of d.posts) {
      const href = post.post_id ? `${app}/create/social/${post.post_id}` : `${app}/create`
      const fmt = post.format === 'carousel' ? `Carousel, ${post.slides.length} slides` : post.format === 'video' ? 'Reel' : 'Single image'
      // Long captions stop at the last full sentence; the studio has the rest.
      const head = post.caption.slice(0, 460)
      const stop = Math.max(head.lastIndexOf('. '), head.lastIndexOf('.\n'), head.lastIndexOf('? '), head.lastIndexOf('?\n'))
      const caption = post.caption.length <= 460 ? post.caption : `${stop > 160 ? head.slice(0, stop + 1) : `${head.replace(/\s+\S*$/, '')}…`}`
      const slides = post.slides.length && post.format !== 'single'
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 14px">${post.slides.map((s, i) => `<tr><td valign="top" width="26" class="faint" style="padding:5px 0;font-family:${SANS};font-size:12px;color:${C.faint}">${i + 1}</td><td class="mute" style="padding:5px 0;font-family:${SANS};font-weight:300;font-size:14px;line-height:1.5;color:${C.mute}"><span class="ink" style="color:${C.ink};font-weight:500">${esc(s.heading)}</span>${s.body ? ` ${esc(s.body)}` : ''}</td></tr>`).join('')}</table>`
        : ''
      const img = post.image_url
        ? `<a href="${esc(href)}" style="display:block;margin:0 0 18px"><img src="${esc(post.image_url)}" width="472" alt="${esc(post.headline)}" style="display:block;width:100%;max-width:472px;height:auto;border:0;border-radius:14px"></a>`
        : ''
      rows.push(`<tr><td class="px" style="padding:16px 40px 8px">${card(`
        ${img}
        ${tag(post.company, fmt)}
        <p class="ink" style="margin:0 0 10px;font-family:${SERIF};font-size:24px;line-height:1.18;color:${C.ink}">${esc(post.headline)}</p>
        ${p(nl(caption), 'mute', C.mute, 15, 10)}
        ${post.hashtags.length ? p(esc(post.hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')), 'faint', C.faint, 13, 12) : ''}
        ${slides}
        ${post.why ? p(`<i>Why today:</i> ${esc(post.why)}`, 'faint', C.faint, 13, 16) : ''}
        <div style="padding:0 0 18px">${button('Review and post', href)}</div>`)}</td></tr>`)
    }
    rows.push(`<tr><td style="height:14px;line-height:14px">&nbsp;</td></tr>`)
    rows.push(rule())
  }

  // Founder coaching
  const c = d.coaching
  if (c?.title) {
    rows.push(`<tr><td class="px" style="padding:26px 40px 8px">
      ${label(`Founder coaching  ·  Lesson ${c.n} of ${c.of}`, HUE.coaching, '')}
      ${h2(c.title)}
      <p class="ink" style="margin:6px 0 18px;font-family:${SERIF};font-style:italic;font-weight:300;font-size:21px;line-height:1.38;color:${C.ink}">${esc(c.principle)}</p>
      ${p(nl(c.lesson), 'ink', C.ink, 16)}
      ${c.case ? `${label('In the wild')}${p(nl(c.case), 'mute', C.mute, 15)}` : ''}
      ${c.apply ? `${label('For you')}${p(nl(c.apply), 'mute', C.mute, 15)}` : ''}
      ${card(`${label('Today\'s drill  ·  15 minutes', HUE.coaching, '')}${p(nl(c.drill), 'ink', C.ink, 15)}`, '20px 22px 4px')}
      ${c.term?.word ? `<div style="height:18px;line-height:18px">&nbsp;</div>${label('Word to own')}<p class="ink" style="margin:0 0 6px;font-family:${SERIF};font-size:22px;line-height:1.2;color:${C.ink}">${esc(c.term.word)}</p>${p(esc(c.term.meaning), 'mute', C.mute, 15)}` : ''}
    </td></tr>`)
    rows.push(rule())
  }

  // Next steps, by company
  if (d.next_steps.length || d.overdue.length) {
    const companies = [...new Set([...d.next_steps.map((s) => s.company), ...d.overdue.map((s) => s.company)])]
    const blocks = companies.map((co) => {
      const steps = d.next_steps.filter((s) => s.company === co).map((s) => `<tr><td class="rule" style="padding:12px 0;border-top:1px solid ${C.rule}">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td valign="top">
              <p class="ink" style="margin:0 0 4px;font-family:${SANS};font-weight:500;font-size:15px;line-height:1.45;color:${C.ink}">${esc(s.title)}${s.carried ? ` <span class="faint" style="font-weight:300;font-size:12px;color:${C.faint}">carried over</span>` : ''}</p>
              ${s.detail ? p(esc(s.detail), 'mute', C.mute, 14, 0) : ''}
            </td>
            <td valign="top" align="right" width="92" class="faint" style="padding-left:12px;font-family:${SANS};font-size:13px;color:${C.faint};white-space:nowrap">by ${esc(byLabel(s.by, d.date))}</td>
          </tr></table></td></tr>`).join('')
      const late = d.overdue.filter((s) => s.company === co).map((s) => `<tr><td class="rule" style="padding:10px 0;border-top:1px solid ${C.rule}">
          ${p(`<span class="ink" style="color:${C.ink}">${esc(s.title)}</span> &nbsp;<span style="color:#d98a6c">was due ${esc(byLabel(s.due, d.date))}</span>`, 'mute', C.mute, 14, 0)}
        </td></tr>`).join('')
      return `<tr><td style="padding:16px 0 4px">${tag(co)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${steps}${late}</table></td></tr>`
    }).join('')
    rows.push(`<tr><td class="px" style="padding:26px 40px 6px">${label('Next steps')}${h2('What each company needs')}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${blocks}</table>
      <div style="padding:16px 0 4px">${textLink('Open your plan', `${app}/v2/plan`)}</div></td></tr>`)
    rows.push(rule())
  }

  // Closing question
  if (d.question) {
    rows.push(`<tr><td class="px" style="padding:26px 40px 10px">
      ${label('One question to sit with')}
      <p class="ink" style="margin:0 0 18px;font-family:${SERIF};font-style:italic;font-weight:300;font-size:24px;line-height:1.32;color:${C.ink}">${esc(d.question)}</p>
    </td></tr>`)
  }

  // Footer
  rows.push(`<tr><td class="px" align="center" style="padding:24px 40px 44px">
    <p style="margin:0 0 14px"><a class="mute" href="${app}/v2" style="color:${C.mute};font-family:${SANS};font-size:12px">Open Copilot</a><span class="faint" style="color:${C.faint}"> &nbsp;&middot;&nbsp; </span><a class="mute" href="${app}/v2/digest" style="color:${C.mute};font-family:${SANS};font-size:12px">Change what's in it</a><span class="faint" style="color:${C.faint}"> &nbsp;&middot;&nbsp; </span><a class="mute" href="${app}/v2/radar" style="color:${C.mute};font-family:${SANS};font-size:12px">Radar</a></p>
    <p class="faint" style="margin:0;font-family:${SANS};font-weight:300;font-size:12px;line-height:1.6;color:${C.faint}">Written for Maria by Copilot, every morning. Hue &amp; Heal, London</p>
  </td></tr>`)

  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>${esc(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,300&family=Poppins:wght@300;400;500&display=swap" rel="stylesheet">
<style>${STYLE}</style></head>
<body class="bg" style="margin:0;padding:0;background:${C.ground}">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${esc(preheader)}${'&#8199;&#65279;&#847; '.repeat(40)}</div>
<table role="presentation" class="bg" width="100%" cellpadding="0" cellspacing="0" style="background:${C.ground}"><tr><td align="center" style="padding:0 10px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">
${rows.join('\n')}
</table></td></tr></table></body></html>`

  const text = [
    `Founder's Digest, ${d.dateLong}`, '', d.headline, '', d.opening, '',
    "TODAY'S THREE", ...d.priorities.map((x, i) => `${i + 1}. [${x.company}] ${x.text}${x.by ? ` (by ${byLabel(x.by, d.date)})` : ''}`), '',
    'IN THE INDUSTRY', ...d.news.map((n) => `- ${n.title} (${n.source}) ${n.url}\n  ${n.snippet}\n  ${n.so_what}`), '',
    'READY TO POST', ...d.posts.map((x) => `- ${x.company}: ${x.headline}\n  ${x.post_id ? `${app}/create/social/${x.post_id}` : ''}`), '',
    `FOUNDER COACHING: ${c?.title ?? ''}`, c?.principle ?? '', c?.lesson ?? '', `Drill: ${c?.drill ?? ''}`, '',
    'NEXT STEPS', ...d.next_steps.map((s) => `- [${s.company}] ${s.title} (by ${byLabel(s.by, d.date)})`), '',
    d.question,
  ].join('\n')

  return { subject, preheader, html, text }
}

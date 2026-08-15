import { supabase, isSupabaseConfigured, functionsBase } from './supabase'
import { compressPhoto } from './imageCompress'
import { filterByBrand, withBrandInsert } from './brandScope'
import { readableOn } from './color'
import type { Database } from './database.types'

export type Newsletter = Database['public']['Tables']['newsletters']['Row']
export type Subscriber = Database['public']['Tables']['subscribers']['Row']

/* ---- Block model (stored in newsletters.blocks) ---- */
export type Block =
  | { id: string; type: 'heading'; text: string; size?: number }
  | { id: string; type: 'text'; text: string; size?: number }
  | { id: string; type: 'image'; url: string; alt?: string }
  | { id: string; type: 'button'; label: string; href: string }
  | { id: string; type: 'divider' }
  /* Editorial blocks (journal-first, mirrored from remedae.app's article model). */
  | { id: string; type: 'quote'; text: string; attribution?: string }
  | { id: string; type: 'list'; items: string[] }

let bseq = 1
export const bid = () => `b-${bseq++}`

export interface NewsletterTemplate {
  id: string
  label: string
  eyebrow: string
  blocks: () => Block[]
}

export const TEMPLATES: NewsletterTemplate[] = [
  {
    id: 'journal',
    label: 'The Journal',
    eyebrow: 'The Journal',
    blocks: () => [
      { id: bid(), type: 'heading', text: 'Designing for stillness' },
      { id: bid(), type: 'text', text: 'This month we’ve been thinking about how a space can lower the heart rate before a word is spoken, and what that means for the places we design.' },
      { id: bid(), type: 'image', url: '', alt: 'Feature image' },
      { id: bid(), type: 'text', text: 'Three principles guiding our latest work…' },
      { id: bid(), type: 'button', label: 'Read the full piece', href: 'https://www.hueandheal.com' },
    ],
  },
  {
    id: 'announcement',
    label: 'Announcement',
    eyebrow: 'News',
    blocks: () => [
      { id: bid(), type: 'heading', text: 'Something new from the studio' },
      { id: bid(), type: 'text', text: 'A short, warm note about what we’re launching and why it matters for wellbeing-led spaces.' },
      { id: bid(), type: 'button', label: 'See more', href: 'https://www.hueandheal.com' },
    ],
  },
  {
    id: 'guide',
    label: 'Guide',
    eyebrow: 'A guide to',
    blocks: () => [
      { id: bid(), type: 'heading', text: 'A guide to wellness in hospitality' },
      { id: bid(), type: 'text', text: 'The five principles we design by, distilled into a short read.' },
      { id: bid(), type: 'divider' },
      { id: bid(), type: 'text', text: '01 · Sense of arrival\n02 · Light as material\n03 · Natural texture\n04 · Room to breathe\n05 · A reason to return' },
      { id: bid(), type: 'button', label: 'Explore the guide', href: 'https://www.hueandheal.com' },
    ],
  },
]

/* ---- On-brand, email-safe HTML (inline styles, table layout) ----
   The whole newsletter is set in Poppins, the brand's typeface. Clients that
   support web fonts (Apple Mail, iOS Mail, Outlook mobile) load it via the
   Google Fonts link in the head; everywhere else it falls back cleanly to a
   system sans, so the layout never breaks. */
const C = {
  ink: '#211D18',      // deep warm near-black (footer, display text)
  copper: '#B5632F',   // default accent
  bone: '#EDE6D6',     // image placeholder
  paper: '#F6F1E7',    // the newsletter card
  page: '#E7E0CF',     // warm cream margin the card sits on
  muted: '#7A6F5E',    // captions, footer secondary
  soft: '#463D30',     // body copy, softer than ink so long reads feel calm
  line: '#DBD1BE',     // hairlines
  cream: '#F4F0E7',
  onDark: '#F1EADB',   // text on the dark footer
  onDarkMuted: '#B7AC97',
}
const SANS = "'Poppins', 'Helvetica Neue', Helvetica, Arial, sans-serif"
// Hosted raster of the Hue & Heal wordmark. Email can't render the SVG logo,
// so the parent brand falls back to these PNGs (ink on the light masthead,
// cream on the dark footer). Absolute URLs: email needs hosted images.
const PARENT_LOGO_INK = 'https://copilotadmin.hueandheal.com/brand/hue-heal-email-ink.png'
const PARENT_LOGO_CREAM = 'https://copilotadmin.hueandheal.com/brand/hue-heal-email-cream.png'

/* Hosted raster wordmarks per brand world, keyed by lowercased name.
   ink = for the light masthead, cream = for the dark footer band. */
const BRAND_EMAIL_LOGOS: Record<string, { ink: string; cream: string }> = {
  'hue & heal': { ink: PARENT_LOGO_INK, cream: PARENT_LOGO_CREAM },
  'remedae': {
    ink: 'https://copilotadmin.hueandheal.com/brand/remedae-email-ink.png',
    cream: 'https://copilotadmin.hueandheal.com/brand/remedae-email-cream.png',
  },
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/* A single full-bleed image — magazine-style, edge to edge, no radius. */
function imageCell(b: Extract<Block, { type: 'image' }>): string {
  return b.url
    ? `<img src="${esc(b.url)}" alt="${esc(b.alt ?? '')}" width="600" style="width:100%;max-width:600px;display:block;border:0;" />`
    : `<div style="width:100%;height:300px;background:${C.bone};"></div>`
}

function renderBlock(b: Block, accentInk: string): string {
  switch (b.type) {
    // Display heading in Poppins medium, large and calm with air above it.
    case 'heading':
      return `<tr><td style="padding:30px 48px 6px;"><h1 style="margin:0;font-family:${SANS};font-weight:500;font-size:${b.size ?? 28}px;line-height:1.3;letter-spacing:-0.3px;color:${C.ink};">${esc(b.text)}</h1></td></tr>`
    // Body copy, set slightly larger and looser so it reads slowly.
    case 'text':
      return `<tr><td style="padding:12px 48px;font-family:${SANS};font-weight:300;font-size:${b.size ?? 15}px;line-height:1.9;color:${C.soft};white-space:pre-line;">${esc(b.text)}</td></tr>`
    // Full-bleed feature image with breathing room above and below.
    case 'image':
      return `<tr><td style="padding:26px 0;">${imageCell(b)}</td></tr>`
    // Understated editorial CTA: small-caps, letter-spaced, hairline outline.
    case 'button':
      return `<tr><td align="center" style="padding:26px 48px;"><a href="${esc(b.href)}" style="display:inline-block;border:1px solid ${accentInk};color:${accentInk};text-decoration:none;font-family:${SANS};font-size:11px;font-weight:500;letter-spacing:2.5px;text-transform:uppercase;padding:14px 30px;">${esc(b.label)}</a></td></tr>`
    // A short centred rule, a beat of silence between ideas.
    case 'divider':
      return `<tr><td align="center" style="padding:26px 48px;"><div style="width:46px;height:1px;background:${C.line};margin:0 auto;line-height:1px;font-size:0;">&nbsp;</div></td></tr>`
    // Pulled quote: hairline accent rule, larger light type, small-caps attribution.
    case 'quote':
      return `<tr><td style="padding:18px 48px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="border-left:2px solid ${accentInk};padding:4px 0 4px 18px;">` +
        `<div style="font-family:${SANS};font-weight:300;font-style:italic;font-size:19px;line-height:1.5;color:${C.ink};">&ldquo;${esc(b.text)}&rdquo;</div>` +
        (b.attribution ? `<div style="font-family:${SANS};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};margin-top:10px;">${esc(b.attribution)}</div>` : '') +
        `</td></tr></table></td></tr>`
    // Numbered list with two-digit editorial numerals and hairline dividers.
    case 'list':
      return `<tr><td style="padding:12px 48px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%">` +
        b.items.filter((it) => it.trim()).map((it, i, arr) =>
          `<tr><td width="30" valign="top" style="padding:10px 0;font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:1px;color:${accentInk};border-bottom:${i === arr.length - 1 ? 'none' : `1px solid ${C.line}`};">${String(i + 1).padStart(2, '0')}</td>` +
          `<td valign="top" style="padding:10px 0;font-family:${SANS};font-weight:300;font-size:15px;line-height:1.7;color:${C.soft};border-bottom:${i === arr.length - 1 ? 'none' : `1px solid ${C.line}`};">${esc(it)}</td></tr>`,
        ).join('') +
        `</table></td></tr>`
  }
}

/* Render the block flow, pairing two adjacent images into a two-up grid
   (a signature editorial layout) and letting single images run full-bleed. */
function renderBlocks(blocks: Block[], accentInk: string): string {
  const out: string[] = []
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    const next = blocks[i + 1]
    if (b.type === 'image' && b.url && next && next.type === 'image' && next.url) {
      out.push(
        `<tr><td style="padding:26px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>` +
          `<td width="50%" valign="top" style="padding-right:6px;"><img src="${esc(b.url)}" alt="${esc(b.alt ?? '')}" width="264" style="width:100%;display:block;border:0;" /></td>` +
          `<td width="50%" valign="top" style="padding-left:6px;"><img src="${esc(next.url)}" alt="${esc(next.alt ?? '')}" width="264" style="width:100%;display:block;border:0;" /></td>` +
          `</tr></table></td></tr>`,
      )
      i++ // consumed the pair
      continue
    }
    out.push(renderBlock(b, accentInk))
  }
  return out.join('')
}

/** Identity of the brand world this newsletter belongs to. */
export interface EmailBrand {
  name: string
  accent_color?: string
  logo_url?: string | null
  tagline?: string
  website?: string
}

const HUE_HEAL_BRAND: EmailBrand = { name: 'Hue & Heal', accent_color: '#B5632F', tagline: 'Designing the future of wellness', website: 'hueandheal.com' }

export function renderEmailHtml(
  nl: { subject: string; preheader: string; eyebrow?: string; blocks: Block[] },
  brand: EmailBrand = HUE_HEAL_BRAND,
): string {
  const accent = brand.accent_color || C.copper
  // Accent as text needs to stay legible on the near-white email paper.
  const accentInk = readableOn(accent, C.paper, 4.2)

  // Long Lane hero: if the newsletter opens on an image, lift it out of the flow
  // and run it full-bleed under the logo — an image-led cover.
  const first = nl.blocks[0]
  const hero = first && first.type === 'image' && first.url ? first : null
  const flow = hero ? nl.blocks.slice(1) : nl.blocks
  const blocksHtml = renderBlocks(flow, accentInk)

  const heroHtml = hero
    ? `<tr><td style="padding:0;">${imageCell(hero)}</td></tr>`
    : ''

  // Masthead: the brand's logo centred. A raster logo_url is used as-is; known
  // brand worlds fall back to their hosted PNG wordmarks (email can't render
  // SVG logos, so SVG urls are skipped). If a brand has no raster logo at all,
  // its name is set in Poppins as a graceful fallback.
  const hosted = BRAND_EMAIL_LOGOS[brand.name.trim().toLowerCase()]
  const rasterLogo = brand.logo_url && !/\.svg(\?|$)/i.test(brand.logo_url) ? brand.logo_url : null
  const mastLogo = rasterLogo ?? hosted?.ink ?? null
  const masthead = mastLogo
    ? `<img src="${esc(mastLogo)}" alt="${esc(brand.name)}" height="40" style="height:40px;width:auto;max-width:80%;display:block;border:0;margin:0 auto;" />`
    : `<span style="font-family:${SANS};font-weight:500;font-size:26px;letter-spacing:0.3px;color:${C.ink};">${esc(brand.name)}</span>`

  const eyebrowHtml = nl.eyebrow
    ? `<tr><td align="center" style="padding:38px 48px 0;font-family:${SANS};font-weight:500;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${accentInk};">${esc(nl.eyebrow)}</td></tr>`
    : `<tr><td style="height:14px;"></td></tr>`

  // Footer: a grounded dark band. Known brands show their cream wordmark PNG;
  // others show their name set in Poppins (a dark logo would vanish on ink).
  const footerMark = hosted
    ? `<img src="${esc(hosted.cream)}" alt="${esc(brand.name)}" height="30" style="height:30px;width:auto;max-width:70%;display:block;border:0;margin:0 auto;" />`
    : `<div style="font-family:${SANS};font-weight:500;font-size:22px;letter-spacing:0.3px;color:${C.onDark};">${esc(brand.name)}</div>`
  const taglineHtml = brand.tagline
    ? `<div style="font-family:${SANS};font-weight:300;font-style:italic;font-size:14px;color:${C.onDarkMuted};margin:14px 0 0;">${esc(brand.tagline)}</div>`
    : ''
  const websiteHtml = brand.website
    ? `<div style="font-family:${SANS};font-size:11px;letter-spacing:1px;color:${C.onDarkMuted};margin-top:14px;">${esc(brand.website)}</div>`
    : ''

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(nl.subject)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap" rel="stylesheet">
<style>@import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap');body,table,td,a,span,div,h1{font-family:'Poppins','Helvetica Neue',Helvetica,Arial,sans-serif;}</style></head>
<body style="margin:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(nl.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};padding:36px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:${C.paper};">
  <tr><td align="center" style="padding:40px 40px 30px;">${masthead}</td></tr>
  ${heroHtml}
  ${eyebrowHtml}
  ${blocksHtml}
  <tr><td style="height:44px;"></td></tr>
  <tr><td align="center" style="background:${C.ink};padding:44px 40px;">
    ${footerMark}
    ${taglineHtml}
    ${websiteHtml}
    <div style="margin-top:20px;"><a href="{{unsubscribe}}" style="font-family:${SANS};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${C.onDarkMuted};text-decoration:underline;">Unsubscribe</a></div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

/* Upload an image chosen from the user's device to the social-assets bucket and
   return its public URL, so image blocks can attach a local file instead of
   pasting a URL. Email needs a hosted absolute URL, which the public bucket gives. */
export async function uploadNewsletterImage(raw: File): Promise<{ url?: string; error?: string }> {
  if (!(isSupabaseConfigured && supabase)) return { error: 'Not connected' }
  const { data: s } = await supabase.auth.getSession()
  const uid = s.session?.user.id
  if (!uid) return { error: 'Sign in first' }
  // Email columns are 600px wide (1200px at retina); JPEG renders everywhere email does.
  const file = await compressPhoto(raw, { maxEdge: 1200, format: 'jpeg', quality: 0.84 })
  const safe = file.name.replace(/[^a-zA-Z0-9.]/g, '')
  const path = `${uid}/newsletter/img-${Date.now()}-${safe}`
  const { error } = await supabase.storage.from('social-assets').upload(path, file, { upsert: true, contentType: file.type || 'image/png' })
  if (error) return { error: error.message }
  const { data } = supabase.storage.from('social-assets').getPublicUrl(path)
  return { url: data.publicUrl }
}

/* ---------------------------------------------------------------------------
   AI drafting: Claude writes the newsletter in the brand world's voice
--------------------------------------------------------------------------- */
export interface GeneratedNewsletter {
  subject: string
  preheader: string
  eyebrow: string
  blocks: Block[]
}

interface RawBlock { type?: string; text?: string; alt?: string; label?: string; href?: string }

/** Map the model's blocks onto our editable Block model, assigning ids. */
function toBlocks(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return []
  const out: Block[] = []
  for (const r of raw as RawBlock[]) {
    switch (r?.type) {
      case 'heading': out.push({ id: bid(), type: 'heading', text: r.text ?? '' }); break
      case 'text': out.push({ id: bid(), type: 'text', text: r.text ?? '' }); break
      case 'image': out.push({ id: bid(), type: 'image', url: '', alt: r.alt ?? '' }); break
      case 'button': out.push({ id: bid(), type: 'button', label: r.label || 'Read more', href: r.href ?? '' }); break
      case 'divider': out.push({ id: bid(), type: 'divider' }); break
      default: break
    }
  }
  return out
}

export async function generateNewsletter(input: {
  topic: string
  notes?: string
  brandName?: string
  toneOfVoice?: string
  writingGuidelines?: string
  template?: string
  mode?: string
}): Promise<{ result: GeneratedNewsletter | null; error?: string }> {
  if (!(isSupabaseConfigured && supabase && functionsBase)) return { result: null, error: 'Not connected' }
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return { result: null, error: 'Sign in first' }
  try {
    const res = await fetch(`${functionsBase}/generate-newsletter`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { result: null, error: data?.error ? String(data.error) : `Draft ${res.status}` }
    const n = data?.newsletter
    if (!n) return { result: null, error: 'No draft returned' }
    const blocks = toBlocks(n.blocks)
    if (!blocks.length) return { result: null, error: 'Draft came back empty' }
    return { result: { subject: n.subject ?? '', preheader: n.preheader ?? '', eyebrow: n.eyebrow ?? '', blocks } }
  } catch (e) {
    return { result: null, error: String(e) }
  }
}

/* ---------------------------------------------------------------------------
   Persistence (Supabase when connected, in-memory otherwise)
--------------------------------------------------------------------------- */
let localNls: Newsletter[] = []
let localSubs: Subscriber[] = []
let seq = 1
const iso = () => new Date().toISOString()

export async function listNewsletters(): Promise<Newsletter[]> {
  if (supabase) {
    const { data, error } = await filterByBrand(supabase.from('newsletters').select('*')).order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }
  return [...localNls]
}

export async function saveNewsletter(input: Database['public']['Tables']['newsletters']['Insert']): Promise<Newsletter> {
  if (supabase) {
    const { data, error } = await supabase.from('newsletters').insert(withBrandInsert(input)).select('*').single()
    if (error) throw error
    return data
  }
  const nl: Newsletter = {
    id: `local-nl${seq++}`, owner: 'local', subject: input.subject ?? '', preheader: input.preheader ?? '',
    template: input.template ?? 'journal', blocks: (input.blocks ?? []) as unknown[], status: input.status ?? 'draft',
    sent_at: input.sent_at ?? null, recipients_count: input.recipients_count ?? 0, created_at: iso(), updated_at: iso(),
  }
  localNls = [nl, ...localNls]
  return nl
}

export async function updateNewsletter(id: string, patch: Database['public']['Tables']['newsletters']['Update']): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('newsletters').update(patch).eq('id', id)
    if (error) throw error
    return
  }
  localNls = localNls.map((n) => (n.id === id ? { ...n, ...patch, updated_at: iso() } as Newsletter : n))
}

export async function deleteNewsletter(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('newsletters').delete().eq('id', id)
    if (error) throw error
    return
  }
  localNls = localNls.filter((n) => n.id !== id)
}

/* ---- Subscribers ---- */
export async function listSubscribers(): Promise<Subscriber[]> {
  if (supabase) {
    const { data, error } = await filterByBrand(supabase.from('subscribers').select('*')).order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }
  return [...localSubs]
}

export async function addSubscribers(emails: string[], name = ''): Promise<number> {
  const clean = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter((e) => /.+@.+\..+/.test(e)))]
  if (!clean.length) return 0
  if (supabase) {
    const rows = clean.map((email) => withBrandInsert({ email, name, status: 'subscribed' }))
    const { error } = await supabase.from('subscribers').upsert(rows, { onConflict: 'owner,email', ignoreDuplicates: true })
    if (error) throw error
    return clean.length
  }
  const existing = new Set(localSubs.map((s) => s.email))
  clean.forEach((email) => {
    if (!existing.has(email)) localSubs = [{ id: `local-sub${seq++}`, owner: 'local', brand_id: null, email, name, status: 'subscribed', groups: [], unsub_token: `local-${seq}`, created_at: iso() }, ...localSubs]
  })
  return clean.length
}

/* ---- Self-serve subscribe / unsubscribe (public — called with the anon key) ---- */
export async function publicSubscribe(input: { brandId: string; email: string; name?: string; group?: string }): Promise<{ ok: boolean; error?: string }> {
  if (!(supabase)) return { ok: false, error: 'Not connected' }
  const { data, error } = await supabase.functions.invoke('subscribe', { body: input })
  if (error) return { ok: false, error: (data as { error?: string } | null)?.error ?? error.message }
  if ((data as { error?: string } | null)?.error) return { ok: false, error: (data as { error?: string }).error }
  return { ok: true }
}

export async function publicUnsubscribe(token: string): Promise<{ ok: boolean; email?: string; error?: string }> {
  if (!(supabase)) return { ok: false, error: 'Not connected' }
  const { data, error } = await supabase.functions.invoke('unsubscribe', { body: { token } })
  const d = data as { ok?: boolean; email?: string; error?: string } | null
  if (error) return { ok: false, error: d?.error ?? error.message }
  if (d?.error) return { ok: false, error: d.error }
  return { ok: true, email: d?.email }
}

/** The shareable public subscribe URL for a brand. */
export function subscribeLink(brandId: string, brandName: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const params = new URLSearchParams({ b: brandId, name: brandName })
  return `${origin}/subscribe?${params.toString()}`
}

/** All distinct groups present across a brand's subscribers. */
export function subscriberGroups(subs: Subscriber[]): string[] {
  return [...new Set(subs.flatMap((s) => s.groups ?? []))].sort()
}

export async function deleteSubscriber(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('subscribers').delete().eq('id', id)
    if (error) throw error
    return
  }
  localSubs = localSubs.filter((s) => s.id !== id)
}

/* ---- Send via the edge function ----
   Recipients can be plain emails (test sends) or {email, token} so each message
   gets a working per-subscriber {{unsubscribe}} link. */
export type SendRecipient = string | { email: string; token?: string }

export async function sendNewsletter(
  subject: string,
  html: string,
  recipients: SendRecipient[],
  /** Per-brand verified sender, e.g. "Remedae <news@remedae.app>". Empty = function default. */
  from?: string,
): Promise<{ sent: number; error?: string }> {
  if (!(isSupabaseConfigured && supabase && functionsBase)) return { sent: 0, error: 'Not connected — add Supabase keys' }
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return { sent: 0, error: 'Sign in first (bottom-left)' }
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  // Normalise to {email, unsubUrl} — build the per-recipient unsubscribe link here.
  const payload = recipients.map((r) => {
    const email = typeof r === 'string' ? r : r.email
    const tok = typeof r === 'string' ? undefined : r.token
    return { email, unsubUrl: tok ? `${origin}/unsubscribe?t=${tok}` : `${origin}/unsubscribe` }
  })
  try {
    const res = await fetch(`${functionsBase}/send-newsletter`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ subject, html, recipients: payload, ...(from?.trim() ? { from: from.trim() } : {}) }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { sent: 0, error: data?.error ? String(data.error) : `Send ${res.status}` }
    return { sent: data?.sent ?? 0 }
  } catch (e) {
    return { sent: 0, error: String(e) }
  }
}

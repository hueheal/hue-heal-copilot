import { supabase, isSupabaseConfigured, functionsBase } from './supabase'
import { filterByBrand, withBrandInsert } from './brandScope'
import { readableOn, textOnColor } from './color'
import type { Database } from './database.types'

export type Newsletter = Database['public']['Tables']['newsletters']['Row']
export type Subscriber = Database['public']['Tables']['subscribers']['Row']

/* ---- Block model (stored in newsletters.blocks) ---- */
export type Block =
  | { id: string; type: 'heading'; text: string }
  | { id: string; type: 'text'; text: string }
  | { id: string; type: 'image'; url: string; alt?: string }
  | { id: string; type: 'button'; label: string; href: string }
  | { id: string; type: 'divider' }

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
      { id: bid(), type: 'text', text: 'This month we’ve been thinking about how a space can lower the heart rate before a word is spoken — and what that means for the places we design.' },
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
      { id: bid(), type: 'text', text: '01 — Sense of arrival\n02 — Light as material\n03 — Natural texture\n04 — Room to breathe\n05 — A reason to return' },
      { id: bid(), type: 'button', label: 'Explore the guide', href: 'https://www.hueandheal.com' },
    ],
  },
]

/* ---- On-brand, email-safe HTML (inline styles, table layout, web-safe fonts) ----
   Email clients don't reliably support custom web fonts, so the display serif falls
   back to Georgia (Ivy Ora's closest ubiquitous cousin) — standard email practice. */
const C = { ink: '#1E1B18', copper: '#B5632F', bone: '#F5F1E8', paper: '#FBFAF6', muted: '#6E6456', line: '#E0D7C6', cream: '#F4F0E7' }
const SERIF = "Georgia, 'Times New Roman', serif"
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif"

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderBlock(b: Block, accent: string = C.copper, onAccent: string = '#F6EFE4'): string {
  switch (b.type) {
    case 'heading':
      return `<tr><td style="padding:8px 40px 4px;"><h1 style="margin:0;font-family:${SERIF};font-weight:400;font-size:30px;line-height:1.15;color:${C.ink};">${esc(b.text)}</h1></td></tr>`
    case 'text':
      return `<tr><td style="padding:10px 40px;font-family:${SANS};font-size:16px;line-height:1.7;color:${C.muted};white-space:pre-line;">${esc(b.text)}</td></tr>`
    case 'image':
      return b.url
        ? `<tr><td style="padding:14px 40px;"><img src="${esc(b.url)}" alt="${esc(b.alt ?? '')}" width="520" style="width:100%;max-width:520px;border-radius:10px;display:block;" /></td></tr>`
        : `<tr><td style="padding:14px 40px;"><div style="width:100%;height:180px;background:${C.bone};border:1px dashed ${C.line};border-radius:10px;"></div></td></tr>`
    case 'button':
      return `<tr><td style="padding:16px 40px;"><a href="${esc(b.href)}" style="display:inline-block;background:${accent};color:${onAccent};text-decoration:none;font-family:${SANS};font-size:14px;padding:12px 24px;border-radius:999px;">${esc(b.label)}</a></td></tr>`
    case 'divider':
      return `<tr><td style="padding:6px 40px;"><div style="border-top:1px solid ${C.line};"></div></td></tr>`
  }
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
  const onAccent = textOnColor(accent)
  const blocksHtml = nl.blocks.map((b) => renderBlock(b, accent, onAccent)).join('')
  const eyebrow = nl.eyebrow
    ? `<div style="font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${accentInk};padding:0 40px 4px;">${esc(nl.eyebrow)}</div>`
    : ''

  // Masthead: the brand's logo when it has one, otherwise its name set in the serif.
  const isParent = brand.name === HUE_HEAL_BRAND.name
  const masthead = brand.logo_url
    ? `<img src="${esc(brand.logo_url)}" alt="${esc(brand.name)}" height="26" style="height:26px;display:block;border:0;" />`
    : isParent
    ? `<span style="font-family:${SERIF};font-size:24px;color:${C.ink};">hue&amp;heal<span style="color:${accentInk};">.</span></span>`
    : `<span style="font-family:${SERIF};font-size:24px;color:${C.ink};">${esc(brand.name)}<span style="color:${accentInk};">.</span></span>`

  const taglineHtml = brand.tagline
    ? `<div style="font-family:${SERIF};font-style:italic;font-size:15px;color:${C.muted};margin-bottom:8px;">${esc(brand.tagline)}</div>`
    : ''
  const footerLine = [esc(brand.name), brand.website ? esc(brand.website) : ''].filter(Boolean).join(' · ')

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(nl.subject)}</title></head>
<body style="margin:0;background:${C.paper};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(nl.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};padding:28px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:${C.paper};">
  <tr><td style="padding:8px 40px 20px;border-bottom:1px solid ${C.line};">${masthead}</td></tr>
  <tr><td style="height:20px;"></td></tr>
  ${eyebrow}
  ${blocksHtml}
  <tr><td style="height:24px;"></td></tr>
  <tr><td style="padding:20px 40px;border-top:1px solid ${C.line};font-family:${SANS};font-size:12px;color:${C.muted};">
    ${taglineHtml}
    ${footerLine}<br/>
    <a href="{{unsubscribe}}" style="color:${C.muted};">Unsubscribe</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

/* ---------------------------------------------------------------------------
   AI drafting — Claude writes the newsletter in the brand world's voice
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
    if (!existing.has(email)) localSubs = [{ id: `local-sub${seq++}`, owner: 'local', email, name, status: 'subscribed', created_at: iso() }, ...localSubs]
  })
  return clean.length
}

export async function deleteSubscriber(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('subscribers').delete().eq('id', id)
    if (error) throw error
    return
  }
  localSubs = localSubs.filter((s) => s.id !== id)
}

/* ---- Send via the edge function ---- */
export async function sendNewsletter(
  subject: string,
  html: string,
  recipients: string[],
): Promise<{ sent: number; error?: string }> {
  if (!(isSupabaseConfigured && supabase && functionsBase)) return { sent: 0, error: 'Not connected — add Supabase keys' }
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return { sent: 0, error: 'Sign in first (bottom-left)' }
  try {
    const res = await fetch(`${functionsBase}/send-newsletter`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ subject, html, recipients }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { sent: 0, error: data?.error ? String(data.error) : `Send ${res.status}` }
    return { sent: data?.sent ?? 0 }
  } catch (e) {
    return { sent: 0, error: String(e) }
  }
}

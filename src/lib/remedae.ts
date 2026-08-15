import { supabase, isSupabaseConfigured, functionsBase } from './supabase'
import { slugify } from './journal'
import type { Block } from './newsletter'

/* ============================================================
   Publish a Copilot journal article to remedae.app.
   Maps the Copilot block model onto Remedae's ArticleBlock shape
   (content/journal/articles.ts in the remedae repo) and posts it
   through the publish-remedae edge function, which holds the key.
   ============================================================ */

export const REMEDAE_CATEGORIES = [
  { key: 'kitchen-remedies', label: 'Kitchen remedies' },
  { key: 'sleep-unhurried', label: 'Sleep, unhurried' },
  { key: 'tcm-in-plain-english', label: 'TCM, in plain English' },
  { key: 'reading-the-body', label: 'Reading the body' },
  { key: 'on-the-research', label: 'On the research' },
] as const

export type RemedaeCategory = (typeof REMEDAE_CATEGORIES)[number]['key']

type RemedaeBlock =
  | { kind: 'lede'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'quote'; text: string; attribution?: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'image'; url: string; alt?: string }

export interface RemedaeArticle {
  slug: string
  title: string
  dek: string
  category: RemedaeCategory
  readMinutes: number
  heroImage: string
  body: RemedaeBlock[]
}

/** Copilot journal → Remedae article. The dedicated hero image gets the
    full-bleed cover treatment, every image block stays in the body, the
    first paragraph becomes the lede, takeaways close the piece as a list.
    (Legacy fallback: with no dedicated hero, the first body image is lifted
    out to serve as one so older drafts keep their cover.) */
export function toRemedaeArticle(input: {
  title: string
  dek: string
  readingTime?: string
  hero?: string
  blocks: Block[]
  takeaways: string[]
  category: RemedaeCategory
  /** Keep a published article's slug so a retitle updates it in place. */
  slug?: string
}): RemedaeArticle {
  const body: RemedaeBlock[] = []
  let hero = (input.hero ?? '').trim()
  let ledeDone = false

  for (const b of input.blocks) {
    if (b.type === 'heading' && b.text.trim()) body.push({ kind: 'h2', text: b.text.trim() })
    else if (b.type === 'text' && b.text.trim()) {
      if (!ledeDone) { body.push({ kind: 'lede', text: b.text.trim() }); ledeDone = true }
      else body.push({ kind: 'p', text: b.text.trim() })
    } else if (b.type === 'image' && b.url) {
      if (!hero) hero = b.url
      else body.push({ kind: 'image', url: b.url, alt: b.alt ?? '' })
    } else if (b.type === 'quote' && b.text.trim()) {
      body.push({ kind: 'quote', text: b.text.trim(), ...(b.attribution?.trim() ? { attribution: b.attribution.trim() } : {}) })
    } else if (b.type === 'list') {
      const items = b.items.map((s) => s.trim()).filter(Boolean)
      if (items.length) body.push({ kind: 'list', items })
    }
    // buttons and dividers have no journal equivalent on remedae.app
  }
  if (input.takeaways.length) {
    body.push({ kind: 'h2', text: 'Key takeaways' })
    body.push({ kind: 'list', items: input.takeaways })
  }

  const words = input.blocks.reduce((n, b) => n + ((b.type === 'heading' || b.type === 'text') ? b.text.split(/\s+/).length : 0), 0)
  const parsed = parseInt((input.readingTime ?? '').replace(/[^0-9]/g, ''), 10)
  const readMinutes = Number.isFinite(parsed) && parsed > 0 ? parsed : Math.max(2, Math.round(words / 200))

  return {
    slug: (input.slug?.trim()) || slugify(input.title || 'untitled'),
    title: input.title.trim(),
    dek: input.dek.trim(),
    category: input.category,
    readMinutes,
    heroImage: hero,
    body,
  }
}

/** Pre-flight against the rules remedae.app's validator enforces, so the
    editor can say exactly what to fix instead of a 400 from the endpoint. */
export function validateRemedaeArticle(a: RemedaeArticle): string | null {
  if (!a.title.trim()) return 'Give the article a title'
  if (a.title.length > 400) return 'Title is over 400 characters'
  if (!a.dek.trim()) return 'Add a standfirst (dek): remedae.app requires one'
  if (a.dek.length > 400) return 'Standfirst is over 400 characters'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug)) return 'Title produces an invalid slug'
  if (!a.heroImage) return 'Add a hero image: every remedae.app article opens on one'
  if (!/^https?:\/\//.test(a.heroImage) && !a.heroImage.startsWith('/')) return 'Hero image must be an https:// URL'
  if (!a.body.length) return 'Write the article body first'
  for (const b of a.body) if (b.kind === 'image' && !/^https?:\/\//.test(b.url)) return 'Every inline image must be an https:// URL'
  const dash = /[–—]/
  if (dash.test(a.title) || dash.test(a.dek) || a.body.some((b) => ('text' in b && dash.test(b.text)) || (b.kind === 'list' && b.items.some((i) => dash.test(i))))) {
    return 'Remove em/en dashes: use a comma, colon or full stop'
  }
  return null
}

/** Take a published article down from remedae.app (the draft stays in the copilot). */
export async function unpublishFromRemedae(slug: string): Promise<{ error?: string }> {
  if (!(isSupabaseConfigured && supabase && functionsBase)) return { error: 'Not connected' }
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return { error: 'Sign in first' }
  try {
    const res = await fetch(`${functionsBase}/publish-remedae`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'unpublish', slug }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: data?.error ? String(data.error) : `Unpublish ${res.status}` }
    return {}
  } catch (e) {
    return { error: String(e) }
  }
}

export async function publishToRemedae(article: RemedaeArticle): Promise<{ url?: string; error?: string }> {
  const problem = validateRemedaeArticle(article)
  if (problem) return { error: problem }
  if (!(isSupabaseConfigured && supabase && functionsBase)) return { error: 'Not connected' }
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return { error: 'Sign in first' }
  try {
    const res = await fetch(`${functionsBase}/publish-remedae`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ article }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: data?.error ? String(data.error) : `Publish ${res.status}` }
    return { url: data?.url ? String(data.url) : `https://remedae.app/journal/${article.slug}` }
  } catch (e) {
    return { error: String(e) }
  }
}

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
    slug: slugify(input.title || 'untitled'),
    title: input.title.trim(),
    dek: input.dek.trim(),
    category: input.category,
    readMinutes,
    heroImage: hero,
    body,
  }
}

export async function publishToRemedae(article: RemedaeArticle): Promise<{ url?: string; error?: string }> {
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

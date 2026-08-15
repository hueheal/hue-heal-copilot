import { supabase, isSupabaseConfigured, functionsBase } from './supabase'
import { compressPhoto } from './imageCompress'
import { filterByBrand, withBrandInsert } from './brandScope'
import { generateNewsletter, saveNewsletter, bid, type Block } from './newsletter'
import type { Database } from './database.types'

export type JournalArticle = Database['public']['Tables']['journal_articles']['Row']

/** Where a published article will live on the site. Slug-based; the new site
    will serve these paths. Adjust here if the journal path changes. */
const JOURNAL_BASE = 'https://www.hueandheal.com/journal'
export function journalUrl(a: { slug?: string | null; title?: string | null }): string {
  const s = (a.slug && a.slug.trim()) ? a.slug.trim() : slugify(a.title || 'article')
  return `${JOURNAL_BASE}/${s}`
}

export interface GeneratedSection {
  heading: string
  body: string
  /** Optional pulled quote after the section (Remedae brief: a real, citeable person). */
  quote?: { text: string; attribution?: string }
  /** Optional numbered list after the section (Remedae brief: at most one per piece). */
  list?: string[]
}

export interface GeneratedJournal {
  title: string
  dek: string
  readingTime?: string
  sections: GeneratedSection[]
  takeaways: string[]
}

/** Map a generated article into editable, reorderable blocks (heading + text
    per section, plus any quote or list the writer placed). Images are added
    by hand in the editor. */
export function journalToBlocks(a: GeneratedJournal): Block[] {
  const out: Block[] = []
  for (const s of a.sections) {
    if (s.heading?.trim()) out.push({ id: bid(), type: 'heading', text: s.heading })
    if (s.body?.trim()) out.push({ id: bid(), type: 'text', text: s.body })
    if (s.quote?.text?.trim()) out.push({ id: bid(), type: 'quote', text: s.quote.text, attribution: s.quote.attribution ?? '' })
    if (Array.isArray(s.list) && s.list.some((i) => i.trim())) out.push({ id: bid(), type: 'list', items: s.list.filter((i) => i.trim()) })
  }
  return out
}

/** Flatten blocks to plain text (for body_md, search, and the teaser hook). */
export function blocksToText(blocks: Block[]): string {
  return blocks.map((b) => {
    if (b.type === 'heading' || b.type === 'text' || b.type === 'quote') return b.text
    if (b.type === 'list') return b.items.map((i, n) => `${n + 1}. ${i}`).join('\n')
    return ''
  }).filter(Boolean).join('\n\n')
}

/** Upload a journal image to the social-assets bucket, returning a public URL.
    Photos are resized to a 2000px long edge and re-encoded as WebP first, so
    heroes and inline images stay light on remedae.app and in email. */
export async function uploadJournalImage(raw: File): Promise<{ url?: string; error?: string }> {
  if (!(isSupabaseConfigured && supabase)) return { error: 'Not connected' }
  const { data: s } = await supabase.auth.getSession()
  const uid = s.session?.user.id
  if (!uid) return { error: 'Sign in first' }
  const file = await compressPhoto(raw)
  const safe = file.name.replace(/[^a-zA-Z0-9.]/g, '')
  const path = `${uid}/journal/img-${Date.now()}-${safe}`
  const { error } = await supabase.storage.from('social-assets').upload(path, file, { upsert: true, contentType: file.type || 'image/png' })
  if (error) return { error: error.message }
  return { url: supabase.storage.from('social-assets').getPublicUrl(path).data.publicUrl }
}

/** Turn a title into a url slug for the website journal. */
export function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
}

/** Claude writes a full journal article in the Hue & Heal voice. */
export async function generateJournal(input: {
  topic: string
  notes?: string
  brandName?: string
  toneOfVoice?: string
  writingGuidelines?: string
  /** 'report' writes in the wider-publication register (state-of-the-sector). */
  kind?: 'article' | 'report'
}): Promise<{ result: GeneratedJournal | null; error?: string }> {
  if (!(isSupabaseConfigured && supabase && functionsBase)) return { result: null, error: 'Not connected' }
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return { result: null, error: 'Sign in first' }
  try {
    const res = await fetch(`${functionsBase}/generate-journal`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { result: null, error: data?.error ? String(data.error) : `Draft ${res.status}` }
    return { result: data?.result ?? null }
  } catch (e) {
    return { result: null, error: String(e) }
  }
}

export async function listJournal(kind?: 'article' | 'report'): Promise<JournalArticle[]> {
  if (!(isSupabaseConfigured && supabase)) return []
  const { data } = await filterByBrand(supabase.from('journal_articles').select('*')).order('created_at', { ascending: false })
  const all = (data as JournalArticle[] | null) ?? []
  // kind column may not exist until migration 0014 runs; treat missing as 'article'.
  return kind ? all.filter((a) => (a.kind ?? 'article') === kind) : all
}

type JournalInput = Database['public']['Tables']['journal_articles']['Insert']

/* Optional columns added by later migrations. If the live database is behind
   (the migration was not run yet), retry the write without them rather than
   failing the whole save; a schema lag must never block writing or publishing. */
const OPTIONAL_COLUMNS = ['hero_image'] as const
function isMissingColumn(err: unknown): string | null {
  const msg = (err as { message?: string })?.message ?? ''
  const m = /column (?:journal_articles\.)?"?(\w+)"? does not exist/i.exec(msg) ?? /'(\w+)' column of 'journal_articles'/i.exec(msg)
  return m && (OPTIONAL_COLUMNS as readonly string[]).includes(m[1]) ? m[1] : null
}
function without<T extends object>(obj: T, key: string): T {
  const copy = { ...obj } as Record<string, unknown>
  delete copy[key]
  return copy as T
}

export async function saveJournal(input: JournalInput): Promise<JournalArticle> {
  if (!(isSupabaseConfigured && supabase)) throw new Error('Not connected')
  let payload = withBrandInsert(input)
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase.from('journal_articles').insert(payload).select('*').single()
    if (!error) return data as JournalArticle
    const missing = isMissingColumn(error)
    if (!missing) throw error
    payload = without(payload, missing)
  }
  throw new Error('Could not save the article')
}

export async function updateJournal(id: string, patch: Partial<JournalInput>): Promise<void> {
  if (!(isSupabaseConfigured && supabase)) throw new Error('Not connected')
  let p = patch
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await supabase.from('journal_articles').update(p).eq('id', id)
    if (!error) return
    const missing = isMissingColumn(error)
    if (!missing) throw error
    p = without(p, missing)
  }
  throw new Error('Could not save the article')
}

export async function deleteJournal(id: string): Promise<void> {
  if (!(isSupabaseConfigured && supabase)) return
  await supabase.from('journal_articles').delete().eq('id', id)
}

interface BrandVoice { name?: string; tone_of_voice?: string | null; writing_guidelines?: string | null }

/* Turn a finished article into a newsletter draft: AI writes a short captivating
   teaser, and a "Read the full piece" button links to the article on the site.
   Returns the new newsletter's id so the caller can open it in the composer. */
export async function createNewsletterFromArticle(
  article: { slug?: string | null; title: string; dek?: string; body_md?: string },
  brand: BrandVoice | null | undefined,
): Promise<{ id?: string; error?: string }> {
  const summary = [article.dek, article.body_md].filter(Boolean).join('\n\n').slice(0, 1800)
  const { result, error } = await generateNewsletter({
    mode: 'teaser',
    topic: article.title,
    notes: summary,
    brandName: brand?.name,
    toneOfVoice: brand?.tone_of_voice ?? undefined,
    writingGuidelines: brand?.writing_guidelines ?? undefined,
    template: 'The Journal',
  })
  if (error || !result) return { error: error ?? 'Could not write the teaser' }
  const url = journalUrl(article)
  let blocks = result.blocks
  const hasButton = blocks.some((b) => b.type === 'button')
  blocks = blocks.map((b) => (b.type === 'button' ? { ...b, label: b.label || 'Read the full piece', href: url } : b))
  if (!hasButton) blocks = [...blocks, { id: bid(), type: 'button', label: 'Read the full piece', href: url } as Block]
  try {
    const nl = await saveNewsletter({ subject: result.subject || article.title, preheader: result.preheader || article.dek || '', template: 'journal', blocks: blocks as unknown[] })
    return { id: nl.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

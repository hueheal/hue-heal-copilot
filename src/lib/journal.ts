import { supabase, isSupabaseConfigured, functionsBase } from './supabase'
import { filterByBrand, withBrandInsert } from './brandScope'
import type { Database } from './database.types'

export type JournalArticle = Database['public']['Tables']['journal_articles']['Row']

export interface GeneratedJournal {
  title: string
  dek: string
  readingTime?: string
  sections: { heading: string; body: string }[]
  takeaways: string[]
}

/** Assemble the structured article into editable markdown. */
export function journalToMarkdown(a: GeneratedJournal): string {
  return a.sections.map((s) => `## ${s.heading}\n\n${s.body}`).join('\n\n')
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

export async function listJournal(): Promise<JournalArticle[]> {
  if (!(isSupabaseConfigured && supabase)) return []
  const { data } = await filterByBrand(supabase.from('journal_articles').select('*')).order('created_at', { ascending: false })
  return (data as JournalArticle[] | null) ?? []
}

type JournalInput = Database['public']['Tables']['journal_articles']['Insert']

export async function saveJournal(input: JournalInput): Promise<JournalArticle> {
  if (!(isSupabaseConfigured && supabase)) throw new Error('Not connected')
  const { data, error } = await supabase.from('journal_articles').insert(withBrandInsert(input)).select('*').single()
  if (error) throw error
  return data as JournalArticle
}

export async function updateJournal(id: string, patch: Partial<JournalInput>): Promise<void> {
  if (!(isSupabaseConfigured && supabase)) throw new Error('Not connected')
  const { error } = await supabase.from('journal_articles').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteJournal(id: string): Promise<void> {
  if (!(isSupabaseConfigured && supabase)) return
  await supabase.from('journal_articles').delete().eq('id', id)
}

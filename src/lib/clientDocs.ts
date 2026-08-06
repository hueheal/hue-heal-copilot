import { supabase, isSupabaseConfigured } from './supabase'
import { withBrandInsert } from './brandScope'
import type { Database } from './database.types'

export type ClientDoc = Database['public']['Tables']['client_docs']['Row']
type DocInsert = Database['public']['Tables']['client_docs']['Insert']

/* ---- Form model (Typeform-style steps, stored in client_docs.form) ---- */
export interface FormStep {
  id: string
  type: 'text' | 'long' | 'choice' | 'scale' | 'statement'
  question: string
  help?: string
  options?: string[] // choice
}
let fseq = 1
export const fid = () => `f-${fseq++}`

/* ---- Document kinds: the studio's per-client document system.
   Form kinds run as step-by-step experiences in the client portal;
   content kinds are immersive branded documents. ---- */
export interface DocKind {
  key: string
  label: string
  icon: string
  blurb: string
  group: 'admin' | 'design'
  form?: boolean
  /** Renders as a 1920×1080 presentation deck with an inbuilt structure. */
  deck?: boolean
}

export const DOC_KINDS: DocKind[] = [
  { key: 'contract', label: 'Contract', icon: '§', blurb: 'Engagement terms, scope and signatures', group: 'admin' },
  { key: 'onboarding', label: 'Onboarding', icon: '✦', blurb: 'Welcome questionnaire the client completes step by step', group: 'admin', form: true },
  { key: 'brand-guidelines', label: 'Brand guidelines', icon: '◐', blurb: 'Voice, colour, type and use of the brand', group: 'design', deck: true },
  { key: 'discovery', label: 'Design discovery', icon: '⌕', blurb: 'Discovery questions to unearth the brief', group: 'design', form: true },
  { key: 'research', label: 'Research findings', icon: '◈', blurb: 'What we learned and what it means', group: 'design', deck: true },
  { key: 'sprint-showcase', label: 'Sprint showcase', icon: '▹', blurb: 'What shipped this sprint, and why it matters', group: 'design', deck: true },
  { key: 'ux-review', label: 'UX review', icon: '◳', blurb: 'Journey and usability findings with recommendations', group: 'design', deck: true },
  { key: 'product-spec', label: 'Product spec', icon: '▤', blurb: 'UI and product design documentation', group: 'design', deck: true },
]

export function docKind(key: string): DocKind {
  return DOC_KINDS.find((k) => k.key === key) ?? { key, label: key, icon: '·', blurb: '', group: 'design' }
}

/* ---- Local-mode fallback (in-memory, matches studioOps) ---- */
let dseq = 1
const localDocs: ClientDoc[] = []
const iso = () => new Date().toISOString()

/* ---- CRUD ---- */
export async function listClientDocs(clientId: string): Promise<ClientDoc[]> {
  if (!(isSupabaseConfigured && supabase)) return localDocs.filter((d) => d.client_id === clientId)
  const { data } = await supabase.from('client_docs').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
  return (data as ClientDoc[] | null) ?? []
}

export async function getClientDoc(id: string): Promise<ClientDoc | null> {
  if (!(isSupabaseConfigured && supabase)) return localDocs.find((d) => d.id === id) ?? null
  const { data } = await supabase.from('client_docs').select('*').eq('id', id).maybeSingle()
  return (data as ClientDoc | null) ?? null
}

export async function addClientDoc(input: DocInsert): Promise<ClientDoc> {
  if (!(isSupabaseConfigured && supabase)) {
    const doc: ClientDoc = {
      id: `local-d${dseq++}`, owner: 'local', brand_id: null, client_id: input.client_id,
      kind: input.kind ?? 'document', phase: input.phase ?? 'engage', format: input.format ?? 'deck',
      title: input.title ?? 'Untitled', dek: input.dek ?? '', blocks: input.blocks ?? [],
      form: input.form ?? [], responses: [], is_form: input.is_form ?? false,
      shared: false, status: 'draft', created_at: iso(), updated_at: iso(),
    }
    localDocs.unshift(doc)
    return doc
  }
  const { data, error } = await supabase.from('client_docs').insert(withBrandInsert(input)).select('*').single()
  if (error) throw error
  return data as ClientDoc
}

export async function updateClientDoc(id: string, patch: Partial<DocInsert>): Promise<void> {
  if (!(isSupabaseConfigured && supabase)) {
    const d = localDocs.find((x) => x.id === id)
    if (d) Object.assign(d, patch, { updated_at: iso() })
    return
  }
  const { error } = await supabase.from('client_docs').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteClientDoc(id: string): Promise<void> {
  if (!(isSupabaseConfigured && supabase)) {
    const i = localDocs.findIndex((x) => x.id === id)
    if (i >= 0) localDocs.splice(i, 1)
    return
  }
  await supabase.from('client_docs').delete().eq('id', id)
}

/* The client's portal space URL (private link). */
export function spaceLink(shareToken: string): string {
  return `${window.location.origin}/space/${shareToken}`
}

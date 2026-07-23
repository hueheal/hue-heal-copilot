import { supabase, isSupabaseConfigured, functionsBase } from './supabase'
import { filterByBrand, withBrandInsert } from './brandScope'
import type {
  Database,
  ClientStage,
  ProposalStatus,
  InvoiceStatus,
  ProposalPhase,
  ProposalContent,
} from './database.types'

export type Client = Database['public']['Tables']['clients']['Row']
export type NewClient = Database['public']['Tables']['clients']['Insert']
export type Proposal = Database['public']['Tables']['proposals']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']

export const STAGES: { key: ClientStage; label: string }[] = [
  { key: 'lead', label: 'Leads' },
  { key: 'proposal', label: 'Proposal out' },
  { key: 'active', label: 'Active' },
  { key: 'delivered', label: 'Delivered' },
]

export const PROPOSAL_STATUSES: ProposalStatus[] = ['draft', 'sent', 'viewed', 'accepted', 'declined']
export const INVOICE_STATUSES: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue']

/* ---- Money formatting ---- */
export function gbpCompact(pounds: number | null): string {
  if (pounds == null || pounds === 0) return '£—'
  if (pounds >= 1000) {
    const k = pounds / 1000
    return `£${Number.isInteger(k) ? k : k.toFixed(1)}k`
  }
  return `£${pounds}`
}
export function gbpFull(pounds: number): string {
  return `£${pounds.toLocaleString('en-GB')}`
}

export function statusTone(s: ProposalStatus | InvoiceStatus): 'accent' | 'positive' | 'muted' | 'warning' {
  if (s === 'overdue') return 'warning'
  if (s === 'paid' || s === 'accepted' || s === 'viewed') return 'positive'
  if (s === 'declined') return 'accent'
  return 'muted'
}

/* ---------------------------------------------------------------------------
   In-memory fallback store (local mode)
--------------------------------------------------------------------------- */
let localClients: Client[] = []
let localProposals: Proposal[] = []
let localInvoices: Invoice[] = []
let seq = 1
const iso = () => new Date().toISOString()

/* ---- Clients ---- */
export async function listClients(): Promise<Client[]> {
  if (supabase) {
    const { data, error } = await filterByBrand(supabase.from('clients').select('*')).order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  }
  return [...localClients]
}

export async function addClient(input: NewClient): Promise<Client> {
  if (supabase) {
    const { data, error } = await supabase.from('clients').insert(withBrandInsert(input)).select('*').single()
    if (error) throw error
    return data
  }
  const c: Client = {
    id: `local-c${seq++}`, owner: 'local', name: input.name, sector: input.sector ?? '',
    stage: input.stage ?? 'lead', value_gbp: input.value_gbp ?? null, note: input.note ?? '',
    created_at: iso(), updated_at: iso(),
  }
  localClients = [...localClients, c]
  return c
}

export async function updateClient(id: string, patch: Database['public']['Tables']['clients']['Update']): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('clients').update(patch).eq('id', id)
    if (error) throw error
    return
  }
  localClients = localClients.map((c) => (c.id === id ? { ...c, ...patch, updated_at: iso() } as Client : c))
}

export async function deleteClient(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) throw error
    return
  }
  localClients = localClients.filter((c) => c.id !== id)
}

/* ---- Proposals ---- */
export async function listProposals(): Promise<Proposal[]> {
  if (supabase) {
    const { data, error } = await filterByBrand(supabase.from('proposals').select('*')).order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }
  return [...localProposals]
}

export async function addProposal(input: Database['public']['Tables']['proposals']['Insert']): Promise<Proposal> {
  if (supabase) {
    const { data, error } = await supabase.from('proposals').insert(withBrandInsert(input)).select('*').single()
    if (error) throw error
    return data
  }
  const p: Proposal = {
    id: `local-p${seq++}`, owner: 'local', client_id: null, client_name: input.client_name ?? '',
    title: input.title, amount_gbp: input.amount_gbp ?? 0, status: input.status ?? 'draft',
    phases: input.phases ?? [], content: input.content ?? {}, sent_at: input.sent_at ?? null,
    created_at: iso(), updated_at: iso(),
  }
  localProposals = [p, ...localProposals]
  return p
}

export async function getProposal(id: string): Promise<Proposal | null> {
  if (supabase) {
    const { data, error } = await supabase.from('proposals').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data
  }
  return localProposals.find((p) => p.id === id) ?? null
}

export async function deleteProposal(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('proposals').delete().eq('id', id)
    if (error) throw error
    return
  }
  localProposals = localProposals.filter((p) => p.id !== id)
}

export async function updateProposal(id: string, patch: Database['public']['Tables']['proposals']['Update']): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('proposals').update(patch).eq('id', id)
    if (error) throw error
    return
  }
  localProposals = localProposals.map((p) => (p.id === id ? { ...p, ...patch, updated_at: iso() } as Proposal : p))
}

/* ---- Invoices ---- */
export async function listInvoices(): Promise<Invoice[]> {
  if (supabase) {
    const { data, error } = await filterByBrand(supabase.from('invoices').select('*')).order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }
  return [...localInvoices]
}

export async function addInvoice(input: Database['public']['Tables']['invoices']['Insert']): Promise<Invoice> {
  if (supabase) {
    const { data, error } = await supabase.from('invoices').insert(withBrandInsert(input)).select('*').single()
    if (error) throw error
    return data
  }
  const i: Invoice = {
    id: `local-i${seq++}`, owner: 'local', client_id: null, proposal_id: null,
    client_name: input.client_name ?? '', title: input.title, amount_gbp: input.amount_gbp ?? 0,
    status: input.status ?? 'draft', due_date: input.due_date ?? null, issued_at: input.issued_at ?? null,
    line_items: input.line_items ?? [], notes: input.notes ?? '',
    created_at: iso(), updated_at: iso(),
  }
  localInvoices = [i, ...localInvoices]
  return i
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  if (supabase) {
    const { data, error } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data
  }
  return localInvoices.find((i) => i.id === id) ?? null
}

export async function deleteInvoice(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (error) throw error
    return
  }
  localInvoices = localInvoices.filter((i) => i.id !== id)
}

export async function updateInvoice(id: string, patch: Database['public']['Tables']['invoices']['Update']): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('invoices').update(patch).eq('id', id)
    if (error) throw error
    return
  }
  localInvoices = localInvoices.map((i) => (i.id === id ? { ...i, ...patch, updated_at: iso() } as Invoice : i))
}

/* ---------------------------------------------------------------------------
   Proposal AI drafting — calls the generate-proposal edge function when
   connected, otherwise a local on-brand template so co-writing still works.
--------------------------------------------------------------------------- */
export interface DraftedProposal {
  title: string
  intro: string
  approach: string
  timeline: string
  terms: string
  phases: ProposalPhase[]
}

export function phasesTotal(phases: ProposalPhase[]): number {
  return phases.reduce((sum, p) => sum + (Number(p.fee) || 0), 0)
}

export function localProposalDraft(client: string, brief: string): DraftedProposal {
  const c = client.trim() || 'the client'
  const phases: ProposalPhase[] = [
    { name: 'Discovery', detail: 'Immersion, stakeholder conversations and a clear brief.', fee: 6000 },
    { name: 'Concept', detail: 'Experience principles and creative direction for sign-off.', fee: 9000 },
    { name: 'Design development', detail: 'Detailed design across the agreed touchpoints.', fee: 14000 },
    { name: 'Delivery', detail: 'Documentation, handover and on-site support.', fee: 9000 },
  ]
  return {
    title: 'Experience design engagement',
    intro:
      `${c} is creating a space where wellbeing is felt, not just described. This proposal sets out how ` +
      `Hue & Heal would partner with you to design that experience end to end.`,
    approach:
      brief.trim() ||
      'We begin by understanding the people and the place, translate that into a set of experience ' +
        'principles, then design every touchpoint against them — grounded, warm and quietly considered.',
    timeline: 'Approximately 10–12 weeks across four phases.',
    terms: '30% on commissioning, balance billed per phase on completion. Fees exclude VAT and expenses.',
    phases,
  }
}

export async function generateProposalDraft(
  client: string,
  brief: string,
  sector?: string,
): Promise<{ draft: DraftedProposal; source: 'claude' | 'local' }> {
  if (isSupabaseConfigured && supabase && functionsBase) {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (token) {
      try {
        const brand = await (async () => {
          const { data } = await supabase!.from('brand_kits').select('name, tokens').limit(1).maybeSingle()
          const tokens = (data?.tokens ?? {}) as Record<string, unknown>
          return {
            name: data?.name ?? 'Hue & Heal',
            tagline: typeof tokens.tagline === 'string' ? tokens.tagline : undefined,
            voice: typeof tokens.voice === 'string' ? tokens.voice : undefined,
          }
        })()
        const res = await fetch(`${functionsBase}/generate-proposal`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({ client, brief, sector, brand }),
        })
        if (res.ok) {
          const { proposal } = await res.json()
          if (proposal) return { draft: proposal as DraftedProposal, source: 'claude' }
        }
      } catch {
        /* fall through */
      }
    }
  }
  return { draft: localProposalDraft(client, brief), source: 'local' }
}

export function applyDraft(content: ProposalContent, draft: DraftedProposal): ProposalContent {
  return { ...content, intro: draft.intro, approach: draft.approach, timeline: draft.timeline, terms: draft.terms }
}

/* ---------------------------------------------------------------------------
   Sample data seeding — DISABLED.
   This used to auto-populate a new/empty account with demo clients, proposals
   and invoices on first sign-in. For the live studio that meant fake records
   appearing in real accounts, so it's now a no-op. Kept as an exported stub so
   existing callers don't need to change; safe to remove entirely later.
--------------------------------------------------------------------------- */
export function seedSampleData(): Promise<boolean> {
  return Promise.resolve(false)
}

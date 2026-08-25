import { supabase } from './supabase'
import { filterByBrand, withBrandInsert } from './brandScope'
import { listPosts, type Post } from './socialCopilot'
import { listJournal } from './journal'
import { listNewsletters } from './newsletter'
import { listProposals, listInvoices } from './studioOps'
import { isDesign, type Design } from './social/design'
import type { PostFormat } from './database.types'

/* ============================================================
   Phase 8 · the unified asset index, projects, and versions.
   The Library reads every content table into one shape; projects
   group related work; versions are JSONB snapshots on save.
   Local mode degrades to read-only aggregation / no-ops.
   ============================================================ */

export type AssetKind = 'social' | 'journal' | 'newsletter' | 'proposal' | 'invoice'
export const ASSET_KINDS: { key: AssetKind; label: string }[] = [
  { key: 'social', label: 'Social' },
  { key: 'journal', label: 'Journal' },
  { key: 'newsletter', label: 'Newsletters' },
  { key: 'proposal', label: 'Proposals' },
  { key: 'invoice', label: 'Invoices' },
]
export const KIND_TABLE: Record<AssetKind, string> = {
  social: 'social_posts', journal: 'journal_articles', newsletter: 'newsletters',
  proposal: 'proposals', invoice: 'invoices',
}

export interface Asset {
  id: string
  kind: AssetKind
  title: string
  sub: string
  status: 'draft' | 'published' | 'sent' | 'scheduled'
  when: string
  to: string
  image?: string
  design?: Design
  format?: PostFormat
  projectId?: string | null
}

export async function listAssets(): Promise<Asset[]> {
  const [posts, arts, news, props, invs] = await Promise.allSettled([
    listPosts(), listJournal('article'), listNewsletters(), listProposals(), listInvoices(),
  ])
  const out: Asset[] = []
  if (posts.status === 'fulfilled') for (const p of posts.value as (Post & { project_id?: string | null })[]) out.push({
    id: p.id, kind: 'social', title: p.headline || p.topic || 'Untitled post',
    sub: p.format === 'carousel' ? 'Carousel' : p.format === 'story' ? 'Story' : 'Post',
    status: p.status === 'published' ? 'published' : p.status === 'scheduled' ? 'scheduled' : 'draft',
    when: p.updated_at ?? p.created_at, to: `/create/social/${p.id}`,
    image: p.image_url ?? undefined, design: isDesign(p.design) ? (p.design as unknown as Design) : undefined,
    format: p.format, projectId: p.project_id ?? null,
  })
  if (arts.status === 'fulfilled') for (const a of arts.value as (typeof arts.value[number] & { project_id?: string | null })[]) out.push({
    id: a.id, kind: 'journal', title: a.title || 'Untitled article', sub: 'Article',
    status: a.published_at ? 'published' : 'draft',
    when: a.updated_at ?? a.created_at, to: `/create/journal?open=${a.id}`,
    image: a.hero_image || undefined, projectId: a.project_id ?? null,
  })
  if (news.status === 'fulfilled') for (const n of news.value as (typeof news.value[number] & { project_id?: string | null })[]) out.push({
    id: n.id, kind: 'newsletter', title: n.subject || 'Untitled newsletter', sub: 'Newsletter',
    status: n.sent_at ? 'sent' : 'draft',
    when: n.updated_at ?? n.created_at, to: `/create/newsletter?open=${n.id}`, projectId: n.project_id ?? null,
  })
  if (props.status === 'fulfilled') for (const p of props.value as (typeof props.value[number] & { project_id?: string | null })[]) out.push({
    id: p.id, kind: 'proposal', title: p.title || `${p.client_name} proposal`, sub: p.client_name,
    status: 'draft', when: p.updated_at ?? p.created_at, to: `/proposals/${p.id}`, projectId: p.project_id ?? null,
  })
  if (invs.status === 'fulfilled') for (const i of invs.value as (typeof invs.value[number] & { project_id?: string | null })[]) out.push({
    id: i.id, kind: 'invoice', title: i.title || `${i.client_name} invoice`, sub: i.client_name,
    status: 'draft', when: i.updated_at ?? i.created_at, to: `/invoices/${i.id}`, projectId: i.project_id ?? null,
  })
  out.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
  return out
}

/* ---- Projects ---- */
export interface Project {
  id: string; name: string; description: string; status: string
  brand_id: string | null; created_at: string; updated_at: string
}

export async function listProjects(): Promise<Project[]> {
  if (!supabase) return []
  const q = supabase.from('projects').select('*').neq('status', 'archived').order('updated_at', { ascending: false })
  const { data, error } = await filterByBrand(q)
  if (error) return []
  return (data ?? []) as Project[]
}

export async function createProject(name: string, description = ''): Promise<Project | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('projects')
    .insert(withBrandInsert({ name, description }) as never).select('*').single()
  if (error) throw error
  return data as Project
}

export async function assignToProject(kind: AssetKind, assetId: string, projectId: string | null): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from(KIND_TABLE[kind]).update({ project_id: projectId } as never).eq('id', assetId)
  if (error) throw error
  if (projectId) await supabase.from('projects').update({ updated_at: new Date().toISOString() } as never).eq('id', projectId)
}

/* ---- Versions ---- */
export interface AssetVersion { id: string; label: string; snapshot: Record<string, unknown>; created_at: string }
const KEEP = 30

/** Snapshot an asset's editable payload on save. Fire-and-forget: version
    history must never make saving fail. */
export async function saveVersion(kind: AssetKind, assetId: string, snapshot: Record<string, unknown>, label = ''): Promise<void> {
  if (!supabase || assetId.startsWith('local-')) return
  try {
    const table = KIND_TABLE[kind]
    await supabase.from('asset_versions').insert({ asset_table: table, asset_id: assetId, snapshot, label } as never)
    const { data } = await supabase.from('asset_versions').select('id')
      .eq('asset_table', table).eq('asset_id', assetId)
      .order('created_at', { ascending: false }).range(KEEP, KEEP + 40)
    if (data?.length) await supabase.from('asset_versions').delete().in('id', data.map((r) => (r as { id: string }).id))
  } catch { /* never block a save */ }
}

export async function listVersions(kind: AssetKind, assetId: string): Promise<AssetVersion[]> {
  if (!supabase) return []
  const { data } = await supabase.from('asset_versions').select('id, label, snapshot, created_at')
    .eq('asset_table', KIND_TABLE[kind]).eq('asset_id', assetId)
    .order('created_at', { ascending: false }).limit(KEEP)
  return (data ?? []) as AssetVersion[]
}

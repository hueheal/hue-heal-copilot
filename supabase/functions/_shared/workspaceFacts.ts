// Server-side workspace snapshot for scheduled role runs: same shape the
// client builds for on-demand runs, computed with the service role and scoped
// to the role's owner + brand world.
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const KN_LABELS: Record<string, string> = {
  business: 'BUSINESS', offerings: 'PRODUCTS & SERVICES', clients: 'CLIENTS & CASE STUDIES',
  team: 'TEAM', strategy: 'STRATEGY & GOALS', market: 'MARKET', faqs: 'FAQS & TERMINOLOGY',
}

export function knowledge(k: Record<string, string> | null | undefined): string | undefined {
  if (!k) return undefined
  const parts = Object.entries(k)
    .filter(([, v]) => (v ?? '').trim())
    .map(([key, v]) => `${KN_LABELS[key] ?? key.toUpperCase()}: ${String(v).slice(0, 700)}`)
  return parts.length ? parts.join('\n') : undefined
}

interface Row { title?: string; subject?: string; headline?: string; topic?: string; status?: string; published_at?: string | null; sent_at?: string | null; updated_at?: string; created_at?: string }

export async function buildFacts(admin: SupabaseClient, owner: string, brandId: string | null): Promise<string> {
  const scope = <T,>(q: T): T => {
    let x = (q as { eq: (a: string, b: unknown) => unknown }).eq('owner', owner)
    if (brandId) x = (x as { eq: (a: string, b: unknown) => unknown }).eq('brand_id', brandId)
    return x as T
  }
  const grab = async (table: string, cols: string) => {
    const { data } = await scope(admin.from(table).select(cols)).order('updated_at', { ascending: false }).limit(60)
    return (data ?? []) as Row[]
  }
  const [posts, arts, news, clients, subs] = await Promise.all([
    grab('social_posts', 'headline, topic, status, updated_at, created_at'),
    grab('journal_articles', 'title, published_at, updated_at, created_at'),
    grab('newsletters', 'subject, sent_at, updated_at, created_at'),
    scope(admin.from('clients').select('name, stage')).limit(10).then((r) => (r.data ?? []) as { name: string; stage: string }[]),
    // Scoped to the brand world like everything else: one workspace's role
    // must never see another workspace's audience.
    scope(admin.from('subscribers').select('id', { count: 'exact', head: true })).then((r) => r.count ?? 0),
  ])
  const days = (iso?: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null)
  const last = (rows: Row[]) => days(rows[0]?.updated_at ?? rows[0]?.created_at)
  const lines: string[] = []
  lines.push(`Counts: ${posts.length} social posts, ${arts.length} journal articles, ${news.length} newsletters.`)
  lines.push(`Cadence: ${posts.length ? `last social ${last(posts)}d ago` : 'no social yet'}; ${arts.length ? `last article ${last(arts)}d ago` : 'no articles yet'}; ${news.length ? `last newsletter ${last(news)}d ago` : 'no newsletters yet'}. Subscribers: ${subs}.`)
  if (clients.length) lines.push(`Client pipeline: ${clients.map((c) => `${c.name} (${c.stage})`).join(', ')}.`)
  const recent = [
    ...posts.slice(0, 6).map((p) => ({ t: `[social · ${p.status ?? 'draft'}] ${p.headline || p.topic || 'Untitled'}`, w: p.updated_at ?? p.created_at })),
    ...arts.slice(0, 5).map((a) => ({ t: `[journal · ${a.published_at ? 'published' : 'draft'}] ${a.title || 'Untitled'}`, w: a.updated_at ?? a.created_at })),
    ...news.slice(0, 3).map((n) => ({ t: `[newsletter · ${n.sent_at ? 'sent' : 'draft'}] ${n.subject || 'Untitled'}`, w: n.updated_at ?? n.created_at })),
  ].sort((a, b) => new Date(b.w ?? 0).getTime() - new Date(a.w ?? 0).getTime()).slice(0, 12)
  if (recent.length) { lines.push('Recent pieces, newest first:'); for (const r of recent) lines.push(`- ${r.t} (${days(r.w)}d ago)`) }
  return lines.join('\n')
}

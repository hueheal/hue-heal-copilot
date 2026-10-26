import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBrand } from '../lib/brandContext'

/* ============================================================
   The workspace at a glance: what its numbers say this week,
   whether its site is up, what is due today, and cards to the
   places the founder uses most (admin, library, website,
   templates). Numbers come from the portfolio connector's
   checks of each product's own database; the links live on the
   brand (brand_profiles.home_links) and are edited here.
   ============================================================ */

interface Link { label: string; sub?: string; url: string }
interface Stat { n: number; label: string; delta: number | null }
interface Health { label: string; status: string; summary: string }
interface Task { id: string; title: string; due: string | null; is_now: boolean }

type Json = Record<string, unknown>
const db = () => supabase as unknown as { from: (t: string) => any } // eslint-disable-line @typescript-eslint/no-explicit-any
const WEEK = 7 * 86400000
const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date())
const dueLabel = (d: string | null) => {
  if (!d) return ''
  const t = todayIso()
  if (d < t) return 'overdue'
  if (d === t) return 'today'
  return new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
const external = (url: string) => /^https?:\/\//.test(url)

/** The product's own numbers: its latest check against the one closest to a week before. */
async function productStats(brandId: string): Promise<{ stats: Stat[]; asOf: string | null }> {
  const { data: conns } = await db().from('connections').select('id, config').eq('brand_id', brandId).eq('provider', 'supabase')
  const conn = (conns ?? [])[0] as { id: string; config: Json } | undefined
  if (!conn) return { stats: [], asOf: null }
  const { data: checks } = await db().from('connection_checks').select('metrics, checked_at').eq('connection_id', conn.id).not('metrics', 'is', null).order('checked_at', { ascending: false }).limit(40)
  const rows = (checks ?? []) as { metrics: Record<string, number>; checked_at: string }[]
  if (!rows.length) return { stats: [], asOf: null }
  const now = rows[0]
  const then = rows.find((r) => new Date(now.checked_at).getTime() - new Date(r.checked_at).getTime() >= WEEK - 12 * 3600000)
  const show = ((conn.config?.show ?? []) as [string, string][])
  const keys = show.length ? show : Object.keys(now.metrics).map((k) => [k, k.replace(/_/g, ' ')] as [string, string])
  return {
    asOf: now.checked_at,
    stats: keys.filter(([k]) => typeof now.metrics[k] === 'number').map(([k, words]) => {
      const [one, many] = words.split('|')
      const n = now.metrics[k]
      return { n, label: n === 1 ? one : (many ?? one), delta: then && typeof then.metrics[k] === 'number' ? n - then.metrics[k] : null }
    }),
  }
}

/** Copilot's own numbers for the workspace: its audience and what it has published. */
async function studioStats(brandId: string): Promise<Stat[]> {
  const weekAgo = new Date(Date.now() - WEEK).toISOString()
  const [subs, subsNew, pub, drafts] = await Promise.all([
    db().from('subscribers').select('id', { count: 'exact', head: true }).eq('brand_id', brandId).eq('status', 'subscribed'),
    db().from('subscribers').select('id', { count: 'exact', head: true }).eq('brand_id', brandId).eq('status', 'subscribed').gte('created_at', weekAgo),
    db().from('journal_articles').select('id', { count: 'exact', head: true }).eq('brand_id', brandId).eq('status', 'published'),
    db().from('journal_articles').select('id', { count: 'exact', head: true }).eq('brand_id', brandId).neq('status', 'published'),
  ])
  const n = (r: { count: number | null }) => r.count ?? 0
  return [
    { n: n(subs), label: n(subs) === 1 ? 'subscriber' : 'subscribers', delta: n(subsNew) },
    { n: n(pub), label: n(pub) === 1 ? 'Journal piece live' : 'Journal pieces live', delta: null },
    { n: n(drafts), label: n(drafts) === 1 ? 'draft in progress' : 'drafts in progress', delta: null },
  ]
}

export default function WorkspaceInsights() {
  const { current } = useBrand()
  const nav = useNavigate()
  const [stats, setStats] = useState<Stat[] | null>(null)
  const [asOf, setAsOf] = useState<string | null>(null)
  const [health, setHealth] = useState<Health[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Link[]>([])

  useEffect(() => {
    if (!supabase) {
      // Sample mode: example numbers and links, so the layout can be seen.
      setStats([{ n: 12, label: 'families', delta: 3 }, { n: 7, label: 'playing this week', delta: 2 }, { n: 41, label: 'quests this week', delta: -5 }, { n: 4, label: 'founding applications', delta: 0 }])
      setHealth([{ label: 'Website', status: 'ok', summary: 'Up' }])
      setTasks([{ id: 's1', title: 'Send the emails to the Founding Families', due: todayIso(), is_now: true }])
      setLinks([{ label: 'Admin insights', sub: 'Families, applications, plans and feedback', url: 'https://example.com/admin' }, { label: 'Document library', sub: 'The admin Library', url: 'https://example.com/library' }, { label: 'Website', sub: 'example.com', url: 'https://example.com' }])
      return
    }
    if (!current?.id) { setStats([]); return }
    let off = false
    const id = current.id
    setStats(null)
    void (async () => {
      const [product, studio, conns, open, brand] = await Promise.all([
        productStats(id),
        studioStats(id),
        db().from('connections').select('label, kind, status, summary').eq('brand_id', id).in('kind', ['website', 'hosting']),
        db().from('life_tasks').select('id, title, due, is_now').eq('brand_id', id).neq('status', 'done').order('due', { ascending: true, nullsFirst: false }).limit(30),
        db().from('brand_profiles').select('home_links').eq('id', id).maybeSingle(),
      ])
      if (off) return
      // A product's own numbers lead; the studio's sit after them.
      setStats([...product.stats, ...studio.filter((s) => s.n > 0 || !product.stats.length)].slice(0, 8))
      setAsOf(product.asOf)
      setHealth(((conns.data ?? []) as Health[]))
      const t = todayIso()
      setTasks(((open.data ?? []) as Task[]).filter((x) => x.is_now || (x.due && x.due <= t)).sort((a, b) => Number(b.is_now) - Number(a.is_now)).slice(0, 4))
      setLinks(((brand.data?.home_links ?? []) as Link[]).filter((l) => l?.url))
    })()
    return () => { off = true }
  }, [current?.id])

  async function saveLinks() {
    const clean = draft.map((l) => ({ label: l.label.trim(), sub: (l.sub ?? '').trim(), url: l.url.trim() })).filter((l) => l.label && l.url)
    setLinks(clean); setEditing(false)
    if (supabase && current?.id) await db().from('brand_profiles').update({ home_links: clean }).eq('id', current.id)
  }
  const open = (url: string) => (external(url) ? window.open(url, '_blank', 'noopener') : nav(url))

  const down = health.filter((h) => h.status === 'down' || h.status === 'warn')
  return (
    <section className="ck-insights" aria-label={`${current?.name ?? 'Workspace'} at a glance`}>
      <div className="ck-insights-head">
        <h2 className="ck-h2" style={{ margin: 0 }}>This week</h2>
        <span className="ck-insights-meta">
          {down.length ? <span className="ck-insights-warn">{down.map((h) => `${h.label}: ${h.summary}`).join(' · ')}</span>
            : health.length ? `Site and hosting healthy${asOf ? ` · numbers from ${new Date(asOf).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}` : ''}
        </span>
      </div>

      {stats === null ? (
        <div className="ck-stats">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="ck-skeleton" style={{ height: 92 }} />)}</div>
      ) : stats.length ? (
        <div className="ck-stats">
          {stats.map((s) => (
            <div key={s.label} className="ck-stat">
              <span className="ck-stat-n">{s.n.toLocaleString('en-GB')}</span>
              <span className="ck-stat-label">{s.label}</span>
              {s.delta !== null && <span className="ck-stat-delta" data-dir={s.delta > 0 ? 'up' : s.delta < 0 ? 'down' : 'flat'}>{s.delta > 0 ? `+${s.delta}` : s.delta < 0 ? `${s.delta}` : 'no change'} this week</span>}
            </div>
          ))}
        </div>
      ) : (
        <p className="ck-insights-empty">No numbers yet. Connect this workspace's product data in Portfolio and its numbers appear here.</p>
      )}

      {tasks.length > 0 && (
        <div className="ck-insights-today">
          <span className="ck-insights-label">Due today</span>
          <ul>{tasks.map((t) => <li key={t.id}><span>{t.title}</span><span className="ck-insights-due" data-late={dueLabel(t.due) === 'overdue' ? '1' : undefined}>{dueLabel(t.due) || 'now'}</span></li>)}</ul>
        </div>
      )}

      <div className="ck-insights-head" style={{ marginTop: 28 }}>
        <h2 className="ck-h2" style={{ margin: 0 }}>Go to</h2>
        {!editing && <button className="ck-pill" onClick={() => { setDraft(links.length ? links : [{ label: '', sub: '', url: '' }]); setEditing(true) }}>Edit links</button>}
      </div>
      {editing ? (
        <div className="ck-links-edit">
          {draft.map((l, i) => (
            <div key={i} className="ck-links-row">
              <input aria-label="Name" placeholder="Name" value={l.label} onChange={(e) => setDraft(draft.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <input aria-label="Description" placeholder="What it is" value={l.sub ?? ''} onChange={(e) => setDraft(draft.map((x, j) => (j === i ? { ...x, sub: e.target.value } : x)))} />
              <input aria-label="Address" placeholder="https://… or /v2/radar" value={l.url} onChange={(e) => setDraft(draft.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
              <button className="ck-pill" aria-label={`Remove ${l.label || 'link'}`} onClick={() => setDraft(draft.filter((_, j) => j !== i))}>Remove</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ck-pill" onClick={() => setDraft([...draft, { label: '', sub: '', url: '' }])}>Add a link</button>
            <button className="ck-pill" data-on="1" onClick={() => void saveLinks()}>Save</button>
            <button className="ck-pill" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : links.length ? (
        <div className="ck-links">
          {links.map((l) => (
            <button key={`${l.label}-${l.url}`} className="ck-link-card" onClick={() => open(l.url)}>
              <span className="ck-tile-label">{l.label}{external(l.url) ? ' ↗' : ''}</span>
              {l.sub && <span className="ck-tile-sub">{l.sub}</span>}
            </button>
          ))}
        </div>
      ) : (
        <p className="ck-insights-empty">No links yet. Add the places you open most for {current?.name ?? 'this workspace'}.</p>
      )}
    </section>
  )
}

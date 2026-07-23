import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { USER, greeting, longDate } from '../data/studio'
import { useBrand } from '../lib/brandContext'
import { listClients, listProposals, listInvoices, gbpCompact, type Client, type Proposal, type Invoice } from '../lib/studioOps'
import { listPosts, type Post } from '../lib/socialCopilot'

const now = new Date()

interface Attention {
  glyph: string
  title: string
  meta: string
  action: string
  tone: 'accent' | 'muted' | 'positive'
  chipBg: string
  chipFg: string
  to: string
}

export default function Dashboard() {
  const firstName = USER.name.split(' ')[0]
  const { current } = useBrand()
  const [clients, setClients] = useState<Client[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let off = false
    Promise.all([
      listClients().catch(() => []),
      listProposals().catch(() => []),
      listInvoices().catch(() => []),
      listPosts().catch(() => []),
    ]).then(([c, p, i, s]) => {
      if (off) return
      setClients(c); setProposals(p); setInvoices(i); setPosts(s); setLoaded(true)
    })
    return () => { off = true }
  }, [])

  /* ---- Metrics, computed from this brand's real records ---- */
  const metrics = useMemo(() => {
    const out = proposals.filter((p) => p.status === 'sent' || p.status === 'viewed')
      .reduce((s, p) => s + (p.amount_gbp ?? 0), 0)
    const monthKey = now.toISOString().slice(0, 7)
    const invoiced = invoices
      .filter((i) => i.status !== 'draft' && (i.issued_at ?? i.created_at ?? '').slice(0, 7) === monthKey)
      .reduce((s, i) => s + (i.amount_gbp ?? 0), 0)
    const active = clients.filter((c) => c.stage === 'active').length
    const scheduled = posts.filter((p) => p.status === 'scheduled').length
    return [
      { value: gbpCompact(out), label: 'Proposals out' },
      { value: gbpCompact(invoiced), label: 'Invoiced this month' },
      { value: String(active), label: 'Active clients' },
      { value: String(scheduled), label: 'Posts scheduled' },
    ]
  }, [proposals, invoices, clients, posts])

  /* ---- Needs attention, from real records ---- */
  const attention = useMemo<Attention[]>(() => {
    const items: Attention[] = []
    const today = now.toISOString().slice(0, 10)

    invoices
      .filter((i) => i.status === 'overdue' || (i.status === 'sent' && (i.due_date ?? '') !== '' && (i.due_date as string) < today))
      .slice(0, 3)
      .forEach((i) => items.push({
        glyph: '№', title: `${i.client_name} · ${i.title}`,
        meta: i.due_date ? `Invoice · due ${i.due_date}` : 'Invoice · overdue',
        action: 'Chase', tone: 'accent', chipBg: 'var(--hh-copper)', chipFg: 'var(--hh-on-accent, #F6EFE4)',
        to: `/invoices/${i.id}`,
      }))

    proposals
      .filter((p) => p.status === 'sent' || p.status === 'viewed')
      .slice(0, 3)
      .forEach((p) => items.push({
        glyph: '◈', title: `${p.client_name} · ${p.title}`,
        meta: `Proposal · ${p.status}${p.sent_at ? ` ${daysAgo(p.sent_at)}` : ''}`,
        action: 'Follow up', tone: 'muted', chipBg: 'var(--hh-anthracite)', chipFg: 'var(--hh-ember)',
        to: `/proposals/${p.id}`,
      }))

    posts
      .filter((p) => p.status === 'scheduled')
      .slice(0, 3)
      .forEach((p) => items.push({
        glyph: '▦', title: p.headline || p.topic,
        meta: p.scheduled_for ? `Scheduled · ${new Date(p.scheduled_for).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Scheduled',
        action: 'Ready', tone: 'positive', chipBg: 'var(--hh-mushroom)', chipFg: '#2A211A',
        to: `/social/studio/${p.id}`,
      }))

    clients
      .filter((c) => c.stage === 'lead')
      .slice(0, 2)
      .forEach((c) => items.push({
        glyph: '◎', title: c.name, meta: c.note || 'New lead',
        action: 'Prep', tone: 'muted', chipBg: 'var(--hh-cacao)', chipFg: 'var(--hh-ember)',
        to: '/clients',
      }))

    return items.slice(0, 6)
  }, [invoices, proposals, posts, clients])

  const summary = loaded
    ? summarise(proposals, posts, invoices)
    : 'Loading your workspace…'

  return (
    <>
      {/* ---- Header ---- */}
      <header style={{ padding: '34px 40px', borderBottom: '1px solid var(--hh-line)' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>
          {longDate(now)}{current ? ` · ${current.name}` : ''}
        </div>
        <h1
          className="hh-serif"
          style={{ fontWeight: 400, fontSize: 'clamp(30px, 4vw, 52px)', letterSpacing: '-0.01em', margin: '8px 0 0' }}
        >
          {greeting(now)}, {firstName}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-muted)', margin: '14px 0 0' }}>{summary}</p>
      </header>

      <div style={{ padding: '30px 40px' }}>
        {/* ---- Metric row ---- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {metrics.map((m) => (
            <div
              key={m.label}
              className="hh-card-hover"
              style={{ background: 'var(--hh-bone)', border: '1px solid var(--hh-line-card)', borderRadius: 14, padding: 22 }}
            >
              <div className="hh-serif" style={{ fontWeight: 300, fontSize: 48, lineHeight: 1, color: 'var(--text-accent)' }}>
                {m.value}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* ---- Two-column body ---- */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Link
              to="/social"
              className="hh-atmos hh-card-hover"
              style={{ display: 'block', color: 'var(--text-on-ink)', borderRadius: 16, padding: 30, position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-on-ink-faint)' }}>
                  Social Copilot
                </div>
                <div className="hh-serif" style={{ fontWeight: 300, fontSize: 32, lineHeight: 1.1, margin: '12px 0', maxWidth: '20ch' }}>
                  Draft this week’s “guide to” in a minute
                </div>
                <span
                  className="hh-btn"
                  style={{ display: 'inline-flex', background: 'var(--hh-copper)', color: 'var(--hh-on-accent, #F6EFE4)', borderRadius: 999, padding: '11px 22px', fontSize: 13, fontWeight: 500 }}
                >
                  ✦ Open
                </span>
              </div>
            </Link>

            <Link
              to="/proposals"
              className="hh-card-hover"
              style={{ display: 'block', background: 'var(--hh-bone)', border: '1px solid var(--hh-line-card)', borderRadius: 16, padding: 30 }}
            >
              <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>
                Proposals &amp; Invoices
              </div>
              <div className="hh-serif" style={{ fontWeight: 400, fontSize: 28, lineHeight: 1.12, margin: '12px 0 10px', maxWidth: '24ch' }}>
                Brief a scope, get a priced proposal
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-muted)', margin: 0, maxWidth: '44ch' }}>
                Phases and fees follow your standard rates. Convert to an invoice in one click.
              </p>
              <span className="hh-link-underline" style={{ marginTop: 16 }}>Open ⟶</span>
            </Link>
          </div>

          {/* Right column — Needs attention */}
          <div style={{ background: 'var(--hh-bone)', border: '1px solid var(--hh-line-card)', borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 12, letterSpacing: '0.04em', color: 'var(--text-faint)', marginBottom: 16 }}>
              Needs attention
            </div>
            {attention.map((item, i) => (
              <Link
                key={i}
                to={item.to}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--hh-line)', color: 'inherit', textDecoration: 'none' }}
              >
                <span
                  style={{ width: 30, height: 30, borderRadius: 8, background: item.chipBg, color: item.chipFg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}
                >
                  {item.glyph}
                </span>
                <div style={{ lineHeight: 1.3, flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{item.meta}</div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: item.tone === 'accent' ? 'var(--text-accent)' : item.tone === 'positive' ? 'var(--status-positive)' : 'var(--text-muted)',
                  }}
                >
                  {item.action}
                </span>
              </Link>
            ))}
            {loaded && attention.length === 0 && (
              <div style={{ borderTop: '1px solid var(--hh-line)', paddingTop: 16, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Nothing needs chasing in {current?.name ?? 'this workspace'} — you’re clear.
              </div>
            )}
            {!loaded && <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>Loading…</div>}
          </div>
        </div>
      </div>
    </>
  )
}

function daysAgo(iso: string): string {
  const d = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 86400000))
  return d === 0 ? 'today' : d === 1 ? '1 day ago' : `${d} days ago`
}

function summarise(proposals: Proposal[], posts: Post[], invoices: Invoice[]): string {
  const awaiting = proposals.filter((p) => p.status === 'sent' || p.status === 'viewed').length
  const scheduled = posts.filter((p) => p.status === 'scheduled').length
  const overdue = invoices.filter((i) => i.status === 'overdue').length
  const bits: string[] = []
  if (awaiting) bits.push(`${awaiting} proposal${awaiting > 1 ? 's' : ''} awaiting reply`)
  if (scheduled) bits.push(`${scheduled} post${scheduled > 1 ? 's' : ''} scheduled`)
  if (overdue) bits.push(`${overdue} invoice${overdue > 1 ? 's' : ''} overdue`)
  if (!bits.length) return 'Nothing outstanding — a clear run at the work that matters.'
  return bits.join(', ').replace(/,([^,]*)$/, ', and$1') + '.'
}

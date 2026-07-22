import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../lib/auth'
import { listPosts, type Post } from '../lib/socialCopilot'
import { listInvoices, listProposals, type Invoice, type Proposal } from '../lib/studioOps'

type EventKind = 'post' | 'invoice' | 'proposal'
interface CalEvent {
  date: Date
  label: string
  kind: EventKind
  href?: string
}

const KIND_COLOR: Record<EventKind, string> = {
  post: 'var(--hh-copper)',
  invoice: 'var(--hh-terracotta)',
  proposal: 'var(--status-positive)',
}
const KIND_LABEL: Record<EventKind, string> = { post: 'Scheduled post', invoice: 'Invoice due', proposal: 'Proposal' }

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function Calendar() {
  const auth = useAuth()
  const nav = useNavigate()
  const [cursor, setCursor] = useState(() => new Date())
  const [events, setEvents] = useState<CalEvent[]>([])
  const gated = auth.mode === 'connected' && !auth.session

  useEffect(() => {
    if (gated) { setEvents([]); return }
    ;(async () => {
      try {
        const [posts, invoices, proposals] = await Promise.all([listPosts(), listInvoices(), listProposals()])
        const evs: CalEvent[] = []
        posts.forEach((p: Post) => {
          if (p.status === 'scheduled' && p.scheduled_for)
            evs.push({ date: new Date(p.scheduled_for), label: p.headline || p.topic, kind: 'post', href: `/social/studio/${p.id}` })
        })
        invoices.forEach((i: Invoice) => {
          if (i.due_date) evs.push({ date: new Date(i.due_date), label: `${i.client_name} · invoice due`, kind: 'invoice', href: `/invoices/${i.id}` })
        })
        proposals.forEach((p: Proposal) => {
          if (p.sent_at) evs.push({ date: new Date(p.sent_at), label: `${p.client_name} · proposal`, kind: 'proposal', href: `/proposals/${p.id}` })
        })
        setEvents(evs)
      } catch { /* ignore */ }
    })()
  }, [auth.session, auth.mode, gated])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const monthName = cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const cells = useMemo(() => {
    const first = new Date(year, month, 1)
    const offset = (first.getDay() + 6) % 7 // Mon-first
    const days = new Date(year, month + 1, 0).getDate()
    const out: (Date | null)[] = []
    for (let i = 0; i < offset; i++) out.push(null)
    for (let d = 1; d <= days; d++) out.push(new Date(year, month, d))
    while (out.length % 7 !== 0) out.push(null)
    return out
  }, [year, month])

  const today = new Date()

  return (
    <>
      <PageHeader
        eyebrow="Planner"
        title="Calendar"
        subtitle="Scheduled posts, invoice due dates and live proposals across the month — your studio at a glance."
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="hh-btn" onClick={() => setCursor(new Date(year, month - 1, 1))} style={navBtn}>‹</button>
            <span style={{ fontSize: 14, minWidth: 150, textAlign: 'center' }}>{monthName}</span>
            <button className="hh-btn" onClick={() => setCursor(new Date(year, month + 1, 1))} style={navBtn}>›</button>
          </div>
        }
      />
      <div style={{ padding: '24px 40px' }}>
        {gated ? (
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Sign in (bottom-left) to see your calendar.</p>
        ) : (
          <>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 18, marginBottom: 16 }}>
              {(['post', 'invoice', 'proposal'] as EventKind[]).map((k) => (
                <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-muted)' }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: KIND_COLOR[k] }} />
                  {KIND_LABEL[k]}
                </span>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--hh-line)', border: '1px solid var(--hh-line)', borderRadius: 12, overflow: 'hidden' }}>
              {WEEKDAYS.map((w) => (
                <div key={w} style={{ background: 'var(--hh-bone)', padding: '10px 12px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>{w}</div>
              ))}
              {cells.map((day, i) => {
                const dayEvents = day ? events.filter((e) => sameDay(e.date, day)).sort((a, b) => a.date.getTime() - b.date.getTime()) : []
                const isToday = day && sameDay(day, today)
                return (
                  <div key={i} style={{ background: 'var(--surface-raised)', minHeight: 104, padding: 8, opacity: day ? 1 : 0.5 }}>
                    {day && (
                      <>
                        <div style={{ fontSize: 12, color: isToday ? 'var(--hh-copper)' : 'var(--text-faint)', fontWeight: isToday ? 600 : 400, marginBottom: 6 }}>
                          {day.getDate()}
                        </div>
                        {dayEvents.slice(0, 3).map((e, j) => (
                          <div
                            key={j}
                            onClick={() => e.href && nav(e.href)}
                            className="hh-btn"
                            title={e.label}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-body)', padding: '2px 0', cursor: e.href ? 'pointer' : 'default' }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: KIND_COLOR[e.kind], flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {e.date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) !== '00:00' ? `${e.date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} ` : ''}
                              {e.label}
                            </span>
                          </div>
                        ))}
                        {dayEvents.length > 3 && <div style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>+{dayEvents.length - 3} more</div>}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            {events.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 16 }}>
                Nothing dated yet — schedule a post (Social Copilot) or set invoice due dates and they’ll appear here.
              </p>
            )}
          </>
        )}
      </div>
    </>
  )
}

const navBtn: React.CSSProperties = { background: 'none', border: '1px solid var(--hh-line)', borderRadius: 999, width: 30, height: 30, color: 'var(--text-body)', fontSize: 16 }

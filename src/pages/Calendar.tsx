import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../lib/auth'
import { useIsMobile } from '../lib/useIsMobile'
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
  post: 'var(--ck-accent)',
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
  const isMobile = useIsMobile()
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
            evs.push({ date: new Date(p.scheduled_for), label: p.headline || p.topic, kind: 'post', href: `/create/social/${p.id}` })
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
  // This month's events, ordered — the mobile "Scheduled" list.
  const monthEvents = useMemo(
    () => events
      .filter((e) => e.date.getFullYear() === year && e.date.getMonth() === month)
      .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [events, year, month],
  )

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
      <div style={{ padding: isMobile ? '18px 16px' : '24px 40px' }}>
        {gated ? (
          <p style={{ fontSize: 14, color: 'var(--ck-muted)' }}>Sign in (bottom-left) to see your calendar.</p>
        ) : (
          <>
            {/* Legend + month count */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 18px', marginBottom: 16 }}>
              {(['post', 'invoice', 'proposal'] as EventKind[]).map((k) => (
                <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--ck-muted)' }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: KIND_COLOR[k] }} />
                  {KIND_LABEL[k]}
                </span>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ck-faint)' }}>{monthEvents.length} scheduled</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--ck-line)', border: '1px solid var(--ck-line)', borderRadius: 12, overflow: 'hidden' }}>
              {WEEKDAYS.map((w) => (
                <div key={w} style={{ background: 'var(--ck-surface)', padding: isMobile ? '8px 0' : '10px 12px', fontSize: isMobile ? 10 : 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ck-faint)', textAlign: isMobile ? 'center' : 'left' }}>{isMobile ? w[0] : w}</div>
              ))}
              {cells.map((day, i) => {
                const dayEvents = day ? events.filter((e) => sameDay(e.date, day)).sort((a, b) => a.date.getTime() - b.date.getTime()) : []
                const isToday = day && sameDay(day, today)
                if (isMobile) {
                  // Compact month: day number + event dots; details live in the list below.
                  return (
                    <div key={i} style={{ background: 'var(--surface-raised)', minHeight: 46, padding: '6px 0 5px', opacity: day ? 1 : 0.5, textAlign: 'center' }}>
                      {day && (
                        <>
                          <div style={{ fontSize: 12.5, color: isToday ? '#FFFFFF' : 'var(--ck-ink)', fontWeight: isToday ? 600 : 400, width: 24, height: 24, borderRadius: '50%', background: isToday ? 'var(--ck-accent)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            {day.getDate()}
                          </div>
                          <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginTop: 3, minHeight: 5 }}>
                            {dayEvents.slice(0, 3).map((e, j) => (
                              <span key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: KIND_COLOR[e.kind] }} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )
                }
                return (
                  <div key={i} style={{ background: 'var(--surface-raised)', minHeight: 104, padding: 8, opacity: day ? 1 : 0.5 }}>
                    {day && (
                      <>
                        <div style={{ fontSize: 12, color: isToday ? 'var(--ck-accent)' : 'var(--ck-faint)', fontWeight: isToday ? 600 : 400, marginBottom: 6 }}>
                          {day.getDate()}
                        </div>
                        {dayEvents.slice(0, 3).map((e, j) => (
                          <div
                            key={j}
                            onClick={() => e.href && nav(e.href)}
                            className="hh-btn"
                            title={e.label}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--ck-ink)', padding: '2px 0', cursor: e.href ? 'pointer' : 'default' }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: KIND_COLOR[e.kind], flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {e.date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) !== '00:00' ? `${e.date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} ` : ''}
                              {e.label}
                            </span>
                          </div>
                        ))}
                        {dayEvents.length > 3 && <div style={{ fontSize: 10.5, color: 'var(--ck-faint)' }}>+{dayEvents.length - 3} more</div>}
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Scheduled list (mobile): the month's events, one tap into each */}
            {isMobile && monthEvents.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ck-faint)', marginBottom: 6 }}>Scheduled</div>
                {monthEvents.map((e, i) => (
                  <div key={i} onClick={() => e.href && nav(e.href)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: '1px solid var(--ck-line)', cursor: e.href ? 'pointer' : 'default' }}>
                    <div style={{ width: 42, flexShrink: 0, textAlign: 'center' }}>
                      <div className="hh-serif" style={{ fontSize: 19, lineHeight: 1, color: 'var(--ck-ink)' }}>{e.date.getDate()}</div>
                      <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ck-faint)', marginTop: 2 }}>{e.date.toLocaleDateString('en-GB', { month: 'short' })}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ck-faint)', marginTop: 2 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: KIND_COLOR[e.kind] }} />
                        {KIND_LABEL[e.kind]}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--ck-muted)', flexShrink: 0 }}>
                      {e.date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) !== '00:00' ? e.date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {events.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--ck-faint)', marginTop: 16 }}>
                Nothing dated yet — schedule a post, or set invoice due dates, and they’ll appear here.
              </p>
            )}
          </>
        )}
      </div>
    </>
  )
}

const navBtn: React.CSSProperties = { background: 'none', border: '1px solid var(--ck-line)', borderRadius: 999, width: 30, height: 30, color: 'var(--ck-ink)', fontSize: 16 }

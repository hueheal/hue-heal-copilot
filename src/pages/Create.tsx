import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../lib/auth'
import { useBrand } from '../lib/brandContext'
import { useIsMobile } from '../lib/useIsMobile'
import { FAMILIES, familyOf, recentContent, type FamilyKey, type RecentItem } from '../lib/create'

const STATUS_TONE: Record<string, string> = { draft: 'var(--status-neutral)', scheduled: 'var(--status-warning)', published: 'var(--status-positive)', sent: 'var(--status-positive)' }

export default function Create() {
  const auth = useAuth()
  const { current: brand } = useBrand()
  const nav = useNavigate()
  const isMobile = useIsMobile()
  const gated = auth.mode === 'connected' && !auth.session

  const [family, setFamily] = useState<FamilyKey>('social')
  const [recent, setRecent] = useState<RecentItem[]>([])
  const fam = familyOf(family)

  useEffect(() => {
    if (gated) return
    recentContent().then(setRecent).catch(() => setRecent([]))
  }, [gated, brand?.id])

  const inFamily = useMemo(() => recent.filter((r) => r.family === family).slice(0, 6), [recent, family])

  function openFormat(to?: string, soon?: boolean) {
    if (soon || !to) return
    nav(to)
  }

  const pad = isMobile ? '16px' : '28px 40px'

  return (
    <>
      <PageHeader
        eyebrow="Create"
        title="Content Studio"
        subtitle="Brief a topic once and the copilot lays it out in the brand — social, journal, newsletter or report."
      />

      {gated ? (
        <p style={{ padding: pad, fontSize: 14, color: 'var(--text-muted)' }}>Sign in (bottom-left) to start creating.</p>
      ) : (
        <div style={{ padding: pad, display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Family switcher */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {FAMILIES.map((f) => {
              const active = f.key === family
              return (
                <button key={f.key} onClick={() => setFamily(f.key)} className="hh-btn"
                  style={{ borderRadius: 999, padding: '9px 18px', fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
                    border: active ? '1px solid var(--hh-anthracite)' : '1px solid var(--hh-line)',
                    background: active ? 'var(--hh-anthracite)' : 'transparent',
                    color: active ? 'var(--text-on-ink)' : 'var(--text-body)' }}>
                  {f.label}
                </button>
              )
            })}
          </div>

          <div style={{ fontFamily: 'var(--font-voice)', fontStyle: 'italic', fontSize: isMobile ? 18 : 20, color: 'var(--text-muted)', lineHeight: 1.4, marginTop: -8 }}>
            {fam.blurb}
          </div>

          {/* Formats */}
          <div>
            <div style={railLabel}>Format</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {fam.formats.map((c) => (
                <button key={c.key} onClick={() => openFormat(c.to, c.soon)} disabled={c.soon}
                  style={{ textAlign: 'left', display: 'flex', gap: 14, alignItems: 'center', padding: '18px 18px',
                    background: 'var(--hh-lotus)', border: '1px solid var(--hh-line-card)', borderRadius: 14,
                    cursor: c.soon ? 'default' : 'pointer', opacity: c.soon ? 0.7 : 1 }}>
                  <span style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 12, background: 'var(--hh-bone)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--text-accent)' }}>{c.icon}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text-strong)' }}>{c.label}</span>
                      {c.soon && <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--status-neutral)', border: '1px solid var(--hh-line)', borderRadius: 999, padding: '2px 7px' }}>Soon</span>}
                    </span>
                    <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{c.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent in family */}
          <div>
            <div style={railLabel}>Recent in {fam.label}</div>
            {inFamily.length === 0 ? (
              <div style={{ fontSize: 13.5, color: 'var(--text-faint)', padding: '10px 0' }}>Nothing yet — create something and it lands here.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {inFamily.map((r) => (
                  <button key={r.id} onClick={() => nav(r.to)} style={rowStyle}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{r.type}</span>
                    </span>
                    <span style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: STATUS_TONE[r.status] ?? 'var(--status-neutral)' }}>{r.status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content library (all families) */}
          <div>
            <div style={railLabel}>Content library</div>
            {recent.length === 0 ? (
              <div style={{ fontSize: 13.5, color: 'var(--text-faint)', padding: '10px 0' }}>Nothing here yet — compose something and it lands in the library.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recent.slice(0, 12).map((r) => (
                  <button key={r.family + r.id} onClick={() => nav(r.to)} style={rowStyle}>
                    <span style={{ width: 74, flexShrink: 0, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>{familyOf(r.family).label}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                    <span style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: STATUS_TONE[r.status] ?? 'var(--status-neutral)' }}>{r.status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

const railLabel: React.CSSProperties = { fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 12 }
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 4px', background: 'none', borderTop: '1px solid var(--hh-line)', borderLeft: 'none', borderRight: 'none', borderBottom: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }

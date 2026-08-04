import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../lib/auth'
import { useBrand } from '../lib/brandContext'
import { useIsMobile } from '../lib/useIsMobile'
import { FAMILIES, familyOf, recentContent, type FamilyKey, type RecentItem } from '../lib/create'
import { generateIdeas, listIdeas, saveIdea, deleteIdea, savePost, type GeneratedIdea, type Idea } from '../lib/socialCopilot'
import type { PostFormat } from '../lib/database.types'

const STATUS_TONE: Record<string, string> = { draft: 'var(--status-neutral)', scheduled: 'var(--status-warning)', published: 'var(--status-positive)', sent: 'var(--status-positive)' }

export default function Create() {
  const auth = useAuth()
  const { current: brand } = useBrand()
  const nav = useNavigate()
  const isMobile = useIsMobile()
  const gated = auth.mode === 'connected' && !auth.session

  const [family, setFamily] = useState<FamilyKey>('social')
  const [recent, setRecent] = useState<RecentItem[]>([])
  const [creating, setCreating] = useState<string | null>(null)
  const fam = familyOf(family)

  // Ideas (social): theme → hooks, saved to a backlog, one tap into the editor.
  const [theme, setTheme] = useState('')
  const [ideas, setIdeas] = useState<GeneratedIdea[]>([])
  const [ideasBusy, setIdeasBusy] = useState(false)
  const [backlog, setBacklog] = useState<Idea[]>([])

  useEffect(() => {
    if (gated) return
    recentContent().then(setRecent).catch(() => setRecent([]))
    listIdeas().then(setBacklog).catch(() => {})
  }, [gated, brand?.id])

  const inFamily = useMemo(() => recent.filter((r) => r.family === family).slice(0, 20), [recent, family])

  /* Start a post: social formats create the draft and open the editor directly. */
  async function newPost(format: PostFormat, topic = '', headline = '') {
    setCreating(format)
    try {
      const post = await savePost({
        topic, format, sector: 'hospitality', accent: 'copper', platform: 'instagram',
        headline, caption: '', hashtags: [], slides: [], image_url: null, status: 'draft',
      })
      nav(`/create/social/${post.id}`)
    } catch { setCreating(null) }
  }
  function openFormat(f: { to?: string; soon?: boolean; postFormat?: string; key: string }) {
    if (f.soon) return
    if (f.postFormat) { newPost(f.postFormat as PostFormat); return }
    if (f.to) nav(f.to)
  }

  async function onIdeas() {
    if (!theme.trim()) return
    setIdeasBusy(true)
    try { const { ideas: g } = await generateIdeas(theme); setIdeas(g) } finally { setIdeasBusy(false) }
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
                <button key={c.key} onClick={() => openFormat(c)} disabled={c.soon || creating !== null}
                  style={{ textAlign: 'left', display: 'flex', gap: 14, alignItems: 'center', padding: '18px 18px',
                    background: 'var(--hh-lotus)', border: '1px solid var(--hh-line-card)', borderRadius: 14,
                    cursor: c.soon ? 'default' : 'pointer', opacity: c.soon || (creating && creating !== c.postFormat) ? 0.7 : 1 }}>
                  <span style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 12, background: 'var(--hh-bone)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--text-accent)' }}>{c.icon}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text-strong)' }}>{creating && creating === c.postFormat ? 'Opening…' : c.label}</span>
                      {c.soon && <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--status-neutral)', border: '1px solid var(--hh-line)', borderRadius: 999, padding: '2px 7px' }}>Soon</span>}
                    </span>
                    <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{c.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Ideas (social): a theme becomes hooks; a hook becomes a draft in the editor */}
          {family === 'social' && (
            <div>
              <div style={railLabel}>Ideas</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Theme — e.g. rest as a luxury" onKeyDown={(e) => { if (e.key === 'Enter') onIdeas() }}
                  style={{ flex: 1, border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 10, padding: '11px 13px', fontSize: 14, fontFamily: 'var(--font-sans)' }} />
                <button className="hh-btn" onClick={onIdeas} disabled={ideasBusy || !theme.trim()}
                  style={{ background: 'var(--hh-copper)', color: 'var(--hh-on-accent, #F6EFE4)', border: 'none', borderRadius: 999, padding: '11px 20px', fontSize: 13, fontWeight: 500, cursor: ideasBusy || !theme.trim() ? 'default' : 'pointer', opacity: ideasBusy || !theme.trim() ? 0.55 : 1, whiteSpace: 'nowrap' }}>
                  {ideasBusy ? '…' : '✦ Ideas'}
                </button>
              </div>
              {(ideas.length > 0 || backlog.length > 0) && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column' }}>
                  {ideas.map((g, i) => (
                    <div key={`g-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 4px', borderTop: '1px solid var(--hh-line)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-strong)' }}>{g.hook}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{g.angle}</div>
                      </div>
                      <button className="hh-btn" onClick={async () => { await saveIdea(theme, g); setBacklog(await listIdeas()) }} title="Save for later"
                        style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 14, cursor: 'pointer' }}>☆</button>
                      <button className="hh-btn" onClick={() => newPost(g.format, theme.trim() || g.hook, g.hook)}
                        style={{ background: 'none', border: '1px solid var(--hh-copper)', color: 'var(--text-accent)', borderRadius: 999, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>Use ⟶</button>
                    </div>
                  ))}
                  {backlog.map((b) => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 4px', borderTop: '1px solid var(--hh-line)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: 'var(--text-strong)' }}>{b.hook}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>Saved · {b.theme || 'idea'}</div>
                      </div>
                      <button className="hh-btn" onClick={async () => { await deleteIdea(b.id); setBacklog(await listIdeas()) }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 14, cursor: 'pointer' }}>×</button>
                      <button className="hh-btn" onClick={() => newPost(b.format ?? 'carousel', b.theme || b.hook, b.hook)}
                        style={{ background: 'none', border: '1px solid var(--hh-copper)', color: 'var(--text-accent)', borderRadius: 999, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>Use ⟶</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Library — scoped to the family you're in */}
          <div>
            <div style={railLabel}>{fam.label} library{inFamily.length ? ` · ${inFamily.length}` : ''}</div>
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
        </div>
      )}
    </>
  )
}

const railLabel: React.CSSProperties = { fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 12 }
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 4px', background: 'none', borderTop: '1px solid var(--hh-line)', borderLeft: 'none', borderRight: 'none', borderBottom: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }

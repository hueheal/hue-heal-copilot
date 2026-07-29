import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader, { PillButton } from '../components/PageHeader'
import Logo from '../components/Logo'
import ConfirmButton from '../components/ConfirmButton'
import { useAuth } from '../lib/auth'
import {
  type Brief,
  type GeneratedCopy,
  type GeneratedIdea,
  type Post,
  type Idea,
  FORMAT_LABEL,
  SECTOR_LABEL,
  localCopy,
  generateCopy,
  generateIdeas,
  listIdeas,
  saveIdea,
  deleteIdea,
  listPosts,
  savePost,
  schedulePost,
  deletePost,
} from '../lib/socialCopilot'
import type { PostFormat, Sector, Accent } from '../lib/database.types'

const FORMATS = Object.keys(FORMAT_LABEL) as PostFormat[]
const SECTORS = Object.keys(SECTOR_LABEL) as Sector[]
const ACCENTS: { key: Accent; label: string; color: string }[] = [
  { key: 'lime', label: 'Lime', color: 'var(--hh-lime)' },
  { key: 'terracotta', label: 'Terracotta', color: 'var(--hh-terracotta)' },
  { key: 'copper', label: 'Copper', color: 'var(--hh-ember)' },
]

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className="hh-btn"
      onClick={onClick}
      style={{
        borderRadius: 999,
        padding: '9px 16px',
        fontSize: 12.5,
        fontWeight: active ? 600 : 400,
        border: active ? '1px solid var(--hh-anthracite)' : '1px solid var(--hh-line)',
        background: active ? 'var(--hh-anthracite)' : 'transparent',
        color: active ? 'var(--text-on-ink)' : 'var(--text-body)',
      }}
    >
      {children}
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{children}</div>
    </div>
  )
}

export default function SocialCopilot() {
  const auth = useAuth()
  const nav = useNavigate()
  const [topic, setTopic] = useState('Hotels')
  const [format, setFormat] = useState<PostFormat>('carousel')
  const [sector, setSector] = useState<Sector>('hospitality')
  const [accent, setAccent] = useState<Accent>('lime')

  const [result, setResult] = useState<GeneratedCopy | null>(null)
  const [source, setSource] = useState<'claude' | 'local' | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [scheduleAt, setScheduleAt] = useState('')

  // Ideas step
  const [theme, setTheme] = useState('')
  const [ideas, setIdeas] = useState<GeneratedIdea[]>([])
  const [ideasSource, setIdeasSource] = useState<'claude' | 'local' | null>(null)
  const [ideasBusy, setIdeasBusy] = useState(false)
  const [backlog, setBacklog] = useState<Idea[]>([])

  const brief: Brief = { topic, format, sector, accent }

  // Live preview uses the local template until a generation replaces it;
  // changing any input resets back to the live preview.
  useEffect(() => {
    setResult(null)
    setSource(null)
    setImageUrl(null)
  }, [topic, format, sector, accent])

  useEffect(() => {
    listPosts().then(setPosts).catch(() => {})
    listIdeas().then(setBacklog).catch(() => {})
  }, [auth.session])

  async function onGenerateIdeas() {
    setIdeasBusy(true)
    try {
      const { ideas: g, source } = await generateIdeas(theme)
      setIdeas(g)
      setIdeasSource(source)
    } finally {
      setIdeasBusy(false)
    }
  }

  async function useIdea(g: GeneratedIdea) {
    const t = theme.trim() || g.hook
    setTopic(t)
    setFormat(g.format)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setBusy(true)
    setStatus(`Generating “${g.hook}”…`)
    try {
      const { copy, source } = await generateCopy({ topic: t, format: g.format, sector, accent })
      setResult(copy)
      setSource(source)
      setStatus(`Ready — “${g.hook}”. Edit the copy, or hit Co-design to lay it out.`)
    } finally {
      setBusy(false)
    }
  }

  async function onSaveIdea(g: GeneratedIdea) {
    try {
      await saveIdea(theme, g)
      setBacklog(await listIdeas())
    } catch { /* ignore */ }
  }

  async function onDeleteIdea(id: string) {
    await deleteIdea(id)
    setBacklog(await listIdeas())
  }

  async function onDesign() {
    setBusy(true); setStatus(null)
    try {
      const c = result ?? localCopy(brief)
      const post = await savePost({
        topic, format, sector, accent, platform: 'instagram',
        headline: c.headline, caption: c.caption, hashtags: c.hashtags, slides: c.slides,
        image_url: imageUrl, status: 'draft',
      })
      setPosts(await listPosts())
      nav(`/social/studio/${post.id}`)
    } catch (e) {
      setStatus(`Couldn’t open studio: ${e instanceof Error ? e.message : e}`)
    } finally { setBusy(false) }
  }

  const copy = useMemo<GeneratedCopy>(() => result ?? localCopy(brief), [result, topic, format, sector, accent])
  const accentVar = accent === 'lime' ? 'var(--hh-lime)' : accent === 'terracotta' ? 'var(--hh-terracotta)' : 'var(--hh-ember)'
  const cleanTopic = copy.headline || topic.trim() || 'wellness spaces'

  async function onGenerate() {
    setBusy(true)
    setStatus(null)
    try {
      const { copy: c, source: s } = await generateCopy(brief)
      setResult(c)
      setSource(s)
      setStatus(s === 'claude' ? 'Generated with Claude' : 'Generated on-device (connect Supabase for Claude)')
    } finally {
      setBusy(false)
    }
  }

  async function onSave(scheduleLocal?: string) {
    setBusy(true)
    setStatus(null)
    try {
      const c = result ?? localCopy(brief)
      const post = await savePost({
        topic, format, sector, accent, platform: 'instagram',
        headline: c.headline, caption: c.caption, hashtags: c.hashtags, slides: c.slides,
        image_url: imageUrl, status: 'draft',
      })
      if (scheduleLocal) {
        const iso = new Date(scheduleLocal).toISOString()
        await schedulePost(post.id, iso)
        setStatus(`Scheduled · ${new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`)
      } else {
        setStatus('Saved to drafts')
      }
      setPosts(await listPosts())
    } catch (e) {
      setStatus(`Couldn’t save: ${e instanceof Error ? e.message : e}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Social Copilot"
        title="Create on-brand content"
        subtitle="Brief a topic, pick a format and a sector, and the copilot lays out a branded artifact — caption, hashtags and suggestions included. Edit anything, then schedule."
        action={
          <PillButton tone="accent" onClick={onGenerate}>
            {busy ? '…' : '✦ Generate'}
          </PillButton>
        }
      />

      {status && (
        <div style={{ padding: '10px 40px', borderBottom: '1px solid var(--hh-line)', fontSize: 12.5, color: 'var(--text-muted)', background: 'var(--hh-lotus)' }}>
          {status}
        </div>
      )}

      {/* ---- Ideas step ---- */}
      <div style={{ padding: '30px 40px 0' }}>
        <div style={{ background: 'var(--hh-bone)', border: '1px solid var(--hh-line-card)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--hh-copper)' }}>
              Ideas{ideasSource ? ` · ${ideasSource === 'claude' ? 'Claude' : 'on-device'}` : ''}
            </div>
            <input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="A theme or campaign — e.g. 'wellness in hospitality', 'autumn reset'…"
              style={{ flex: 1, border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'var(--font-sans)' }}
            />
            <PillButton tone="accent" onClick={onGenerateIdeas}>{ideasBusy ? 'Thinking…' : '✦ Generate ideas'}</PillButton>
          </div>

          {ideas.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {ideas.map((g, i) => (
                <div key={i} style={{ background: 'var(--hh-lotus)', border: '1px solid var(--hh-line-card)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ alignSelf: 'flex-start', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', border: '1px solid var(--hh-line)', borderRadius: 999, padding: '2px 8px' }}>
                    {FORMAT_LABEL[g.format] ?? g.format}
                  </span>
                  <div className="hh-serif" style={{ fontSize: 18, lineHeight: 1.15 }}>{g.hook}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{g.angle}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-faint)', fontStyle: 'italic' }}>{g.rationale}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button className="hh-btn" onClick={() => useIdea(g)} style={{ background: 'var(--hh-anthracite)', color: 'var(--text-on-ink)', border: 'none', borderRadius: 999, padding: '7px 14px', fontSize: 12 }}>Use this ⟶</button>
                    <button className="hh-btn" onClick={() => onSaveIdea(g)} style={{ background: 'none', color: 'var(--text-muted)', border: '1px solid var(--hh-line)', borderRadius: 999, padding: '7px 14px', fontSize: 12 }}>Save</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {backlog.length > 0 && (
            <div style={{ marginTop: ideas.length ? 20 : 4 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.04em', color: 'var(--text-faint)', marginBottom: 6 }}>Backlog · {backlog.length}</div>
              {backlog.map((b) => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: '1px solid var(--hh-line)' }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', minWidth: 66 }}>{b.format ? FORMAT_LABEL[b.format] : '—'}</span>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{b.hook}</span>
                  <button className="hh-btn" onClick={() => useIdea({ hook: b.hook, angle: b.angle, format: (b.format ?? 'carousel'), rationale: '' })} style={{ background: 'none', border: 'none', color: 'var(--hh-copper)', fontSize: 12 }}>Use ⟶</button>
                  <ConfirmButton onConfirm={() => onDeleteIdea(b.id)} title="Delete idea" style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 15, lineHeight: 1 }}>×</ConfirmButton>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '30px 40px', display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start' }}>
        {/* ---- Brief panel ---- */}
        <div style={{ background: 'var(--hh-bone)', border: '1px solid var(--hh-line-card)', borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 10 }}>Topic</div>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Hotels, Schools, Hospitals…"
            style={{ width: '100%', border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 10, padding: '12px 14px', fontSize: 15, color: 'var(--text-strong)', marginBottom: 22, fontFamily: 'var(--font-sans)' }}
          />

          <Field label="Format">
            {FORMATS.map((f) => (
              <Chip key={f} active={format === f} onClick={() => setFormat(f)}>{FORMAT_LABEL[f]}</Chip>
            ))}
          </Field>

          <Field label="Sector">
            {SECTORS.map((s) => (
              <Chip key={s} active={sector === s} onClick={() => setSector(s)}>{SECTOR_LABEL[s]}</Chip>
            ))}
          </Field>

          <Field label="Adaptive accent">
            {ACCENTS.map((a) => (
              <button
                key={a.key}
                className="hh-btn"
                onClick={() => setAccent(a.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 999, padding: '8px 14px 8px 10px', fontSize: 12.5, fontWeight: accent === a.key ? 600 : 400, border: accent === a.key ? '1px solid var(--hh-anthracite)' : '1px solid var(--hh-line)', background: accent === a.key ? 'var(--hh-anthracite)' : 'transparent', color: accent === a.key ? 'var(--text-on-ink)' : 'var(--text-body)' }}
              >
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: a.color }} />
                {a.label}
              </button>
            ))}
          </Field>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <PillButton tone="accent" onClick={onGenerate}>{busy ? 'Working…' : '✦ Generate copy'}</PillButton>
          </div>
        </div>

        {/* ---- Live preview ---- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
              Preview · {FORMAT_LABEL[format]} · 4:5{source ? ` · ${source === 'claude' ? 'Claude' : 'on-device'}` : ''}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <PillButton tone="ghost" onClick={() => onSave()}>Save draft</PillButton>
              <PillButton tone="accent" onClick={onDesign}>✦ Co-design</PillButton>
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                style={{ border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 999, padding: '9px 14px', fontSize: 12.5, fontFamily: 'var(--font-sans)', color: 'var(--text-body)' }}
              />
              <PillButton tone="ink" onClick={() => onSave(scheduleAt || undefined)}>Schedule ⟶</PillButton>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {/* Branded artifact canvas */}
            <div
              className="hh-atmos"
              style={{ width: 384, height: 480, borderRadius: 18, padding: 32, display: 'flex', flexDirection: 'column', color: 'var(--text-on-ink)', position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-raised)' }}
            >
              {imageUrl && (
                <img src={imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.72 }} />
              )}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Logo height={15} style={{ color: 'var(--text-on-ink)' }} />
                <span style={{ marginLeft: 'auto', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-on-ink-faint)' }}>{SECTOR_LABEL[sector]}</span>
              </div>
              <div style={{ position: 'relative', marginTop: 'auto' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: accentVar, marginBottom: 14 }}>A guide to</div>
                <div className="hh-serif" style={{ fontWeight: 300, fontSize: 52, lineHeight: 1.0, letterSpacing: '-0.02em' }}>{cleanTopic}</div>
                <div style={{ marginTop: 20, height: 2, width: 56, background: accentVar }} />
                <div className="hh-voice" style={{ fontStyle: 'italic', fontSize: 18, color: 'var(--text-on-ink-muted)', marginTop: 18 }}>Designing the future of wellness</div>
              </div>
            </div>

            {/* Caption + hashtags + slides */}
            <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--hh-bone)', border: '1px solid var(--hh-line-card)', borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 10 }}>Caption</div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--text-body)' }}>{copy.caption}</p>
              </div>
              <div style={{ background: 'var(--hh-bone)', border: '1px solid var(--hh-line-card)', borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 10 }}>Hashtags</div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: 'var(--hh-copper)' }}>{copy.hashtags.join('  ')}</p>
              </div>
              {copy.slides.length > 0 && (
                <div style={{ background: 'var(--hh-bone)', border: '1px solid var(--hh-line-card)', borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 10 }}>Slides · {copy.slides.length}</div>
                  <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: 'var(--text-muted)' }}>
                    {copy.slides.map((s, i) => (
                      <li key={i}><strong style={{ color: 'var(--text-body)' }}>{s.heading}</strong> — {s.body}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>

          {/* Saved posts */}
          <div style={{ background: 'var(--hh-bone)', border: '1px solid var(--hh-line-card)', borderRadius: 16, padding: 24, marginTop: 8 }}>
            <div style={{ fontSize: 12, letterSpacing: '0.04em', color: 'var(--text-faint)', marginBottom: 8 }}>
              Content library · {posts.length}
            </div>
            {posts.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-faint)', margin: '10px 0 0' }}>Nothing saved yet — generate a post and hit Save draft or Schedule.</p>
            )}
            {posts.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderTop: '1px solid var(--hh-line)' }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--hh-anthracite)', color: 'var(--hh-ember)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>▦</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.headline || p.topic}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{FORMAT_LABEL[p.format]} · {SECTOR_LABEL[p.sector]}</div>
                </div>
                <span style={{ fontSize: 11, color: p.status === 'scheduled' ? 'var(--status-positive)' : 'var(--text-muted)' }}>
                  {p.status === 'scheduled' && p.scheduled_for
                    ? `Scheduled · ${new Date(p.scheduled_for).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                    : p.status}
                </span>
                <button className="hh-btn" onClick={() => nav(`/social/studio/${p.id}`)} style={{ background: 'none', border: 'none', color: 'var(--hh-copper)', fontSize: 12 }}>Open ⟶</button>
                <ConfirmButton
                  onConfirm={async () => { await deletePost(p.id); setPosts(await listPosts()) }}
                  title="Delete post"
                  style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 15, lineHeight: 1 }}
                >
                  ×
                </ConfirmButton>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

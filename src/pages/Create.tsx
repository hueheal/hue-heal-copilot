import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useBrand } from '../lib/brandContext'
import Composer from '../components/chrome/Composer'
import AssetCard from '../components/chrome/AssetCard'
import { listAssets, type Asset } from '../lib/assets'
import { generateIdeas, listIdeas, saveIdea, deleteIdea, savePost, type GeneratedIdea, type Idea } from '../lib/socialCopilot'
import type { PostFormat } from '../lib/database.types'
import { IcLayers, IcImage, IcDoc, IcMail, IcInvoice, IcChart } from '../components/chrome/icons'

/* ============================================================
   Create (Phase 6): one entry point for everything the studio
   makes. Composer first; the type tiles are the explicit route;
   the ideas backlog feeds social; recents link into the Library.
   ============================================================ */

const TILES: { label: string; sub: string; icon: () => React.ReactNode; run: 'carousel' | 'portrait' | 'story' | 'journal' | 'newsletter' | 'report' | 'proposals' }[] = [
  { label: 'Carousel', sub: 'Multi-slide Instagram', icon: IcLayers, run: 'carousel' },
  { label: 'Single post', sub: 'One clear statement', icon: IcImage, run: 'portrait' },
  { label: 'Story', sub: '9:16 vertical', icon: IcImage, run: 'story' },
  { label: 'Journal', sub: 'Long-form article', icon: IcDoc, run: 'journal' },
  { label: 'Newsletter', sub: 'To the subscriber list', icon: IcMail, run: 'newsletter' },
  { label: 'Report', sub: 'Research territory', icon: IcChart, run: 'report' },
  { label: 'Proposal · invoice', sub: 'Client documents', icon: IcInvoice, run: 'proposals' },
]

export default function Create() {
  const auth = useAuth()
  const { current: brand } = useBrand()
  const nav = useNavigate()
  const gated = auth.mode === 'connected' && !auth.session

  const [recent, setRecent] = useState<Asset[]>([])
  const [creating, setCreating] = useState<string | null>(null)
  const [theme, setTheme] = useState('')
  const [ideas, setIdeas] = useState<GeneratedIdea[]>([])
  const [ideasBusy, setIdeasBusy] = useState(false)
  const [backlog, setBacklog] = useState<Idea[]>([])

  useEffect(() => {
    if (gated) return
    listAssets().then((a) => setRecent(a.slice(0, 4))).catch(() => {})
    listIdeas().then(setBacklog).catch(() => {})
  }, [gated, brand?.id])

  async function newPost(format: PostFormat, topic = '', headline = '') {
    setCreating(format)
    try {
      const post = await savePost({ topic, format, sector: 'hospitality', accent: 'copper', platform: 'instagram', headline, caption: '', hashtags: [], slides: [], image_url: null, status: 'draft' })
      nav(`/create/social/${post.id}`)
    } catch { setCreating(null) }
  }
  function openTile(run: (typeof TILES)[number]['run']) {
    if (run === 'journal') { nav('/create/journal'); return }
    if (run === 'report') { nav('/create/report'); return }
    if (run === 'newsletter') { nav('/create/newsletter'); return }
    if (run === 'proposals') { nav('/proposals'); return }
    void newPost(run)
  }

  async function makeIdeas() {
    if (!theme.trim()) return
    setIdeasBusy(true)
    try { const { ideas: g } = await generateIdeas(theme.trim()); setIdeas(g) } finally { setIdeasBusy(false) }
  }
  async function keepIdea(g: GeneratedIdea) {
    const i = await saveIdea(theme.trim() || 'Ideas', g)
    setBacklog((b) => [i, ...b])
    setIdeas((list) => list.filter((x) => x !== g))
  }
  async function useIdea(i: Idea) {
    await deleteIdea(i.id).catch(() => {})
    setBacklog((b) => b.filter((x) => x.id !== i.id))
    void newPost((i.format as PostFormat) || 'carousel', i.hook, i.hook)
  }

  return (
    <div className="ck-page">
      <div className="ck-page-inner" style={{ maxWidth: 960 }}>
        <div className="ck-eyebrow">{brand?.name ?? 'Studio'}</div>
        <h1 className="ck-h1">Create</h1>

        <Composer autoFocus placeholder="What do you want to make? The copilot picks the right studio." />

        <div className="ck-sectiongap" />
        <h2 className="ck-h2">Or start from a format</h2>
        <div className="ck-tiles">
          {TILES.map((t) => (
            <button key={t.label} className="ck-tile" onClick={() => openTile(t.run)} disabled={creating === t.run}>
              <t.icon />
              <span>
                <span className="ck-tile-label">{creating === t.run ? 'Starting…' : t.label}</span>
                <span className="ck-tile-sub">{t.sub}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="ck-sectiongap" />
        <h2 className="ck-h2">Ideas backlog</h2>
        <div className="ck-ideas">
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="ck-search" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Theme — e.g. rest as a luxury" onKeyDown={(e) => { if (e.key === 'Enter') void makeIdeas() }} />
            <button className="ck-go" style={{ flexShrink: 0 }} onClick={() => void makeIdeas()} disabled={ideasBusy || !theme.trim()}>{ideasBusy ? 'Thinking…' : 'Ideas'}</button>
          </div>
          {[...ideas.map((g) => ({ kind: 'fresh' as const, g })), ...backlog.map((i) => ({ kind: 'kept' as const, i }))].length > 0 && (
            <div className="ck-idea-list">
              {ideas.map((g, n) => (
                <div key={`g${n}`} className="ck-idea">
                  <span className="ck-idea-hook">{g.hook}</span>
                  <span className="ck-idea-angle">{g.angle}</span>
                  <span className="ck-idea-actions">
                    <button onClick={() => void keepIdea(g)}>Keep</button>
                    <button onClick={() => void newPost((g.format as PostFormat) || 'carousel', g.hook, g.hook)}>Use →</button>
                  </span>
                </div>
              ))}
              {backlog.map((i) => (
                <div key={i.id} className="ck-idea">
                  <span className="ck-idea-hook">{i.hook}</span>
                  <span className="ck-idea-angle">{i.angle}</span>
                  <span className="ck-idea-actions">
                    <button onClick={() => { void deleteIdea(i.id); setBacklog((b) => b.filter((x) => x.id !== i.id)) }}>Drop</button>
                    <button onClick={() => void useIdea(i)}>Use →</button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {recent.length > 0 && (
          <>
            <div className="ck-sectiongap" />
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <h2 className="ck-h2">Recent</h2>
              <button className="ck-pill" onClick={() => nav('/library')}>Open Library →</button>
            </div>
            <div className="ck-cards">
              {recent.map((a) => <AssetCard key={`${a.kind}-${a.id}`} asset={a} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

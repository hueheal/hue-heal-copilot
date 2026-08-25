import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBrand } from '../lib/brandContext'
import { listPosts, savePost, type Post } from '../lib/socialCopilot'
import { listJournal, type JournalArticle } from '../lib/journal'
import { listNewsletters, type Newsletter } from '../lib/newsletter'
import { listProposals, type Proposal } from '../lib/studioOps'
import { isDesign, type Design } from '../lib/social/design'
import { fontsFor } from '../lib/social/templates'
import { INSTAGRAM_FORMATS } from '../lib/social/formats'
import { SlideCanvas } from './SocialStudio'
import type { PostFormat } from '../lib/database.types'

/* ============================================================
   Home (Phase 5): the intent-led starting point. One composer,
   the work you were in the middle of, and a few honest
   suggestions. Chrome surface: --ck-* tokens, light + dark.
   ============================================================ */

type Kind = 'auto' | 'carousel' | 'portrait' | 'story' | 'journal' | 'newsletter' | 'proposal'
const PILLS: { key: Kind; label: string }[] = [
  { key: 'auto', label: 'Auto' },
  { key: 'carousel', label: 'Carousel' },
  { key: 'portrait', label: 'Post' },
  { key: 'story', label: 'Story' },
  { key: 'journal', label: 'Journal' },
  { key: 'newsletter', label: 'Newsletter' },
  { key: 'proposal', label: 'Proposal' },
]

/** Local intent read: fast, transparent, overridable via the pills. */
function detect(prompt: string): Exclude<Kind, 'auto'> {
  const p = prompt.toLowerCase()
  if (/(carousel|slides|swipe)/.test(p)) return 'carousel'
  if (/(story|stories|reel)/.test(p)) return 'story'
  if (/(newsletter|email|subscriber)/.test(p)) return 'newsletter'
  if (/(journal|article|long[- ]form|blog|essay|piece about)/.test(p)) return 'journal'
  if (/(proposal|pitch|quote for|invoice)/.test(p)) return 'proposal'
  if (/(instagram|social|post)/.test(p)) return 'portrait'
  return 'carousel'
}

interface Recent {
  id: string
  kind: 'social' | 'journal' | 'newsletter' | 'proposal'
  title: string
  sub: string
  when: string
  to: string
  image?: string
  design?: Design
  format?: PostFormat
}

function ago(iso: string): string {
  const d = Date.now() - new Date(iso).getTime()
  const h = Math.floor(d / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  return days === 1 ? 'yesterday' : `${days}d ago`
}

export default function Home() {
  const { current } = useBrand()
  const nav = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [pill, setPill] = useState<Kind>('auto')
  const [busy, setBusy] = useState(false)
  const [recents, setRecents] = useState<Recent[]>([])
  const [journals, setJournals] = useState<JournalArticle[]>([])
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])

  useEffect(() => {
    let off = false
    ;(async () => {
      const [posts, arts, news, props] = await Promise.allSettled([listPosts(), listJournal('article'), listNewsletters(), listProposals()])
      if (off) return
      const r: Recent[] = []
      if (posts.status === 'fulfilled') for (const p of posts.value.slice(0, 8) as Post[]) r.push({
        id: p.id, kind: 'social', title: p.headline || p.topic || 'Untitled post',
        sub: p.format === 'carousel' ? 'Instagram carousel' : p.format === 'story' ? 'Instagram story' : 'Instagram post',
        when: p.updated_at ?? p.created_at, to: `/create/social/${p.id}`,
        image: p.image_url ?? undefined, design: isDesign(p.design) ? (p.design as unknown as Design) : undefined, format: p.format,
      })
      if (arts.status === 'fulfilled') { setJournals(arts.value); for (const a of arts.value.slice(0, 6)) r.push({
        id: a.id, kind: 'journal', title: a.title || 'Untitled article', sub: a.published_at ? 'Journal · published' : 'Journal · draft',
        when: a.updated_at ?? a.created_at, to: `/create/journal?open=${a.id}`, image: a.hero_image || undefined,
      }) }
      if (news.status === 'fulfilled') { setNewsletters(news.value); for (const n of news.value.slice(0, 4)) r.push({
        id: n.id, kind: 'newsletter', title: n.subject || 'Untitled newsletter', sub: 'Newsletter',
        when: n.updated_at ?? n.created_at, to: `/create/newsletter?open=${n.id}`,
      }) }
      if (props.status === 'fulfilled') for (const p of (props.value as Proposal[]).slice(0, 4)) r.push({
        id: p.id, kind: 'proposal', title: p.title || `${p.client_name} proposal`, sub: `Proposal · ${p.client_name}`,
        when: p.updated_at ?? p.created_at, to: `/proposals/${p.id}`,
      })
      r.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
      setRecents(r.slice(0, 6))
    })()
    return () => { off = true }
  }, [current?.id])

  const detected = pill === 'auto' ? detect(prompt) : pill
  const canGo = prompt.trim().length > 0 || pill !== 'auto'

  async function go() {
    if (busy) return
    const kind = detected
    const topic = prompt.trim()
    if (kind === 'journal') { nav(`/create/journal${topic ? `?topic=${encodeURIComponent(topic)}` : ''}`); return }
    if (kind === 'newsletter') { nav(`/create/newsletter${topic ? `?topic=${encodeURIComponent(topic)}` : ''}`); return }
    if (kind === 'proposal') { nav('/proposals'); return }
    setBusy(true)
    try {
      const post = await savePost({ topic, format: kind, sector: 'hospitality', accent: 'copper', platform: 'instagram', headline: '', caption: '', hashtags: [], slides: [], image_url: null, status: 'draft' })
      nav(`/create/social/${post.id}`)
    } finally { setBusy(false) }
  }

  /* Sparse, honest suggestions from what's actually in the workspace. */
  const suggestions = useMemo(() => {
    const out: { label: string; sub: string; to: string }[] = []
    const draft = recents.find((r) => r.sub.includes('draft') || (r.kind === 'social' && r.sub.includes('Instagram')))
    if (draft) out.push({ label: `Continue “${draft.title}”`, sub: ago(draft.when), to: draft.to })
    const published = journals.find((a) => a.published_at)
    if (published) out.push({ label: `Turn “${published.title}” into a carousel`, sub: 'Journal → Instagram', to: `/create/journal?open=${published.id}` })
    const lastNews = newsletters[0]
    const stale = !lastNews || Date.now() - new Date(lastNews.updated_at ?? lastNews.created_at).getTime() > 14 * 86400000
    if (stale) out.push({ label: 'Send subscribers a newsletter', sub: newsletters.length ? 'It has been a while' : 'The list is waiting', to: '/create/newsletter' })
    return out.slice(0, 3)
  }, [recents, journals, newsletters])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const day = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="ck-page">
      <div className="ck-page-inner">
        <div className="ck-eyebrow">{day} · {current?.name ?? 'Studio'}</div>
        <h1 className="ck-h1">{greeting}. What shall we make?</h1>

        <div className="ck-composer">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Describe it — “a carousel on why every tradition warms the stomach before breakfast”`}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && canGo) { e.preventDefault(); void go() } }}
          />
          <div className="ck-composer-row">
            {PILLS.map((p) => (
              <button key={p.key} className="ck-pill" data-on={pill === p.key || (pill === 'auto' && p.key !== 'auto' && detected === p.key && prompt.trim() !== '') ? '1' : '0'}
                onClick={() => setPill(p.key)} aria-pressed={pill === p.key}>
                {p.label}
              </button>
            ))}
            <button className="ck-go" onClick={() => void go()} disabled={!canGo || busy}>{busy ? 'Starting…' : 'Create'}</button>
          </div>
        </div>

        {recents.length > 0 && (
          <>
            <div className="ck-sectiongap" />
            <h2 className="ck-h2">Continue working</h2>
            <div className="ck-cards">
              {recents.map((r) => (
                <button key={`${r.kind}-${r.id}`} className="ck-card" onClick={() => nav(r.to)}>
                  <div className="ck-thumb">
                    {r.kind === 'social' && r.design?.slides?.length ? (
                      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
                        <div style={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.18)' }}>
                          <SlideCanvas slide={r.design.slides[0]} spec={INSTAGRAM_FORMATS[(r.format === 'square' || r.format === 'story' || r.format === 'carousel' || r.format === 'portrait' ? r.format : 'portrait')]} displayW={112} fonts={r.design.fonts ?? fontsFor(current?.name)} />
                        </div>
                      </div>
                    ) : r.image ? (
                      <img src={r.image} alt="" loading="lazy" />
                    ) : (
                      <div className="ck-typo">{r.title}</div>
                    )}
                  </div>
                  <div className="ck-card-meta">
                    <div className="ck-card-title">{r.title}</div>
                    <div className="ck-card-sub">{r.sub} · {ago(r.when)}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {suggestions.length > 0 && (
          <>
            <div className="ck-sectiongap" />
            <h2 className="ck-h2">Worth doing</h2>
            <div className="ck-suggest">
              {suggestions.map((s) => (
                <button key={s.label} onClick={() => nav(s.to)}>
                  {s.label}
                  <span className="ck-sub">{s.sub}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

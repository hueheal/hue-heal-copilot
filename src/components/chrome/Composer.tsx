import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { savePost } from '../../lib/socialCopilot'

/* ============================================================
   The universal create composer (Phase 6): natural language in,
   the right creator out. Intent detection is local and instant;
   the pills make it visible and overridable. Used on Home and
   Create.
   ============================================================ */

export type ComposeKind = 'auto' | 'carousel' | 'portrait' | 'story' | 'journal' | 'newsletter' | 'proposal'
const PILLS: { key: ComposeKind; label: string }[] = [
  { key: 'auto', label: 'Auto' },
  { key: 'carousel', label: 'Carousel' },
  { key: 'portrait', label: 'Post' },
  { key: 'story', label: 'Story' },
  { key: 'journal', label: 'Journal' },
  { key: 'newsletter', label: 'Newsletter' },
  { key: 'proposal', label: 'Proposal' },
]

export function detectIntent(prompt: string): Exclude<ComposeKind, 'auto'> {
  const p = prompt.toLowerCase()
  if (/(carousel|slides|swipe)/.test(p)) return 'carousel'
  if (/(story|stories|reel)/.test(p)) return 'story'
  if (/(newsletter|email|subscriber)/.test(p)) return 'newsletter'
  if (/(journal|article|long[- ]form|blog|essay|piece about)/.test(p)) return 'journal'
  if (/(proposal|pitch|quote for|invoice)/.test(p)) return 'proposal'
  if (/(instagram|social|post)/.test(p)) return 'portrait'
  return 'carousel'
}

export default function Composer({ autoFocus = false, placeholder }: { autoFocus?: boolean; placeholder?: string }) {
  const nav = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [pill, setPill] = useState<ComposeKind>('auto')
  const [busy, setBusy] = useState(false)

  const detected = pill === 'auto' ? detectIntent(prompt) : pill
  const canGo = prompt.trim().length > 0 || pill !== 'auto'

  async function go() {
    if (busy || !canGo) return
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

  return (
    <div className="ck-composer">
      <textarea
        value={prompt}
        autoFocus={autoFocus}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={placeholder ?? 'Describe it — “a carousel on why every tradition warms the stomach before breakfast”'}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && canGo) { e.preventDefault(); void go() } }}
      />
      <div className="ck-composer-row">
        {PILLS.map((p) => (
          <button key={p.key} className="ck-pill"
            data-on={pill === p.key || (pill === 'auto' && p.key !== 'auto' && detected === p.key && prompt.trim() !== '') ? '1' : '0'}
            onClick={() => setPill(p.key)} aria-pressed={pill === p.key}>
            {p.label}
          </button>
        ))}
        <button className="ck-go" onClick={() => void go()} disabled={!canGo || busy}>{busy ? 'Starting…' : 'Create'}</button>
      </div>
    </div>
  )
}

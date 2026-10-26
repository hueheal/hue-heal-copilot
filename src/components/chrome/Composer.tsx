import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

/* ============================================================
   The universal create composer (Phase 6): natural language in,
   the right creator out. Intent detection is local and instant;
   the pills make it visible and overridable. Used on Home and
   Create. Social posts are made in Figma now, so a social-sounding
   prompt falls back to a journal piece.
   ============================================================ */

export type ComposeKind = 'auto' | 'journal' | 'newsletter' | 'proposal'
const PILLS: { key: ComposeKind; label: string }[] = [
  { key: 'auto', label: 'Auto' },
  { key: 'journal', label: 'Journal' },
  { key: 'newsletter', label: 'Newsletter' },
  { key: 'proposal', label: 'Proposal' },
]

export function detectIntent(prompt: string): Exclude<ComposeKind, 'auto'> {
  const p = prompt.toLowerCase()
  if (/(newsletter|email|subscriber)/.test(p)) return 'newsletter'
  if (/(proposal|pitch|quote for|invoice)/.test(p)) return 'proposal'
  // Journal is the default, including for prompts that read as social.
  return 'journal'
}

export default function Composer({ autoFocus = false, placeholder }: { autoFocus?: boolean; placeholder?: string }) {
  const nav = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [pill, setPill] = useState<ComposeKind>('auto')

  const detected = pill === 'auto' ? detectIntent(prompt) : pill
  const canGo = prompt.trim().length > 0 || pill !== 'auto'

  function go() {
    if (!canGo) return
    const kind = detected
    const topic = prompt.trim()
    if (kind === 'newsletter') { nav(`/create/newsletter${topic ? `?topic=${encodeURIComponent(topic)}` : ''}`); return }
    if (kind === 'proposal') { nav('/proposals'); return }
    nav(`/create/journal${topic ? `?topic=${encodeURIComponent(topic)}` : ''}`)
  }

  return (
    <div className="ck-composer">
      <textarea
        value={prompt}
        autoFocus={autoFocus}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={placeholder ?? 'Describe it: “a journal piece on why every tradition warms the stomach before breakfast”'}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && canGo) { e.preventDefault(); go() } }}
      />
      <div className="ck-composer-row">
        {PILLS.map((p) => (
          <button key={p.key} className="ck-pill"
            data-on={pill === p.key || (pill === 'auto' && p.key !== 'auto' && detected === p.key && prompt.trim() !== '') ? '1' : '0'}
            onClick={() => setPill(p.key)} aria-pressed={pill === p.key}>
            {p.label}
          </button>
        ))}
        <button className="ck-go" onClick={go} disabled={!canGo}>Create</button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Role, RoleRun, RoleAction } from '../lib/roles'
import { savePost } from '../lib/socialCopilot'
import { agoLabel } from './chrome/AssetCard'

/* ============================================================
   A deliverable, read. Shared by the department room and a
   seat's own desk. Proposed pieces spawn real drafts; handoffs
   link to the colleague they were written to.
   ============================================================ */

export const kindBadge = (k?: string) =>
  k === 'digest' ? 'Weekly digest' : k === 'scheduled' ? 'Scheduled' : k === 'retro' ? 'Weekly learning' : 'Task'

export default function DeliverableView({ run, roster, by, eyebrow }: { run: RoleRun; roster: Role[]; by?: string; eyebrow?: string }) {
  const nav = useNavigate()
  const [spawning, setSpawning] = useState<string | null>(null)
  const out = run.output

  async function spawn(a: RoleAction) {
    setSpawning(a.topic)
    try {
      if (a.kind === 'journal') { nav(`/create/journal?topic=${encodeURIComponent(a.topic)}`); return }
      if (a.kind === 'newsletter') { nav(`/create/newsletter?topic=${encodeURIComponent(a.topic)}`); return }
      const post = await savePost({ topic: a.topic, format: a.kind, sector: 'hospitality', accent: 'copper', platform: 'instagram', headline: '', caption: '', hashtags: [], slides: [], image_url: null, status: 'draft' })
      nav(`/create/social/${post.id}`)
    } finally { setSpawning(null) }
  }

  return (
    <article className="ck-deliverable">
      <div className="ck-eyebrow">{eyebrow ?? kindBadge(run.kind)}{by ? ` · ${by}` : ''} · {agoLabel(run.created_at)}</div>
      <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', margin: '6px 0 8px' }}>{out.title}</h2>
      <p style={{ color: 'var(--ck-muted)', fontSize: 13.5, lineHeight: 1.6, marginTop: 0 }}>{out.summary}</p>
      {out.sections?.map((s) => (
        <section key={s.heading}>
          <h3 style={{ fontSize: 13, fontWeight: 600, margin: '18px 0 6px' }}>{s.heading}</h3>
          {s.body.split(/\n{2,}/).map((p, i) => (
            <p key={i} style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--ck-ink)', margin: '6px 0', whiteSpace: 'pre-wrap' }}>{p}</p>
          ))}
        </section>
      ))}
      {(out.handoffs ?? []).length > 0 && (
        <>
          <h3 style={{ fontSize: 13, fontWeight: 600, margin: '20px 0 8px' }}>Handed to colleagues</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(out.handoffs ?? []).map((h, i) => {
              const to = roster.find((r) => r.name.toLowerCase() === (h.to ?? '').toLowerCase())
              return (
                <div key={i} className="ck-handoff">
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span className="ck-pill" style={{ pointerEvents: 'none', flexShrink: 0 }}>→ {h.to}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 500 }}>{h.subject}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ck-muted)', lineHeight: 1.55, marginTop: 4 }}>{h.body}</div>
                  {to && <button className="ck-pill" style={{ marginTop: 8 }} onClick={() => nav(to.seat === 'member' ? `/roles/${to.id}` : `/team/${to.dept}`)}>Open {to.name}</button>}
                </div>
              )
            })}
          </div>
        </>
      )}
      {(out.actions ?? []).length > 0 && (
        <>
          <h3 style={{ fontSize: 13, fontWeight: 600, margin: '20px 0 8px' }}>Proposed pieces</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {out.actions.map((a, i) => (
              <div key={i} className="ck-actionrow">
                <span className="ck-pill" style={{ pointerEvents: 'none', flexShrink: 0 }}>{a.kind}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500 }}>{a.topic}</span>
                  {a.note && <span style={{ fontSize: 12, color: 'var(--ck-faint)', display: 'block' }}>{a.note}</span>}
                </span>
                <button className="ck-go" style={{ marginLeft: 0, flexShrink: 0 }} disabled={spawning === a.topic} onClick={() => void spawn(a)}>
                  {spawning === a.topic ? 'Creating…' : 'Create draft'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </article>
  )
}

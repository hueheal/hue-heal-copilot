import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '../lib/useIsMobile'

/* ============================================================
   Content Studio · shared editor chrome. Every family editor
   (journal, report, newsletter, social) renders inside this:
   back header with Done + autosaved state, and on mobile an
   app-style Edit/Preview segmented split of rail vs canvas.
   ============================================================ */

const segWrap: React.CSSProperties = { display: 'flex', gap: 6, background: 'var(--hh-bone)', border: '1px solid var(--hh-line)', borderRadius: 999, padding: 4, margin: '0 0 16px' }
const seg = (active: boolean): React.CSSProperties => ({ flex: 1, textAlign: 'center', padding: '9px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: active ? 'var(--hh-anthracite)' : 'transparent', color: active ? 'var(--text-on-ink)' : 'var(--text-muted)' })

export default function EditorShell({
  ctype,
  subline,
  status,
  busy,
  onNew,
  onDone,
  doneLabel = 'Done',
  doneDisabled,
  headerExtra,
  rail,
  canvas,
  railWidth = 380,
  editLabel = 'Edit',
  previewLabel = 'Preview',
  view,
  onViewChange,
}: {
  ctype: string
  subline: string
  status?: string | null
  busy?: boolean
  onNew?: () => void
  onDone: () => void
  doneLabel?: string
  doneDisabled?: boolean
  headerExtra?: ReactNode
  rail: ReactNode
  canvas: ReactNode
  railWidth?: number
  editLabel?: string
  previewLabel?: string
  /** Optional controlled mobile view (edit|preview), e.g. to flip to preview after generating. */
  view?: 'edit' | 'preview'
  onViewChange?: (v: 'edit' | 'preview') => void
}) {
  const nav = useNavigate()
  const isMobile = useIsMobile()
  const [innerView, setInnerView] = useState<'edit' | 'preview'>('edit')
  const mView = view ?? innerView
  const setMView = (v: 'edit' | 'preview') => { onViewChange ? onViewChange(v) : setInnerView(v) }
  const pad = isMobile ? '16px' : '24px 40px'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isMobile ? '12px 16px' : '16px 40px', borderBottom: '1px solid var(--hh-line)', position: 'sticky', top: 0, background: 'var(--hh-monterey)', zIndex: 5 }}>
        <button onClick={() => nav('/create')} className="hh-btn" style={{ background: 'none', border: 'none', color: 'var(--hh-copper)', fontSize: 15, cursor: 'pointer', padding: 4 }}>‹</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Editor · {ctype}</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{subline}</div>
        </div>
        {status && !isMobile && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{status}</span>}
        {headerExtra}
        {onNew && <button className="hh-btn" onClick={onNew} style={{ background: 'none', border: '1px solid var(--hh-line)', borderRadius: 999, padding: '8px 14px', fontSize: 12.5, color: 'var(--text-muted)', cursor: 'pointer' }}>New</button>}
        <button className="hh-btn" onClick={onDone} disabled={busy || doneDisabled}
          style={{ background: 'var(--hh-anthracite)', color: 'var(--text-on-ink)', border: '1px solid var(--hh-anthracite)', borderRadius: 999, padding: '8px 18px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', opacity: busy || doneDisabled ? 0.55 : 1 }}>
          {busy ? '…' : doneLabel}
        </button>
      </div>

      <div style={{ padding: pad }}>
        {isMobile && status && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 10px' }}>{status}</div>}
        {isMobile && (
          <div style={segWrap}>
            <button onClick={() => setMView('edit')} style={seg(mView === 'edit')}>{editLabel}</button>
            <button onClick={() => setMView('preview')} style={seg(mView === 'preview')}>{previewLabel}</button>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `${railWidth}px 1fr`, gap: 28, alignItems: 'start' }}>
          <div style={{ display: isMobile && mView !== 'edit' ? 'none' : undefined, minWidth: 0 }}>{rail}</div>
          <div style={{ display: isMobile && mView !== 'preview' ? 'none' : undefined, minWidth: 0 }}>{canvas}</div>
        </div>
      </div>
    </div>
  )
}

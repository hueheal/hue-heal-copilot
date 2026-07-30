import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '../lib/useIsMobile'

/* ============================================================
   Content Studio · shared editor chrome.
   Desktop: rail + canvas grid under a sticky header.
   Mobile: the canvas stays on screen and the controls live in a
   draggable bottom sheet (peek / half / full snap points), so every
   change is visible live — no tabbing between edit and preview.
   ============================================================ */

const NAVBAR = 'calc(66px + env(safe-area-inset-bottom))' // mobile bottom tab bar
const PEEK = 96 // sheet height at rest: handle + a hint of the first control

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
  editLabel = 'Controls',
  previewLabel: _previewLabel,
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
  /** Label on the sheet handle (mobile). */
  editLabel?: string
  previewLabel?: string
  /** One-way signal: 'preview' collapses the control sheet to a peek, 'edit' raises it. */
  view?: 'edit' | 'preview'
  onViewChange?: (v: 'edit' | 'preview') => void
}) {
  const nav = useNavigate()
  const isMobile = useIsMobile()

  const half = () => Math.round(window.innerHeight * 0.46)
  const full = () => Math.round(window.innerHeight * 0.82)
  // Canvas-first editors (view starts at 'preview') rest at a peek; edit-first ones open half-raised.
  const [sheetH, setSheetH] = useState<number>(() => (view === 'preview' ? PEEK : Math.round((typeof window !== 'undefined' ? window.innerHeight : 800) * 0.46)))
  const drag = useRef<{ startY: number; startH: number } | null>(null)
  const prevView = useRef(view)

  // External view signal (e.g. "flip to preview after generating") moves the sheet.
  useEffect(() => {
    if (view && view !== prevView.current) {
      prevView.current = view
      setSheetH(view === 'preview' ? PEEK : half())
    }
  }, [view])

  useEffect(() => {
    function move(e: PointerEvent) {
      if (!drag.current) return
      const h = drag.current.startH + (drag.current.startY - e.clientY)
      setSheetH(Math.max(PEEK, Math.min(full(), h)))
    }
    function up() {
      if (!drag.current) return
      drag.current = null
      setSheetH((h) => {
        // Snap to the nearest stop and let the parent know roughly where we are.
        const stops = [PEEK, half(), full()]
        const snapped = stops.reduce((a, b) => (Math.abs(b - h) < Math.abs(a - h) ? b : a))
        const mapped: 'edit' | 'preview' = snapped === PEEK ? 'preview' : 'edit'
        if (mapped !== prevView.current) { prevView.current = mapped; onViewChange?.(mapped) }
        return snapped
      })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [onViewChange])

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isMobile ? '12px 16px' : '16px 40px', borderBottom: '1px solid var(--hh-line)', position: 'sticky', top: 0, background: 'var(--hh-monterey)', zIndex: 5 }}>
      <button onClick={() => nav('/create')} className="hh-btn" style={{ background: 'none', border: 'none', color: 'var(--hh-copper)', fontSize: 15, cursor: 'pointer', padding: 4 }}>‹</button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Editor · {ctype}</div>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{status && isMobile ? status : subline}</div>
      </div>
      {status && !isMobile && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{status}</span>}
      {headerExtra}
      {onNew && <button className="hh-btn" onClick={onNew} style={{ background: 'none', border: '1px solid var(--hh-line)', borderRadius: 999, padding: '8px 14px', fontSize: 12.5, color: 'var(--text-muted)', cursor: 'pointer' }}>New</button>}
      <button className="hh-btn" onClick={onDone} disabled={busy || doneDisabled}
        style={{ background: 'var(--hh-anthracite)', color: 'var(--text-on-ink)', border: '1px solid var(--hh-anthracite)', borderRadius: 999, padding: '8px 18px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', opacity: busy || doneDisabled ? 0.55 : 1 }}>
        {busy ? '…' : doneLabel}
      </button>
    </div>
  )

  if (isMobile) {
    return (
      <div>
        {header}
        {/* Canvas — always visible; the sheet rides over it. */}
        <div style={{ padding: `16px 16px ${sheetH + 28}px` }}>{canvas}</div>

        {/* Control sheet */}
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: NAVBAR, height: sheetH, zIndex: 30, background: 'var(--hh-bone)', borderTop: '1px solid var(--hh-line)', borderRadius: '18px 18px 0 0', boxShadow: '0 -12px 32px rgba(30,27,24,0.14)', display: 'flex', flexDirection: 'column', transition: drag.current ? 'none' : 'height 200ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
          <div
            onPointerDown={(e) => { drag.current = { startY: e.clientY, startH: sheetH }; (e.target as HTMLElement).setPointerCapture?.(e.pointerId) }}
            style={{ flexShrink: 0, padding: '10px 0 8px', cursor: 'grab', touchAction: 'none' }}
          >
            <div style={{ width: 44, height: 5, borderRadius: 3, background: 'var(--hh-mushroom)', margin: '0 auto' }} />
            <div style={{ textAlign: 'center', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)', marginTop: 6 }}>{editLabel}</div>
          </div>
          <div style={{ flex: 1, overflowY: sheetH > PEEK + 40 ? 'auto' : 'hidden', WebkitOverflowScrolling: 'touch', padding: '0 16px 24px' }}>
            {rail}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {header}
      <div style={{ padding: '24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `${railWidth}px 1fr`, gap: 28, alignItems: 'start' }}>
          <div style={{ minWidth: 0 }}>{rail}</div>
          <div style={{ minWidth: 0 }}>{canvas}</div>
        </div>
      </div>
    </div>
  )
}

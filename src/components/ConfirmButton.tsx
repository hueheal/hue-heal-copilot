import { useState, type ReactNode, type CSSProperties } from 'react'

/* Inline "click → confirm" control so destructive actions never fire by accident.
   Works as an icon trigger (× in a row) or a text button ("Delete"). Stops click
   propagation so it can live inside a clickable row without triggering it. */
export default function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = 'Delete?',
  title,
  style,
  className = 'hh-btn',
}: {
  onConfirm: () => void
  children: ReactNode
  confirmLabel?: string
  title?: string
  style?: CSSProperties
  className?: string
}) {
  const [confirming, setConfirming] = useState(false)
  const stop = (e: React.MouseEvent) => e.stopPropagation()

  if (confirming) {
    return (
      <span onClick={stop} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
        <span style={{ color: 'var(--text-muted)' }}>{confirmLabel}</span>
        <button
          className="hh-btn"
          onClick={(e) => { stop(e); onConfirm(); setConfirming(false) }}
          style={{ background: 'var(--hh-copper)', color: '#F6EFE4', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 12 }}
        >
          Yes
        </button>
        <button
          className="hh-btn"
          onClick={(e) => { stop(e); setConfirming(false) }}
          style={{ background: 'none', border: '1px solid var(--hh-line)', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: 'var(--text-muted)' }}
        >
          No
        </button>
      </span>
    )
  }

  return (
    <button
      className={className}
      title={title}
      onClick={(e) => { stop(e); setConfirming(true) }}
      style={style}
    >
      {children}
    </button>
  )
}

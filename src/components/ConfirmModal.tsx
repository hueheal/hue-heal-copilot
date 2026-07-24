import { useEffect, useState, type ReactNode } from 'react'

/* A blocking confirmation modal for consequential/irreversible actions.
   Optionally requires the user to type a phrase (e.g. the workspace name) to
   arm the confirm button — the standard guard for destructive deletes. */
export default function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  requireText,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** When set, the confirm button stays disabled until the user types this exactly. */
  requireText?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const [typed, setTyped] = useState('')
  useEffect(() => { if (open) setTyped('') }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null
  const armed = !busy && (!requireText || typed.trim() === requireText)

  return (
    <div
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(20,17,14,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 460, background: 'var(--hh-lotus, #FBFAF6)', borderRadius: 16, padding: 26, boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}
      >
        <h2 className="hh-serif" style={{ fontWeight: 400, fontSize: 22, margin: '0 0 10px', color: 'var(--text-strong)' }}>{title}</h2>
        <div style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>{body}</div>

        {requireText && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 6 }}>
              Type <strong style={{ color: 'var(--text-strong)' }}>{requireText}</strong> to confirm
            </div>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--hh-line)', background: 'var(--hh-bone)', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'var(--font-sans)' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <button
            onClick={onCancel}
            className="hh-btn"
            style={{ background: 'none', border: '1px solid var(--hh-line)', color: 'var(--text-muted)', borderRadius: 999, padding: '10px 18px', fontSize: 13, cursor: 'pointer' }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => armed && onConfirm()}
            disabled={!armed}
            className="hh-btn"
            style={{
              background: danger ? '#B23B2E' : 'var(--hh-copper)',
              color: '#F6EFE4', border: 'none', borderRadius: 999, padding: '10px 20px', fontSize: 13, fontWeight: 500,
              cursor: armed ? 'pointer' : 'default', opacity: armed ? 1 : 0.5,
            }}
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

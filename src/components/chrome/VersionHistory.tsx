import { useEffect, useState } from 'react'
import { listVersions, type AssetKind, type AssetVersion } from '../../lib/assets'
import { agoLabel } from './AssetCard'

/* ============================================================
   Version history (Phase 8): a quiet "History" control for the
   editor header. Lists snapshots written on each save; Restore
   hands the snapshot back to the editor, which applies it with
   its own state setters and saves again (creating a new version,
   so restores are themselves undoable).
   ============================================================ */

export default function VersionHistory({ kind, assetId, onRestore }: {
  kind: AssetKind
  assetId: string | null
  onRestore: (snapshot: Record<string, unknown>) => void
}) {
  const [open, setOpen] = useState(false)
  const [versions, setVersions] = useState<AssetVersion[] | null>(null)

  useEffect(() => {
    if (!open || !assetId) return
    setVersions(null)
    listVersions(kind, assetId).then(setVersions)
  }, [open, kind, assetId])

  if (!assetId || assetId.startsWith('local-')) return null

  return (
    <>
      <button className="hh-btn" onClick={() => setOpen(true)}
        style={{ background: 'none', border: '1px solid var(--hh-line)', borderRadius: 999, padding: '8px 14px', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
        History
      </button>
      {open && (
        <div className="ck-cmd-overlay" onPointerDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="ck-cmd" role="dialog" aria-label="Version history" style={{ maxWidth: 460 }}>
            <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--ck-line)', fontFamily: 'var(--ck-font)', fontSize: 14, fontWeight: 500, color: 'var(--ck-ink)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Version history
              <button onClick={() => setOpen(false)} aria-label="Close"
                style={{ border: 'none', background: 'none', color: 'var(--ck-faint)', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ maxHeight: '50vh', overflowY: 'auto', padding: 8 }}>
              {versions === null ? (
                <div style={{ padding: 20, color: 'var(--ck-faint)', fontFamily: 'var(--ck-font)', fontSize: 13 }}>Loading…</div>
              ) : versions.length === 0 ? (
                <div style={{ padding: 20, color: 'var(--ck-faint)', fontFamily: 'var(--ck-font)', fontSize: 13 }}>
                  No versions yet. A snapshot is kept every time you save.
                </div>
              ) : versions.map((v, i) => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, fontFamily: 'var(--ck-font)', fontSize: 13, color: 'var(--ck-ink)' }}>
                  <span style={{ color: 'var(--ck-faint)', fontVariantNumeric: 'tabular-nums', width: 30 }}>v{versions.length - i}</span>
                  <span>{v.label || 'Saved'}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--ck-faint)', fontSize: 12 }}>{agoLabel(v.created_at)}</span>
                  {i > 0 && (
                    <button onClick={() => { onRestore(v.snapshot); setOpen(false) }}
                      style={{ border: '1px solid var(--ck-line)', background: 'none', color: 'var(--ck-ink)', borderRadius: 999, padding: '3px 10px', fontSize: 11.5, cursor: 'pointer', fontFamily: 'var(--ck-font)' }}>
                      Restore
                    </button>
                  )}
                  {i === 0 && <span style={{ fontSize: 11, color: 'var(--ck-faint)' }}>current</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

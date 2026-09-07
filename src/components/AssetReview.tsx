import { useEffect, useState } from 'react'
import { listImageAssets, decideImage, type ImageAsset } from '../lib/imageAssets'
import { deptOf } from '../lib/org'
import { agoLabel } from './chrome/AssetCard'

/* ============================================================
   Images waiting for the founder. Approve, decline, copy the
   URL. Shown on Home (all departments) and in a department room.
   ============================================================ */

export default function AssetReview({ dept, showApproved = false }: { dept?: string; showApproved?: boolean }) {
  const [assets, setAssets] = useState<ImageAsset[] | null>(null)
  const [open, setOpen] = useState<ImageAsset | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    const pull = () => listImageAssets({ dept }).then((a) => live && setAssets(a)).catch(() => {})
    void pull()
    const t = setInterval(pull, 15000)
    return () => { live = false; clearInterval(t) }
  }, [dept])

  if (!assets) return null
  const pending = assets.filter((a) => a.status === 'pending')
  const approved = assets.filter((a) => a.status === 'approved')
  if (!pending.length && !(showApproved && approved.length)) return null

  async function decide(a: ImageAsset, status: 'approved' | 'declined') {
    await decideImage(a.id, status)
    setAssets((l) => (l ?? []).map((x) => (x.id === a.id ? { ...x, status, decided_at: new Date().toISOString() } : x)))
    if (open?.id === a.id) setOpen(null)
  }
  async function copy(url: string) {
    try { await navigator.clipboard.writeText(url); setCopied(url); setTimeout(() => setCopied(null), 1500) } catch { /* ignore */ }
  }

  const Tile = ({ a }: { a: ImageAsset }) => {
    const d = deptOf(a.dept)
    return (
      <div className="ck-asset" style={{ ['--ck-dept' as never]: d?.accent }}>
        <button className="ck-asset-img" style={{ aspectRatio: a.aspect_ratio.replace(':', ' / ') }} onClick={() => setOpen(a)}>
          <img src={a.url} alt={a.purpose} loading="lazy" />
        </button>
        <div className="ck-asset-meta">
          <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.purpose || a.category}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ck-faint)' }}>{[a.category, a.surface].filter(Boolean).join(' · ')} · {agoLabel(a.created_at)}</div>
          {a.status === 'pending' ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button className="ck-pill" data-on="1" onClick={() => void decide(a, 'approved')}>Approve</button>
              <button className="ck-pill" onClick={() => void decide(a, 'declined')}>Decline</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button className="ck-pill" onClick={() => void copy(a.url)}>{copied === a.url ? 'Copied' : 'Copy URL'}</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 18 }}>
      {pending.length > 0 && (
        <>
          <div className="ck-board-title"><b>Images to review</b> {pending.length}</div>
          <div className="ck-assets">{pending.map((a) => <Tile key={a.id} a={a} />)}</div>
        </>
      )}
      {showApproved && approved.length > 0 && (
        <>
          <div className="ck-board-title" style={{ marginTop: 14 }}><b>Approved images</b> {approved.length}</div>
          <div className="ck-assets">{approved.slice(0, 12).map((a) => <Tile key={a.id} a={a} />)}</div>
        </>
      )}
      {open && (
        <div className="ck-lightbox" onClick={() => setOpen(null)} role="dialog" aria-label={open.purpose}>
          <div className="ck-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <img src={open.url} alt={open.purpose} />
            <div style={{ padding: '12px 14px', fontSize: 12.5, color: 'var(--ck-muted)', lineHeight: 1.5, maxHeight: 160, overflow: 'auto' }}>
              <div style={{ color: 'var(--ck-ink)', fontWeight: 500, marginBottom: 4 }}>{open.purpose}</div>
              {open.prompt}
            </div>
            <div style={{ display: 'flex', gap: 6, padding: '0 14px 14px' }}>
              {open.status === 'pending' && <><button className="ck-pill" data-on="1" onClick={() => void decide(open, 'approved')}>Approve</button><button className="ck-pill" onClick={() => void decide(open, 'declined')}>Decline</button></>}
              <button className="ck-pill" onClick={() => void copy(open.url)}>{copied === open.url ? 'Copied' : 'Copy URL'}</button>
              <button className="ck-pill" style={{ marginLeft: 'auto' }} onClick={() => setOpen(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

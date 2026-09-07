import { useEffect, useState } from 'react'
import { listImageAssets, decideImage, fileToLibrary, type ImageAsset } from '../lib/imageAssets'
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
  const [filing, setFiling] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

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
    // Site images go to the brand's own library the moment they are approved.
    if (status === 'approved' && a.destination === 'remedae') {
      setFiling(a.id); setNote(null)
      const r = await fileToLibrary(a.id)
      setFiling(null)
      if (r.error) setNote(`Approved, but could not file it into the Remedae library: ${r.error}`)
      else setAssets((l) => (l ?? []).map((x) => (x.id === a.id ? { ...x, library_url: r.url ?? null, library_path: r.path ?? null } : x)))
    }
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
          <div style={{ fontSize: 11.5, color: 'var(--ck-faint)', marginTop: 2 }}>
            {a.destination === 'remedae' ? (a.library_path ? `In the Remedae library · ${a.library_path}` : filing === a.id ? 'Filing into the Remedae library…' : 'For remedae.app · files into its library on approval') : 'For the studio'}
          </div>
          {a.status === 'pending' ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button className="ck-pill" data-on="1" onClick={() => void decide(a, 'approved')}>Approve</button>
              <button className="ck-pill" onClick={() => void decide(a, 'declined')}>Decline</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button className="ck-pill" onClick={() => void copy(a.library_url ?? a.url)}>{copied === (a.library_url ?? a.url) ? 'Copied' : 'Copy URL'}</button>
              {a.destination === 'remedae' && !a.library_path && filing !== a.id && <button className="ck-pill" onClick={() => { setFiling(a.id); void fileToLibrary(a.id).then((r) => { setFiling(null); if (r.error) setNote(r.error); else setAssets((l) => (l ?? []).map((x) => (x.id === a.id ? { ...x, library_url: r.url ?? null, library_path: r.path ?? null } : x))) }) }}>File to library</button>}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 18 }}>
      {note && <div className="ck-note" role="status">{note}</div>}
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

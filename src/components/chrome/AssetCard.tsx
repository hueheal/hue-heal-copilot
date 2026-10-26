import { useNavigate } from 'react-router-dom'
import type { Asset } from '../../lib/assets'

/* One asset, as a visual card: hero for journal, typographic card
   otherwise. Chrome surface. */

export function agoLabel(iso: string): string {
  const d = Date.now() - new Date(iso).getTime()
  const h = Math.floor(d / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  return days === 1 ? 'yesterday' : days < 30 ? `${days}d ago` : new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function AssetCard({ asset, menu }: { asset: Asset; menu?: React.ReactNode }) {
  const nav = useNavigate()
  return (
    <div className="ck-card" style={{ position: 'relative' }}>
      <button className="ck-card-hit" onClick={() => nav(asset.to)} aria-label={`Open ${asset.title}`}>
        <div className="ck-thumb">
          {asset.image ? (
            <img src={asset.image} alt="" loading="lazy" />
          ) : (
            <div className="ck-typo">{asset.title}</div>
          )}
          {asset.status !== 'draft' && <span className="ck-status">{asset.status}</span>}
        </div>
        <div className="ck-card-meta">
          <div className="ck-card-title">{asset.title}</div>
          <div className="ck-card-sub">{asset.sub} · {agoLabel(asset.when)}</div>
        </div>
      </button>
      {menu && <div className="ck-card-menu">{menu}</div>}
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import type { Asset } from '../../lib/assets'
import { INSTAGRAM_FORMATS } from '../../lib/social/formats'
import { SlideCanvas } from '../../pages/SocialStudio'

/* One asset, as a visual card: live slide render for social, hero for
   journal, typographic card otherwise. Chrome surface. */

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
  const spec = INSTAGRAM_FORMATS[(asset.format === 'square' || asset.format === 'story' || asset.format === 'carousel' || asset.format === 'portrait') ? asset.format : 'portrait']
  return (
    <div className="ck-card" style={{ position: 'relative' }}>
      <button className="ck-card-hit" onClick={() => nav(asset.to)} aria-label={`Open ${asset.title}`}>
        <div className="ck-thumb">
          {asset.kind === 'social' && asset.design?.slides?.length ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
              <div style={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.18)' }}>
                <SlideCanvas slide={asset.design.slides[0]} spec={spec} displayW={112} fonts={asset.design.fonts} />
              </div>
            </div>
          ) : asset.image ? (
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

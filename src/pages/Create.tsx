import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useBrand } from '../lib/brandContext'
import Composer from '../components/chrome/Composer'
import AssetCard from '../components/chrome/AssetCard'
import { listAssets, type Asset } from '../lib/assets'
import { IcDoc, IcMail, IcInvoice, IcChart } from '../components/chrome/icons'

/* ============================================================
   Create (Phase 6): one entry point for everything the studio
   makes. Composer first; the type tiles are the explicit route;
   recents link into the Library. Social posts are made in Figma
   now (by voice or chat), so they have no tile here.
   ============================================================ */

const TILES: { label: string; sub: string; icon: () => React.ReactNode; run: 'journal' | 'newsletter' | 'report' | 'proposals' }[] = [
  { label: 'Journal', sub: 'Long-form article', icon: IcDoc, run: 'journal' },
  { label: 'Newsletter', sub: 'To the subscriber list', icon: IcMail, run: 'newsletter' },
  { label: 'Report', sub: 'Research territory', icon: IcChart, run: 'report' },
  { label: 'Proposal · invoice', sub: 'Client documents', icon: IcInvoice, run: 'proposals' },
]

export default function Create() {
  const auth = useAuth()
  const { current: brand } = useBrand()
  const nav = useNavigate()
  const gated = auth.mode === 'connected' && !auth.session

  const [recent, setRecent] = useState<Asset[]>([])

  useEffect(() => {
    if (gated) return
    listAssets().then((a) => setRecent(a.slice(0, 4))).catch(() => {})
  }, [gated, brand?.id])

  function openTile(run: (typeof TILES)[number]['run']) {
    if (run === 'journal') { nav('/create/journal'); return }
    if (run === 'report') { nav('/create/report'); return }
    // Hue & Heal's newsletter is the Letter, designed by the website.
    if (run === 'newsletter') { nav(/hue\s*&\s*heal/i.test(brand?.name ?? '') ? '/create/letter' : '/create/newsletter'); return }
    nav('/proposals')
  }

  return (
    <div className="ck-page">
      <div className="ck-page-inner" style={{ maxWidth: 960 }}>
        <div className="ck-eyebrow">{brand?.name ?? 'Studio'}</div>
        <h1 className="ck-h1">Create</h1>

        <Composer autoFocus placeholder="What do you want to make? The copilot picks the right studio." />

        <div className="ck-sectiongap" />
        <h2 className="ck-h2">Or start from a format</h2>
        <div className="ck-tiles">
          {TILES.map((t) => (
            <button key={t.label} className="ck-tile" onClick={() => openTile(t.run)}>
              <t.icon />
              <span>
                <span className="ck-tile-label">{t.label}</span>
                <span className="ck-tile-sub">{t.sub}</span>
              </span>
            </button>
          ))}
        </div>

        {recent.length > 0 && (
          <>
            <div className="ck-sectiongap" />
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <h2 className="ck-h2">Recent</h2>
              <button className="ck-pill" onClick={() => nav('/library')}>Open Library →</button>
            </div>
            <div className="ck-cards">
              {recent.map((a) => <AssetCard key={`${a.kind}-${a.id}`} asset={a} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useBrand } from '../lib/brandContext'
import { createBlankBrand } from '../lib/brand'
import Logo from './Logo'

/* Top-of-sidebar brand-world switcher. Shows the current world's identity
   (the Ivy Ora wordmark for the Hue & Heal parent; the brand name + accent for
   white-label worlds) and lets you tab between worlds or spin up a new one. */
export default function BrandSwitcher() {
  const { brands, current, setCurrent, reload } = useBrand()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const isParent = current?.display_font === 'ivyora' || current?.name === 'Hue & Heal'

  async function create() {
    if (!name.trim()) return
    setBusy(true)
    try {
      const b = await createBlankBrand(name.trim())
      await reload()
      setCurrent(b.id)
      setName(''); setCreating(false); setOpen(false)
    } finally { setBusy(false) }
  }

  return (
    <div style={{ position: 'relative', padding: '2px 4px 18px' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="hh-btn"
        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'rgba(244,240,231,0.05)', border: '1px solid var(--hh-line-ink)', borderRadius: 12, padding: '10px 12px', color: 'var(--text-on-ink)', cursor: 'pointer' }}
      >
        {isParent ? (
          <Logo height={16} />
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: current?.accent_color || '#B5632F', flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current?.name ?? 'Workspace'}</span>
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-on-ink-faint)' }}>▾</span>
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 4, right: 4, zIndex: 20, marginTop: 4, background: 'var(--hh-anthracite)', border: '1px solid var(--hh-line-ink)', borderRadius: 12, padding: 6, boxShadow: '0 12px 30px rgba(0,0,0,0.4)' }}>
          {brands.map((b) => (
            <button
              key={b.id}
              onClick={() => { setCurrent(b.id); setOpen(false) }}
              className="hh-btn"
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: b.id === current?.id ? 'rgba(244,240,231,0.10)' : 'transparent', border: 'none', borderRadius: 8, padding: '9px 10px', color: 'var(--text-on-ink)', cursor: 'pointer' }}
            >
              <span style={{ width: 9, height: 9, borderRadius: 3, background: b.accent_color || '#B5632F', flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
              {b.is_default && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-on-ink-faint)' }}>parent</span>}
            </button>
          ))}

          <div style={{ borderTop: '1px solid var(--hh-line-ink)', margin: '6px 4px' }} />
          {creating ? (
            <div style={{ display: 'flex', gap: 6, padding: '2px 4px 4px' }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') create() }}
                placeholder="Brand name"
                autoFocus
                style={{ flex: 1, minWidth: 0, background: 'rgba(244,240,231,0.06)', border: '1px solid var(--hh-line-ink)', borderRadius: 8, padding: '7px 9px', fontSize: 13, color: 'var(--text-on-ink)', fontFamily: 'var(--font-sans)' }}
              />
              <button onClick={create} disabled={busy} className="hh-btn" style={{ background: 'var(--hh-copper)', color: '#F6EFE4', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12.5 }}>
                {busy ? '…' : 'Add'}
              </button>
            </div>
          ) : (
            <button onClick={() => setCreating(true)} className="hh-btn" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderRadius: 8, padding: '9px 10px', color: 'var(--text-on-ink-muted)', cursor: 'pointer', fontSize: 13.5 }}>
              <span style={{ width: 9, textAlign: 'center' }}>＋</span> New brand world
            </button>
          )}
        </div>
      )}
    </div>
  )
}

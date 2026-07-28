import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import AuthGate from './AuthGate'
import WorkspaceSelect from './WorkspaceSelect'
import { BrandProvider, useBrand } from '../lib/brandContext'
import { useIsMobile } from '../lib/useIsMobile'

export default function StudioLayout() {
  return (
    <AuthGate>
      <BrandProvider>
        <LayoutInner />
      </BrandProvider>
    </AuthGate>
  )
}

function LayoutInner() {
  const { current, chosen } = useBrand()
  const isMobile = useIsMobile()
  const [menuOpen, setMenuOpen] = useState(false)
  // On entry (and when "switch workspace" is used) show the brand-world picker.
  if (!chosen) return <WorkspaceSelect />

  // Mobile: a top bar with a hamburger, and the sidebar as a slide-in drawer.
  if (isMobile) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--hh-monterey)', color: 'var(--text-strong)', fontFamily: 'var(--font-sans)' }}>
        <header style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', background: 'var(--hh-anthracite)', color: 'var(--text-on-ink)' }}>
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" style={{ background: 'none', border: 'none', color: 'var(--text-on-ink)', fontSize: 22, lineHeight: 1, cursor: 'pointer', padding: 4 }}>☰</button>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{current?.name ?? 'Hue & Heal'}</span>
        </header>
        <main key={current?.id ?? 'none'} style={{ flex: 1, minWidth: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <Outlet />
        </main>
        {menuOpen && (
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 264, maxWidth: '84%', overflowY: 'auto', boxShadow: '2px 0 20px rgba(0,0,0,0.3)' }}>
              <Sidebar onNavigate={() => setMenuOpen(false)} />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', background: 'var(--hh-monterey)' }}>
      <div
        style={{
          display: 'flex',
          height: '100%',
          minHeight: 720,
          width: '100%',
          background: 'var(--hh-monterey)',
          color: 'var(--text-strong)',
          fontFamily: 'var(--font-sans)',
          overflow: 'hidden',
        }}
      >
        <Sidebar />
        {/* Keying on the brand id remounts the page when you switch worlds, so
            every page re-fetches its data scoped to the new brand. */}
        <main key={current?.id ?? 'none'} style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
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
  // On entry (and when "switch workspace" is used) show the brand-world picker.
  if (!chosen) return <WorkspaceSelect />

  // Mobile: an app shell with a slim top bar and a bottom tab bar.
  if (isMobile) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--hh-monterey)', color: 'var(--text-strong)', fontFamily: 'var(--font-sans)' }}>
        <header style={{ height: 50, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', background: 'var(--hh-anthracite)', color: 'var(--text-on-ink)' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 17 }}>{current?.name ?? 'Hue & Heal'}</span>
        </header>
        <main key={current?.id ?? 'none'} style={{ flex: 1, minWidth: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(66px + env(safe-area-inset-bottom))' }}>
          <Outlet />
        </main>
        <MobileNav />
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

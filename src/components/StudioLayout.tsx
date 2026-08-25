import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import MobileNav from './MobileNav'
import AppSidebar from './chrome/AppSidebar'
import CommandBar from './chrome/CommandBar'
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
  const [cmd, setCmd] = useState(false)
  // On entry (and when "switch workspace" is used) show the brand-world picker.
  if (!chosen) return <WorkspaceSelect />

  // Mobile: an app shell with a slim top bar and a bottom tab bar.
  if (isMobile) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--ck-bg)', color: 'var(--ck-ink)', fontFamily: 'var(--ck-font)' }}>
        <header style={{ height: 50, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', background: 'var(--ck-bg)', color: 'var(--ck-ink)', borderBottom: '1px solid var(--ck-line)', fontFamily: 'var(--ck-font)' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 17 }}>{current?.name ?? 'Hue & Heal'}</span>
        </header>
        <main key={current?.id ?? 'none'} style={{ flex: 1, minWidth: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(66px + env(safe-area-inset-bottom))' }}>
          <Outlet />
        </main>
        <MobileNav />
        <CommandBar open={cmd} onOpenChange={setCmd} />
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', background: 'var(--ck-bg)' }}>
      <div
        style={{
          display: 'flex',
          height: '100%',
          minHeight: 720,
          width: '100%',
          background: 'var(--ck-bg)',
          color: 'var(--ck-ink)',
          fontFamily: 'var(--ck-font)',
          overflow: 'hidden',
        }}
      >
        <AppSidebar onOpenCommand={() => setCmd(true)} />
        {/* Keying on the brand id remounts the page when you switch worlds, so
            every page re-fetches its data scoped to the new brand. */}
        <main key={current?.id ?? 'none'} style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
      <CommandBar open={cmd} onOpenChange={setCmd} />
    </div>
  )
}

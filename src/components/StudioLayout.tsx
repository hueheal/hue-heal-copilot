import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import AuthGate from './AuthGate'
import { BrandProvider, useBrand } from '../lib/brandContext'

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
  const { current } = useBrand()
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

import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function StudioLayout() {
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
        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

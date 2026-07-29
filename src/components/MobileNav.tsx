import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { NAV, type NavItem } from '../data/studio'
import { useAuth } from '../lib/auth'
import { useBrand } from '../lib/brandContext'
import { CORE_NAV, DEFAULT_MODULES } from '../lib/modules'

/* App-style bottom tab bar for mobile: four primary destinations plus a More
   sheet for the rest, workspace switching and sign out. Replaces the desktop
   sidebar on small screens. */
const PRIMARY_ORDER = ['dashboard', 'social', 'newsletter', 'journal', 'clients', 'proposals', 'calendar', 'reports']

const bar: React.CSSProperties = {
  position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40,
  display: 'flex', background: 'var(--hh-anthracite)', borderTop: '1px solid rgba(244,240,231,0.12)',
  paddingBottom: 'env(safe-area-inset-bottom)',
}
const tab = (active: boolean): React.CSSProperties => ({
  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
  padding: '9px 4px 8px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none',
  color: active ? 'var(--hh-ember)' : 'var(--text-on-ink-muted)',
})
const glyphS: React.CSSProperties = { fontSize: 17, lineHeight: 1 }
const labelS: React.CSSProperties = { fontSize: 10, letterSpacing: '0.02em', fontWeight: 500 }

export default function MobileNav() {
  const { current, openSelector } = useBrand()
  const auth = useAuth()
  const [more, setMore] = useState(false)
  const enabled = current?.modules ?? DEFAULT_MODULES
  const avail = NAV.filter((i) => CORE_NAV.includes(i.key) || enabled.includes(i.key))
  const primary = PRIMARY_ORDER.map((k) => avail.find((i) => i.key === k)).filter((i): i is NavItem => !!i).slice(0, 4)
  const primaryKeys = new Set(primary.map((i) => i.key))
  const rest = avail.filter((i) => !primaryKeys.has(i.key))

  return (
    <>
      <nav style={bar}>
        {primary.map((item) => (
          <NavLink key={item.key} to={item.path} end={item.path === '/'} style={({ isActive }) => tab(isActive)}>
            {({ isActive }) => (<><span style={{ ...glyphS, color: isActive ? 'var(--hh-ember)' : 'var(--text-on-ink-faint)' }}>{item.glyph}</span><span style={labelS}>{item.label.split(' ')[0]}</span></>)}
          </NavLink>
        ))}
        <button onClick={() => setMore(true)} style={tab(more)}>
          <span style={{ ...glyphS, color: 'var(--text-on-ink-faint)' }}>⋯</span>
          <span style={labelS}>More</span>
        </button>
      </nav>

      {more && (
        <div onClick={() => setMore(false)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: 'var(--hh-anthracite)', color: 'var(--text-on-ink)', borderRadius: '18px 18px 0 0', padding: '10px 12px calc(16px + env(safe-area-inset-bottom))', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(244,240,231,0.25)', margin: '6px auto 12px' }} />
            {rest.map((item) => (
              <NavLink key={item.key} to={item.path} end={item.path === '/'} onClick={() => setMore(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 12px', borderRadius: 12, textDecoration: 'none', color: 'var(--text-on-ink)', fontSize: 15 }}>
                <span style={{ width: 20, textAlign: 'center', color: 'var(--text-on-ink-faint)' }}>{item.glyph}</span>{item.label}
              </NavLink>
            ))}
            <div style={{ height: 1, background: 'rgba(244,240,231,0.12)', margin: '8px 12px' }} />
            <button onClick={() => { setMore(false); openSelector() }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 12px', width: '100%', background: 'none', border: 'none', color: 'var(--text-on-ink)', fontSize: 15, cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ width: 20, textAlign: 'center', color: 'var(--text-on-ink-faint)' }}>⇄</span>Switch workspace
            </button>
            {auth.mode === 'connected' && auth.session && (
              <button onClick={() => { setMore(false); auth.signOut() }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 12px', width: '100%', background: 'none', border: 'none', color: 'var(--text-on-ink-muted)', fontSize: 15, cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ width: 20, textAlign: 'center', color: 'var(--text-on-ink-faint)' }}>⏻</span>Sign out
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}

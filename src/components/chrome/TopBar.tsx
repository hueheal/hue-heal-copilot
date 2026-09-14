import { type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import * as Dropdown from '@radix-ui/react-dropdown-menu'
import { useBrand } from '../../lib/brandContext'
import { useTheme, type ThemeMode } from '../../lib/theme'
import { useAuth } from '../../lib/auth'
import { IcHome, IcCreate, IcClients, IcSettings, IcSearch, IcSun, IcMoon, IcMonitor, IcChevronsUpDown, IcRole } from './icons'

/* ============================================================
   The floating glass menu. One bar: workspace, the areas, search,
   theme, settings. Glass per the September brief; the chrome is
   Hue & Heal whatever the workspace, which shows as name + dot.
   ============================================================ */

const IS_MAC = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)
export const CMDK_LABEL = IS_MAC ? '⌘K' : 'Ctrl K'

const AREAS: { key: string; label: string; path: string; icon: () => ReactNode; end?: boolean }[] = [
  { key: 'dashboard', label: 'Home', path: '/', icon: IcHome, end: true },
  { key: 'roles', label: 'Team', path: '/team', icon: IcRole },
  { key: 'create', label: 'Create', path: '/create', icon: IcCreate },
  { key: 'clients', label: 'Clients', path: '/clients', icon: IcClients },
]

export default function TopBar({ onOpenCommand }: { onOpenCommand: () => void }) {
  const { brands, current, setCurrent, openSelector } = useBrand()
  const { mode, setMode } = useTheme()
  const auth = useAuth()
  const nav = useNavigate()
  const themeIcon = mode === 'light' ? <IcSun /> : mode === 'dark' ? <IcMoon /> : <IcMonitor />
  const themeLabel = mode === 'system' ? 'Theme: system' : mode === 'light' ? 'Theme: light' : 'Theme: dark'

  return (
    <header className="ck-topbar" role="banner">
      {/* Workspace */}
      <Dropdown.Root>
        <Dropdown.Trigger asChild>
          <button className="ck-top-ws" aria-label={`Workspace: ${current?.name ?? 'none'}`}>
            <span className="ck-dot" style={{ background: current?.accent_color || 'var(--ck-accent)' }} />
            <span className="ck-top-ws-name">{current?.name ?? 'Workspace'}</span>
            <span style={{ color: 'var(--ck-faint)', display: 'inline-flex' }}><IcChevronsUpDown /></span>
          </button>
        </Dropdown.Trigger>
        <Dropdown.Portal>
          <Dropdown.Content className="ck-menu" side="bottom" align="start" sideOffset={8}>
            <div className="ck-menu-label">Workspaces</div>
            {brands.map((b) => (
              <Dropdown.Item key={b.id} className="ck-menu-item" onSelect={() => setCurrent(b.id)}>
                <span className="ck-dot" style={{ background: b.accent_color || 'var(--ck-accent)' }} />
                {b.name}
                {b.id === current?.id && <span className="ck-sub">current</span>}
              </Dropdown.Item>
            ))}
            <div className="ck-menu-sep" />
            <Dropdown.Item className="ck-menu-item" onSelect={() => openSelector()}>All workspaces…</Dropdown.Item>
            <Dropdown.Item className="ck-menu-item" onSelect={() => nav('/settings')}><IcSettings /> Settings</Dropdown.Item>
            {auth.session && (
              <>
                <div className="ck-menu-sep" />
                <div className="ck-menu-label" style={{ textTransform: 'none', letterSpacing: 0 }}>{auth.session.user.email}</div>
              </>
            )}
          </Dropdown.Content>
        </Dropdown.Portal>
      </Dropdown.Root>

      {/* Areas */}
      <nav className="ck-top-nav" aria-label="Areas">
        {AREAS.map((a) => (
          <NavLink key={a.key} to={a.path} end={a.end} className="ck-top-item">
            <a.icon />
            <span>{a.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Utilities */}
      <div className="ck-top-utils">
        <button className="ck-top-icon" onClick={onOpenCommand} aria-label={`Search, ${CMDK_LABEL}`} title={`Search · ${CMDK_LABEL}`}>
          <IcSearch />
        </button>
        <button className="ck-top-icon" aria-label={themeLabel} title={themeLabel}
          onClick={() => setMode((mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system') as ThemeMode)}>
          {themeIcon}
        </button>
        <NavLink to="/settings" className="ck-top-icon" aria-label="Settings" title="Settings"><IcSettings /></NavLink>
      </div>
    </header>
  )
}

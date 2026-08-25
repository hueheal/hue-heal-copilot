import { useEffect, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import * as Dropdown from '@radix-ui/react-dropdown-menu'
import * as Tip from '@radix-ui/react-tooltip'
import { useBrand } from '../../lib/brandContext'
import { CORE_NAV, DEFAULT_MODULES } from '../../lib/modules'
import { useTheme, type ThemeMode } from '../../lib/theme'
import { useAuth } from '../../lib/auth'
import {
  IcHome, IcCreate, IcClients, IcCalendar, IcChart, IcSettings,
  IcSearch, IcSun, IcMoon, IcMonitor, IcPanel, IcChevronsUpDown,
} from './icons'

/* ============================================================
   Copilot chrome · sidebar. Collapsible to an icon rail,
   workspace switcher up top, search + theme + settings at the
   foot. Styles come from chrome.css (--ck-*), never --hh-*.
   ============================================================ */

const RAIL_KEY = 'hh:rail'
const IS_MAC = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)
export const CMDK_LABEL = IS_MAC ? '⌘K' : 'Ctrl K'

const NAV: { key: string; label: string; path: string; icon: () => ReactNode; end?: boolean }[] = [
  { key: 'dashboard', label: 'Home', path: '/', icon: IcHome, end: true },
  { key: 'create', label: 'Create', path: '/create', icon: IcCreate },
  { key: 'clients', label: 'Clients', path: '/clients', icon: IcClients },
  { key: 'calendar', label: 'Calendar', path: '/calendar', icon: IcCalendar },
  { key: 'reports', label: 'Analytics', path: '/reports', icon: IcChart },
]

function WithTip({ children, label, rail }: { children: ReactNode; label: string; rail: boolean }) {
  if (!rail) return <>{children}</>
  return (
    <Tip.Root delayDuration={250}>
      <Tip.Trigger asChild>{children}</Tip.Trigger>
      <Tip.Portal>
        <Tip.Content className="ck-tip" side="right" sideOffset={8}>{label}</Tip.Content>
      </Tip.Portal>
    </Tip.Root>
  )
}

export default function AppSidebar({ onOpenCommand }: { onOpenCommand: () => void }) {
  const { brands, current, setCurrent, openSelector } = useBrand()
  const { mode, setMode } = useTheme()
  const auth = useAuth()
  const [rail, setRail] = useState(() => { try { return localStorage.getItem(RAIL_KEY) === '1' } catch { return false } })
  useEffect(() => { try { localStorage.setItem(RAIL_KEY, rail ? '1' : '') } catch { /* ignore */ } }, [rail])

  const enabled = current?.modules ?? DEFAULT_MODULES
  const items = NAV.filter((i) => CORE_NAV.includes(i.key as never) || enabled.includes(i.key))
  const accent = current?.accent_color || '#B5632F'
  const themeIcon = mode === 'light' ? <IcSun /> : mode === 'dark' ? <IcMoon /> : <IcMonitor />
  const themeLabel = mode === 'system' ? 'Theme · System' : mode === 'light' ? 'Theme · Light' : 'Theme · Dark'

  return (
    <Tip.Provider>
      <aside className="ck-sidebar" data-rail={rail ? '1' : '0'} style={{ ['--ck-accent' as never]: accent }}>
        {/* Workspace switcher */}
        <Dropdown.Root>
          <WithTip label={current?.name ?? 'Workspace'} rail={rail}>
            <Dropdown.Trigger asChild>
              <button className="ck-ws" aria-label={`Workspace: ${current?.name ?? 'none'}`}>
                <span className="ck-dot" />
                <span className="ck-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{current?.name ?? 'Workspace'}</span>
                <span className="ck-chev" style={{ marginLeft: 'auto', color: 'var(--ck-faint)', display: 'inline-flex' }}><IcChevronsUpDown /></span>
              </button>
            </Dropdown.Trigger>
          </WithTip>
          <Dropdown.Portal>
            <Dropdown.Content className="ck-menu" side="bottom" align="start" sideOffset={6}>
              <div className="ck-menu-label">Workspaces</div>
              {brands.map((b) => (
                <Dropdown.Item key={b.id} className="ck-menu-item" onSelect={() => setCurrent(b.id)}>
                  <span className="ck-dot" style={{ background: b.accent_color || '#B5632F' }} />
                  {b.name}
                  {b.id === current?.id && <span className="ck-sub">current</span>}
                </Dropdown.Item>
              ))}
              <div className="ck-menu-sep" />
              <Dropdown.Item className="ck-menu-item" onSelect={() => openSelector()}>All workspaces…</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>

        <div style={{ height: 14 }} />

        {/* Primary nav */}
        <nav className="ck-side-section" aria-label="Workspace">
          {items.map((i) => (
            <WithTip key={i.key} label={i.label} rail={rail}>
              <NavLink to={i.path} end={i.end} className="ck-item">
                <i.icon />
                <span className="ck-label">{i.label}</span>
              </NavLink>
            </WithTip>
          ))}
        </nav>

        <div className="ck-side-gap" />

        {/* Footer */}
        <div className="ck-side-section">
          <WithTip label={`Search · ${CMDK_LABEL}`} rail={rail}>
            <button className="ck-item" onClick={onOpenCommand}>
              <IcSearch />
              <span className="ck-label">Search</span>
              <span className="ck-kbd">{CMDK_LABEL}</span>
            </button>
          </WithTip>
          <WithTip label={themeLabel} rail={rail}>
            <button className="ck-item" aria-label={themeLabel}
              onClick={() => setMode((mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system') as ThemeMode)}>
              {themeIcon}
              <span className="ck-label">{mode === 'system' ? 'System theme' : mode === 'light' ? 'Light theme' : 'Dark theme'}</span>
            </button>
          </WithTip>
          <WithTip label="Settings" rail={rail}>
            <NavLink to="/settings" className="ck-item">
              <IcSettings />
              <span className="ck-label">Settings</span>
            </NavLink>
          </WithTip>
          <WithTip label={rail ? 'Expand sidebar' : 'Collapse sidebar'} rail={rail}>
            <button className="ck-item" aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setRail((r) => !r)}>
              <IcPanel />
              <span className="ck-label">Collapse</span>
            </button>
          </WithTip>
          {!rail && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px 2px', color: 'var(--ck-muted)', fontSize: 12.5 }}>
              <span style={{ width: 24, height: 24, borderRadius: 999, background: 'var(--ck-surface-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 500, color: 'var(--ck-ink)' }}>
                {(auth.session?.user.email ?? 'M')[0].toUpperCase()}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{auth.session?.user.email ?? 'Local mode'}</span>
            </div>
          )}
        </div>
      </aside>
    </Tip.Provider>
  )
}

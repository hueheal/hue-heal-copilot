import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { useBrand } from '../../lib/brandContext'
import { useTheme } from '../../lib/theme'
import {
  IcHome, IcCreate, IcClients, IcSettings,
  IcSun, IcMoon, IcMonitor, IcDoc, IcMail, IcInvoice,
} from './icons'

/* ============================================================
   Copilot chrome · ⌘K command bar (cmdk). Navigate, create,
   switch workspace, switch theme — keyboard-first.
   ============================================================ */

export default function CommandBar({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const nav = useNavigate()
  const { brands, current, setCurrent } = useBrand()
  const { setMode } = useTheme()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); onOpenChange(!open) }
      if (e.key === 'Escape' && open) onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  if (!open) return null
  const go = (path: string) => { onOpenChange(false); nav(path) }

  return (
    <div className="ck-cmd-overlay" onPointerDown={(e) => { if (e.target === e.currentTarget) onOpenChange(false) }}>
      <Command className="ck-cmd" label="Command bar" loop>
        <Command.Input autoFocus placeholder={`Search ${current?.name ?? 'the studio'}…`} />
        <Command.List>
          <Command.Empty>Nothing matches.</Command.Empty>

          <Command.Group heading="Create">
            <Command.Item onSelect={() => go('/create/journal')}><IcDoc /> New journal article</Command.Item>
            <Command.Item onSelect={() => go('/create/newsletter')}><IcMail /> New newsletter</Command.Item>
            <Command.Item onSelect={() => go('/proposals')}><IcInvoice /> Proposals &amp; invoices</Command.Item>
          </Command.Group>

          <Command.Group heading="Go to">
            <Command.Item onSelect={() => go('/')}><IcHome /> Home</Command.Item>
            <Command.Item onSelect={() => go('/create')}><IcCreate /> Create</Command.Item>
            <Command.Item onSelect={() => go('/team')}><IcClients /> Team</Command.Item>
            <Command.Item onSelect={() => go('/clients')}><IcClients /> Clients</Command.Item>
            <Command.Item onSelect={() => go('/settings')}><IcSettings /> Settings</Command.Item>
          </Command.Group>

          <Command.Group heading="Workspace">
            {brands.filter((b) => b.id !== current?.id).map((b) => (
              <Command.Item key={b.id} onSelect={() => { setCurrent(b.id); onOpenChange(false) }}>
                <span className="ck-dot" style={{ background: b.accent_color || '#B5632F' }} /> Switch to {b.name}
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="Theme">
            <Command.Item onSelect={() => { setMode('light'); onOpenChange(false) }}><IcSun /> Light</Command.Item>
            <Command.Item onSelect={() => { setMode('dark'); onOpenChange(false) }}><IcMoon /> Dark</Command.Item>
            <Command.Item onSelect={() => { setMode('system'); onOpenChange(false) }}><IcMonitor /> System</Command.Item>
          </Command.Group>
        </Command.List>
        <div className="ck-cmd-hintbar">
          <span>↑↓ navigate</span><span>↵ select</span><span>esc close</span>
        </div>
      </Command>
    </div>
  )
}

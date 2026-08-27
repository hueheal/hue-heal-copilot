import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { useBrand } from '../../lib/brandContext'
import { useTheme } from '../../lib/theme'
import { savePost } from '../../lib/socialCopilot'
import type { PostFormat } from '../../lib/database.types'
import {
  IcHome, IcCreate, IcClients, IcCalendar, IcChart, IcSettings,
  IcSun, IcMoon, IcMonitor, IcDoc, IcMail, IcImage, IcLayers, IcInvoice,
} from './icons'

/* ============================================================
   Copilot chrome · ⌘K command bar (cmdk). Navigate, create,
   switch workspace, switch theme — keyboard-first.
   ============================================================ */

export default function CommandBar({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const nav = useNavigate()
  const { brands, current, setCurrent } = useBrand()
  const { setMode } = useTheme()
  const [busy, setBusy] = useState(false)

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
  async function newSocial(format: PostFormat) {
    if (busy) return
    setBusy(true)
    try {
      const post = await savePost({ topic: '', format, sector: 'hospitality', accent: 'copper', platform: 'instagram', headline: '', caption: '', hashtags: [], slides: [], image_url: null, status: 'draft' })
      go(`/create/social/${post.id}`)
    } finally { setBusy(false) }
  }

  return (
    <div className="ck-cmd-overlay" onPointerDown={(e) => { if (e.target === e.currentTarget) onOpenChange(false) }}>
      <Command className="ck-cmd" label="Command bar" loop>
        <Command.Input autoFocus placeholder={`Search ${current?.name ?? 'the studio'}…`} />
        <Command.List>
          <Command.Empty>Nothing matches.</Command.Empty>

          <Command.Group heading="Create">
            <Command.Item onSelect={() => newSocial('carousel')}><IcLayers /> New Instagram carousel</Command.Item>
            <Command.Item onSelect={() => newSocial('portrait')}><IcImage /> New Instagram post</Command.Item>
            <Command.Item onSelect={() => newSocial('story')}><IcImage /> New Instagram story</Command.Item>
            <Command.Item onSelect={() => go('/create/journal')}><IcDoc /> New journal article</Command.Item>
            <Command.Item onSelect={() => go('/create/newsletter')}><IcMail /> New newsletter</Command.Item>
            <Command.Item onSelect={() => go('/proposals')}><IcInvoice /> Proposals &amp; invoices</Command.Item>
          </Command.Group>

          <Command.Group heading="Go to">
            <Command.Item onSelect={() => go('/')}><IcHome /> Home</Command.Item>
            <Command.Item onSelect={() => go('/create')}><IcCreate /> Create</Command.Item>
            <Command.Item onSelect={() => go('/library')}><IcLayers /> Library</Command.Item>
            <Command.Item onSelect={() => go('/roles')}><IcClients /> Roles</Command.Item>
            <Command.Item onSelect={() => go('/clients')}><IcClients /> Clients</Command.Item>
            <Command.Item onSelect={() => go('/calendar')}><IcCalendar /> Calendar</Command.Item>
            <Command.Item onSelect={() => go('/reports')}><IcChart /> Analytics</Command.Item>
            <Command.Item onSelect={() => go('/templates')}><IcImage /> Template gallery</Command.Item>
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

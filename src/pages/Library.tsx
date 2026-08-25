import { useEffect, useMemo, useState } from 'react'
import * as Dropdown from '@radix-ui/react-dropdown-menu'
import { useBrand } from '../lib/brandContext'
import {
  listAssets, listProjects, createProject, assignToProject,
  ASSET_KINDS, type Asset, type AssetKind, type Project,
} from '../lib/assets'
import AssetCard from '../components/chrome/AssetCard'

/* ============================================================
   Library (Phase 8): everything the studio has made, one place.
   Search, filter by type/status/project, visual cards, and the
   project actions that group related work.
   ============================================================ */

type StatusFilter = 'all' | 'draft' | 'published'

export default function Library() {
  const { current } = useBrand()
  const [assets, setAssets] = useState<Asset[] | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<AssetKind | 'all'>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [projectId, setProjectId] = useState<string | 'all' | 'none'>('all')
  const [note, setNote] = useState<string | null>(null)

  async function reload() {
    const [a, p] = await Promise.all([listAssets(), listProjects()])
    setAssets(a); setProjects(p)
  }
  useEffect(() => { setAssets(null); reload() /* eslint-disable-next-line */ }, [current?.id])

  const shown = useMemo(() => {
    if (!assets) return []
    const needle = q.trim().toLowerCase()
    return assets.filter((a) => {
      if (kind !== 'all' && a.kind !== kind) return false
      if (status === 'draft' && a.status !== 'draft') return false
      if (status === 'published' && a.status === 'draft') return false
      if (projectId === 'none' && a.projectId) return false
      if (projectId !== 'all' && projectId !== 'none' && a.projectId !== projectId) return false
      if (needle && !(`${a.title} ${a.sub}`.toLowerCase().includes(needle))) return false
      return true
    })
  }, [assets, q, kind, status, projectId])

  async function addTo(asset: Asset, pid: string | null) {
    try {
      await assignToProject(asset.kind, asset.id, pid)
      setNote(pid ? `Added to ${projects.find((p) => p.id === pid)?.name ?? 'project'}` : 'Removed from project')
      reload()
    } catch (e) { setNote(e instanceof Error ? e.message : String(e)) }
  }
  async function newProject(asset?: Asset) {
    const name = window.prompt('Project name', asset ? asset.title : '')
    if (!name?.trim()) return
    try {
      const p = await createProject(name.trim())
      if (p && asset) await assignToProject(asset.kind, asset.id, p.id)
      setNote(`Project “${name.trim()}” created`)
      reload()
    } catch (e) { setNote(e instanceof Error ? e.message : String(e)) }
  }

  return (
    <div className="ck-page">
      <div className="ck-page-inner" style={{ maxWidth: 1040 }}>
        <div className="ck-eyebrow">{current?.name ?? 'Studio'}</div>
        <h1 className="ck-h1" style={{ marginBottom: 24 }}>Library</h1>

        <div className="ck-toolbar">
          <input className="ck-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search everything…" aria-label="Search library" />
          <div className="ck-filterrow">
            <button className="ck-pill" data-on={kind === 'all' ? '1' : '0'} onClick={() => setKind('all')}>All</button>
            {ASSET_KINDS.map((k) => (
              <button key={k.key} className="ck-pill" data-on={kind === k.key ? '1' : '0'} onClick={() => setKind(k.key)}>{k.label}</button>
            ))}
            <span className="ck-vr" />
            {(['all', 'draft', 'published'] as const).map((s) => (
              <button key={s} className="ck-pill" data-on={status === s ? '1' : '0'} onClick={() => setStatus(s)}>
                {s === 'all' ? 'Any status' : s === 'draft' ? 'Drafts' : 'Published'}
              </button>
            ))}
            {projects.length > 0 && (
              <>
                <span className="ck-vr" />
                <select className="ck-select" value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label="Filter by project">
                  <option value="all">All projects</option>
                  <option value="none">No project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </>
            )}
            <button className="ck-pill" style={{ marginLeft: 'auto' }} onClick={() => newProject()}>+ New project</button>
          </div>
        </div>

        {note && <div className="ck-note" role="status">{note}</div>}

        {assets === null ? (
          <div className="ck-cards" style={{ marginTop: 22 }}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="ck-skeleton" />)}
          </div>
        ) : shown.length === 0 ? (
          <div className="ck-empty">
            <div style={{ fontSize: 15, fontWeight: 500 }}>Nothing here yet</div>
            <p>{q || kind !== 'all' || projectId !== 'all' ? 'Nothing matches these filters. Clear them, or make something new.' : 'Start creating and your work will collect here.'}</p>
          </div>
        ) : (
          <div className="ck-cards" style={{ marginTop: 22 }}>
            {shown.map((a) => (
              <AssetCard key={`${a.kind}-${a.id}`} asset={a}
                menu={
                  <Dropdown.Root>
                    <Dropdown.Trigger asChild>
                      <button className="ck-dots" aria-label="Asset actions">⋯</button>
                    </Dropdown.Trigger>
                    <Dropdown.Portal>
                      <Dropdown.Content className="ck-menu" side="bottom" align="end" sideOffset={4}>
                        <div className="ck-menu-label">Project</div>
                        {projects.map((p) => (
                          <Dropdown.Item key={p.id} className="ck-menu-item" onSelect={() => addTo(a, p.id)}>
                            {p.name}{a.projectId === p.id && <span className="ck-sub">current</span>}
                          </Dropdown.Item>
                        ))}
                        <Dropdown.Item className="ck-menu-item" onSelect={() => newProject(a)}>New project…</Dropdown.Item>
                        {a.projectId && <Dropdown.Item className="ck-menu-item" onSelect={() => addTo(a, null)}>Remove from project</Dropdown.Item>}
                      </Dropdown.Content>
                    </Dropdown.Portal>
                  </Dropdown.Root>
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

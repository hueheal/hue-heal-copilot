import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBrand } from '../lib/brandContext'
import { listRoles, hireRole, ROLE_PRESETS, type Role } from '../lib/roles'


/* ============================================================
   Roles: the workspace's org. Each role is a persona agent with
   its own dashboard, cadence and ledger. Hire from the presets
   or define a custom seat.
   ============================================================ */

export default function Roles() {
  const { current } = useBrand()
  const nav = useNavigate()
  const [roles, setRoles] = useState<Role[] | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [custom, setCustom] = useState(false)
  const [cName, setCName] = useState('')
  const [cTitle, setCTitle] = useState('')
  const [cCharter, setCCharter] = useState('')
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => { setRoles(null); listRoles().then(setRoles) }, [current?.id])

  const hiredKeys = new Set((roles ?? []).map((r) => r.key))
  const openPresets = ROLE_PRESETS.filter((p) => !hiredKeys.has(p.key))

  async function hire(presetKey: string) {
    const preset = ROLE_PRESETS.find((p) => p.key === presetKey)
    if (!preset) return
    setBusyKey(presetKey)
    try {
      const r = await hireRole(preset)
      nav(`/roles/${r.id}`)
    } catch (e) { setNote(e instanceof Error ? e.message : String(e)); setBusyKey(null) }
  }
  async function hireCustom() {
    if (!cName.trim() || !cCharter.trim()) return
    setBusyKey('custom')
    try {
      const r = await hireRole({ key: 'custom', name: cName.trim(), title: cTitle.trim(), charter: cCharter.trim() })
      nav(`/roles/${r.id}`)
    } catch (e) { setNote(e instanceof Error ? e.message : String(e)); setBusyKey(null) }
  }

  const cadenceLabel = (r: Role) => {
    const c = r.schedule?.cadence
    return c === 'daily' ? 'Runs daily' : c === 'weekdays' ? 'Runs weekdays' : c === 'weekly' ? 'Runs weekly' : 'On demand'
  }

  return (
    <div className="ck-page">
      <div className="ck-page-inner" style={{ maxWidth: 960 }}>
        <div className="ck-eyebrow">{current?.name ?? 'Studio'}</div>
        <h1 className="ck-h1">Roles</h1>

        {note && <div className="ck-note" role="status">{note}</div>}

        {roles === null ? (
          <div className="ck-cards">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="ck-skeleton" />)}</div>
        ) : roles.length > 0 && (
          <>
            <h2 className="ck-h2">Your org</h2>
            <div className="ck-tiles" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {roles.map((r) => (
                <button key={r.id} className="ck-tile" style={{ alignItems: 'stretch', flexDirection: 'column', gap: 8 }} onClick={() => nav(`/roles/${r.id}`)}>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span className="ck-tile-label" style={{ fontSize: 15 }}>{r.name}</span>
                    <span className="ck-tile-sub" style={{ marginTop: 0 }}>{r.title}</span>
                  </span>
                  <span className="ck-tile-sub" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'normal' }}>{r.charter}</span>
                  <span style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                    <span className="ck-pill" style={{ pointerEvents: 'none' }}>{cadenceLabel(r)}</span>
                    {!r.enabled && <span className="ck-pill" style={{ pointerEvents: 'none' }}>Paused</span>}
                  </span>
                </button>
              ))}
            </div>
            <div className="ck-sectiongap" />
          </>
        )}

        {openPresets.length > 0 && (
          <>
            <h2 className="ck-h2">Open seats</h2>
            <div className="ck-tiles" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {openPresets.map((p) => (
                <div key={p.key} className="ck-tile" style={{ alignItems: 'stretch', flexDirection: 'column', gap: 8, cursor: 'default' }}>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span className="ck-tile-label" style={{ fontSize: 15 }}>{p.name}</span>
                    <span className="ck-tile-sub" style={{ marginTop: 0 }}>{p.title}</span>
                  </span>
                  <span className="ck-tile-sub" style={{ whiteSpace: 'normal' }}>{p.charter.split('.')[0]}.</span>
                  <span>
                    <button className="ck-go" style={{ marginLeft: 0 }} disabled={busyKey === p.key} onClick={() => void hire(p.key)}>
                      {busyKey === p.key ? 'Hiring…' : 'Hire'}
                    </button>
                  </span>
                </div>
              ))}
            </div>
            <div className="ck-sectiongap" />
          </>
        )}

        <h2 className="ck-h2">Custom seat</h2>
        {!custom ? (
          <button className="ck-pill" onClick={() => setCustom(true)}>+ Define a role</button>
        ) : (
          <div className="ck-composer" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="ck-search" value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Role name — e.g. Head of Partnerships" />
              <input className="ck-search" value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="Title (optional)" />
            </div>
            <textarea value={cCharter} onChange={(e) => setCCharter(e.target.value)} rows={3}
              placeholder="Charter — what this role owns, cares about, and is judged on."
              style={{ minHeight: 70 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="ck-go" style={{ marginLeft: 0 }} disabled={!cName.trim() || !cCharter.trim() || busyKey === 'custom'} onClick={() => void hireCustom()}>
                {busyKey === 'custom' ? 'Hiring…' : 'Hire role'}
              </button>
              <button className="ck-pill" onClick={() => setCustom(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

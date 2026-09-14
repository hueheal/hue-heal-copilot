import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBrand } from '../lib/brandContext'
import { listRoles, hireDepartment, listWorkspaceJobs, decideJob, type Role, type RoleJob } from '../lib/roles'
import { DEPARTMENTS, seatsIn, deptOf, type OrgDept } from '../lib/org'
import { officeImage } from '../lib/office'
import { agoLabel } from '../components/chrome/AssetCard'
import Briefing from '../components/Briefing'
import Priorities from '../components/Priorities'

/* ============================================================
   The Team office. Rooms first: one diorama per department plus
   the meeting room. Everything else folds beneath.
   ============================================================ */

function RoomCard({ d, sub, badges, onClick }: { d: { key: string; name: string; accent?: string }; sub: string; badges?: React.ReactNode; onClick: () => void }) {
  const [broken, setBroken] = useState(false)
  const accent = (d as OrgDept).accent ?? 'var(--ck-accent)'
  return (
    <button className="ck-room-card" style={{ ['--ck-dept' as never]: accent }} onClick={onClick}>
      {broken ? (
        <span className="ck-room-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(145deg, color-mix(in srgb, ${accent} 16%, var(--ck-surface-2)), var(--ck-surface-2))` }}>
          <span className="ck-dept-mark" data-size="l">{(d as OrgDept).mark ?? '··'}</span>
        </span>
      ) : (
        <img className="ck-room-img" src={officeImage(d.key)} alt="" loading="lazy" onError={() => setBroken(true)} />
      )}
      {badges && <span className="ck-room-badges">{badges}</span>}
      <span className="ck-room-meta">
        <span style={{ minWidth: 0 }}>
          <span className="ck-room-name" style={{ display: 'block' }}>{d.name}</span>
          <span className="ck-room-sub">{sub}</span>
        </span>
      </span>
    </button>
  )
}

/* The office as an environment: one room fills the stage, its neighbours
   wait at the edges. Glide between them with the arrows, the keyboard or a
   swipe; click the centred room to walk in. */
function Office({ roles, jobs, hired, onEnter }: { roles: Role[]; jobs: RoleJob[]; hired: OrgDept[]; onEnter: (key: string) => void }) {
  const railRef = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState(0)
  const rooms = useMemo(() => ([
    ...hired.map((d) => ({ key: d.key, name: d.name, accent: d.accent, mark: d.mark })),
    { key: 'meeting', name: 'Meeting room', accent: '#B5632F', mark: 'MR' },
  ]), [hired])

  const goto = (i: number) => {
    const rail = railRef.current
    if (!rail) return
    const slide = rail.children[Math.max(0, Math.min(rooms.length - 1, i))] as HTMLElement | undefined
    slide?.scrollIntoView({ behavior: 'matchMedia' in window && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', inline: 'center', block: 'nearest' })
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.key === 'ArrowRight') { e.preventDefault(); goto(idx + 1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goto(idx - 1) }
      if (e.key === 'Enter' && rooms[idx]) onEnter(rooms[idx].key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    /* eslint-disable-next-line */
  }, [idx, rooms.length])
  const onScroll = () => {
    const rail = railRef.current
    if (!rail) return
    const centre = rail.scrollLeft + rail.clientWidth / 2
    let best = 0; let gap = Infinity
    Array.from(rail.children).forEach((c, i) => {
      const el = c as HTMLElement
      const mid = el.offsetLeft + el.offsetWidth / 2
      if (Math.abs(mid - centre) < gap) { gap = Math.abs(mid - centre); best = i }
    })
    setIdx(best)
  }

  const room = rooms[idx]
  const lead = roles.find((r) => r.dept === room?.key && r.seat === 'lead')
  const team = roles.filter((r) => r.dept === room?.key && r.seat === 'member').length
  const w = jobs.filter((j) => j.dept === room?.key && (j.status === 'queued' || j.status === 'running')).length
  const a = jobs.filter((j) => j.dept === room?.key && j.status === 'done' && j.approval === 'pending').length
  const u = jobs.filter((j) => j.dept === room?.key && j.status === 'done' && !j.reviewed_at && j.approval !== 'pending').length

  return (
    <div className="ck-office">
      <div className="ck-office-rail" ref={railRef} onScroll={onScroll}>
        {rooms.map((r, i) => (
          <button key={r.key} className="ck-office-slide" data-active={i === idx ? '1' : '0'} style={{ ['--ck-dept' as never]: r.accent }}
            aria-label={r.name}
            onClick={() => (i === idx ? onEnter(r.key) : goto(i))}>
            <img src={officeImage(r.key)} alt="" draggable={false}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }} />
          </button>
        ))}
      </div>
      <button className="ck-office-arrow" data-side="l" aria-label="Previous room" disabled={idx === 0} onClick={() => goto(idx - 1)}>‹</button>
      <button className="ck-office-arrow" data-side="r" aria-label="Next room" disabled={idx === rooms.length - 1} onClick={() => goto(idx + 1)}>›</button>
      {room && (
        <div className="ck-office-meta">
          <div style={{ fontSize: 17, fontWeight: 600 }}>{room.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ck-muted)' }}>
            {room.key === 'meeting' ? 'Call anyone in. Minutes by your chief.' : `${lead?.name ?? ''}${team ? ` and ${team} more` : ''}`}
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', minHeight: 26 }}>
            {w > 0 && <span className="ck-pill" data-live="1" style={{ ['--ck-dept' as never]: room.accent, pointerEvents: 'none' }}>{w} working</span>}
            {a > 0 && <span className="ck-pill" data-on="1" style={{ pointerEvents: 'none' }}>{a} to approve</span>}
            {u > 0 && <span className="ck-pill" style={{ pointerEvents: 'none' }}>{u} to read</span>}
          </div>
          <button className="ck-go" style={{ marginLeft: 0 }} onClick={() => onEnter(room.key)}>{room.key === 'meeting' ? 'Walk in' : 'Enter the room'}</button>
          <div className="ck-office-dots" role="tablist" aria-label="Rooms">
            {rooms.map((r, i) => <button key={r.key} role="tab" aria-selected={i === idx} className="ck-office-dot" data-on={i === idx ? '1' : '0'} onClick={() => goto(i)} aria-label={r.name} />)}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Team() {
  const { current } = useBrand()
  const nav = useNavigate()
  const [roles, setRoles] = useState<Role[] | null>(null)
  const [jobs, setJobs] = useState<RoleJob[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [showOpen, setShowOpen] = useState(false)

  useEffect(() => {
    setRoles(null); setJobs([])
    let live = true
    const pull = () => Promise.all([listRoles(), listWorkspaceJobs()]).then(([rs, js]) => { if (live) { setRoles(rs); setJobs(js) } }).catch(() => {})
    void pull()
    const t = setInterval(() => { listWorkspaceJobs().then((js) => live && setJobs(js)).catch(() => {}) }, 10000)
    return () => { live = false; clearInterval(t) }
  }, [current?.id])

  const hired = useMemo(() => DEPARTMENTS.filter((d) => (roles ?? []).some((r) => r.dept === d.key && r.seat === 'lead')), [roles])
  const open = useMemo(() => DEPARTMENTS.filter((d) => !(roles ?? []).some((r) => r.dept === d.key && r.seat === 'lead')), [roles])
  const approvals = jobs.filter((j) => j.status === 'done' && j.approval === 'pending')

  async function hire(d: OrgDept) {
    setBusy(d.key); setNote(null)
    try { const lead = await hireDepartment(d.key, current?.name); nav(`/team/${lead.dept}`) }
    catch (e) { setNote(e instanceof Error ? e.message : String(e)); setBusy(null) }
  }
  async function decide(j: RoleJob, approval: 'approved' | 'declined') {
    await decideJob(j.id, approval)
    setJobs((l) => l.map((x) => (x.id === j.id ? { ...x, approval, reviewed_at: new Date().toISOString() } : x)))
  }

  return (
    <div className="ck-page">
      <div className="ck-page-inner" style={{ maxWidth: 1060 }}>
        <div className="ck-eyebrow">{current?.name ?? 'Studio'}</div>
        <h1 className="ck-h1" style={{ marginBottom: 20 }}>Team</h1>

        {note && <div className="ck-note" role="status">{note}</div>}

        {roles === null ? (
          <div className="ck-skeleton" style={{ height: '52vh', borderRadius: 24 }} />
        ) : (
          <>
            <Office roles={roles} jobs={jobs} hired={hired} onEnter={(k) => nav(k === 'meeting' ? '/team/meeting' : `/team/${k}`)} />

            {approvals.length > 0 && (
              <>
                <div className="ck-sectiongap" style={{ height: 40 }} />
                <div className="ck-board-title"><b>Needs your approval</b> {approvals.length}</div>
                <div className="ck-jobs" style={{ margin: 0 }}>
                  {approvals.slice(0, 5).map((j) => {
                    const d = deptOf(j.dept); const by = roles.find((r) => r.id === j.role_id)
                    return (
                      <div key={j.id} className="ck-job" data-state="approval" style={{ ['--ck-dept' as never]: d?.accent }}>
                        <span className="ck-dept-mark" data-size="s">{d?.mark ?? '··'}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className="ck-job-task">{j.task}</span>
                          <span className="ck-job-meta">{by?.name ?? 'A lead'} · finished {agoLabel(j.finished_at ?? j.created_at)}</span>
                        </span>
                        <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button className="ck-pill" onClick={() => nav(`/team/${j.dept}?job=${j.id}`)}>Read</button>
                          <button className="ck-pill" data-on="1" onClick={() => void decide(j, 'approved')}>Approve</button>
                          <button className="ck-pill" onClick={() => void decide(j, 'declined')}>Decline</button>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            <div className="ck-sectiongap" style={{ height: 40 }} />
            <Priorities />

            {roles.some((r) => r.seat === 'lead') && (
              <>
                <div className="ck-sectiongap" style={{ height: 40 }} />
                <Briefing compact />
              </>
            )}

            {open.length > 0 && (
              <>
                <div className="ck-sectiongap" style={{ height: 40 }} />
                <button className="ck-pill" onClick={() => setShowOpen((v) => !v)}>{showOpen ? 'Hide open rooms' : `Open rooms (${open.length})`}</button>
                {showOpen && (
                  <div className="ck-rooms" style={{ marginTop: 16 }}>
                    {open.map((d) => {
                      const seats = seatsIn(d.key, current?.name)
                      return (
                        <RoomCard key={d.key} d={d} sub={busy === d.key ? 'Hiring…' : `Hire ${seats.length} seat${seats.length === 1 ? '' : 's'}`}
                          onClick={() => { if (!busy) void hire(d) }} />
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

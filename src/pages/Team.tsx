import { useEffect, useMemo, useState } from 'react'
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
          <div className="ck-rooms">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="ck-skeleton" style={{ aspectRatio: '1/1', borderRadius: 20 }} />)}</div>
        ) : (
          <>
            <div className="ck-rooms">
              {hired.map((d) => {
                const lead = roles.find((r) => r.dept === d.key && r.seat === 'lead')
                const team = roles.filter((r) => r.dept === d.key && r.seat === 'member').length
                const w = jobs.filter((j) => j.dept === d.key && (j.status === 'queued' || j.status === 'running')).length
                const a = approvals.filter((j) => j.dept === d.key).length
                const u = jobs.filter((j) => j.dept === d.key && j.status === 'done' && !j.reviewed_at && j.approval !== 'pending').length
                return (
                  <RoomCard key={d.key} d={d} sub={`${lead?.name ?? ''}${team ? ` +${team}` : ''}`}
                    onClick={() => nav(`/team/${d.key}`)}
                    badges={<>
                      {w > 0 && <span className="ck-pill" data-live="1" style={{ ['--ck-dept' as never]: d.accent, pointerEvents: 'none' }}>{w} working</span>}
                      {a > 0 && <span className="ck-pill" data-on="1" style={{ pointerEvents: 'none' }}>{a} to approve</span>}
                      {u > 0 && <span className="ck-pill" style={{ pointerEvents: 'none' }}>{u} to read</span>}
                    </>} />
                )
              })}
              <RoomCard d={{ key: 'meeting', name: 'Meeting room', accent: '#B5632F' }} sub="Call anyone in. Minutes by your chief." onClick={() => nav('/team/meeting')} />
            </div>

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

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBrand } from '../lib/brandContext'
import { listRoles, hireDepartment, listWorkspaceJobs, decideJob, deptSpend, type Role, type RoleJob } from '../lib/roles'
import { DEPARTMENTS, seatsIn, pounds, type OrgDept } from '../lib/org'
import { agoLabel } from '../components/chrome/AssetCard'

/* ============================================================
   The team area. Departments as cards, each in its own colour,
   with what it is working on, what is done, and what is waiting
   for you. You talk to the leads; they run their people.
   ============================================================ */

export default function Team() {
  const { current } = useBrand()
  const nav = useNavigate()
  const [roles, setRoles] = useState<Role[] | null>(null)
  const [jobs, setJobs] = useState<RoleJob[]>([])
  const [spend, setSpend] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    setRoles(null); setJobs([]); setSpend({})
    let live = true
    const pull = async () => {
      const [rs, js] = await Promise.all([listRoles(), listWorkspaceJobs()])
      if (!live) return
      setRoles(rs); setJobs(js)
      const byDept: Record<string, number> = {}
      for (const d of DEPARTMENTS) {
        const ids = rs.filter((r) => r.dept === d.key).map((r) => r.id)
        if (ids.length) byDept[d.key] = await deptSpend(ids)
      }
      if (live) setSpend(byDept)
    }
    void pull()
    const t = setInterval(() => { listWorkspaceJobs().then((js) => live && setJobs(js)).catch(() => {}) }, 8000)
    return () => { live = false; clearInterval(t) }
  }, [current?.id])

  // A department is hired once it has a lead: seats that arrived without one
  // (earlier hires) are picked up by hiring the department, not duplicated.
  const hired = useMemo(() => DEPARTMENTS.filter((d) => (roles ?? []).some((r) => r.dept === d.key && r.seat === 'lead')), [roles])
  const open = useMemo(() => DEPARTMENTS.filter((d) => !(roles ?? []).some((r) => r.dept === d.key && r.seat === 'lead')), [roles])
  const leadOf = (d: OrgDept) => (roles ?? []).find((r) => r.dept === d.key && r.seat === 'lead')
  const teamOf = (d: OrgDept) => (roles ?? []).filter((r) => r.dept === d.key && r.seat === 'member')
  const jobsOf = (d: OrgDept) => jobs.filter((j) => j.dept === d.key)
  const working = (d: OrgDept) => jobsOf(d).filter((j) => j.status === 'queued' || j.status === 'running')
  const toRead = (d: OrgDept) => jobsOf(d).filter((j) => j.status === 'done' && !j.reviewed_at && j.approval !== 'pending')
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
      <div className="ck-page-inner" style={{ maxWidth: 1040 }}>
        <div className="ck-eyebrow">{current?.name ?? 'Studio'}</div>
        <h1 className="ck-h1" style={{ marginBottom: 4 }}>Team</h1>
        <div style={{ fontSize: 13, color: 'var(--ck-muted)', maxWidth: '60ch', lineHeight: 1.55 }}>
          You talk to the leads. They brief their people, compile the work and sign it. Anything that would leave the building waits here for you.
        </div>
        {note && <div className="ck-note" role="status" style={{ marginTop: 12 }}>{note}</div>}

        {roles === null ? (
          <div className="ck-cards" style={{ marginTop: 22 }}>{Array.from({ length: 3 }).map((_, i) => <div key={i} className="ck-skeleton" />)}</div>
        ) : (
          <>
            {approvals.length > 0 && (
              <>
                <h2 className="ck-h2" style={{ marginTop: 26 }}>Needs your approval</h2>
                <div className="ck-jobs" style={{ marginTop: 6 }}>
                  {approvals.map((j) => {
                    const d = DEPARTMENTS.find((x) => x.key === j.dept)
                    const by = roles.find((r) => r.id === j.role_id)
                    return (
                      <div key={j.id} className="ck-job" data-state="approval" style={{ ['--ck-dept' as never]: d?.accent }}>
                        <span className="ck-dept-mark" data-size="s">{d?.mark ?? '··'}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className="ck-job-task">{j.task}</span>
                          <span className="ck-job-meta">{by?.name ?? 'A lead'}{j.plan?.approach === 'team' ? ` with ${j.plan.assignments.map((a) => a.to).join(', ')}` : ''} · finished {agoLabel(j.finished_at ?? j.created_at)} · would go public or cost money</span>
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

            {hired.length > 0 && (
              <>
                <h2 className="ck-h2" style={{ marginTop: 26 }}>Your departments</h2>
                <div className="ck-depts">
                  {hired.map((d) => {
                    const lead = leadOf(d); const team = teamOf(d)
                    const w = working(d).length; const r = toRead(d).length; const a = approvals.filter((j) => j.dept === d.key).length
                    const last = jobsOf(d).find((j) => j.status === 'done')
                    return (
                      <button key={d.key} className="ck-dept" style={{ ['--ck-dept' as never]: d.accent }} onClick={() => nav(`/team/${d.key}`)}>
                        <span className="ck-dept-head">
                          <span className="ck-dept-mark">{d.mark}</span>
                          <span style={{ minWidth: 0 }}>
                            <span className="ck-tile-label" style={{ fontSize: 15 }}>{d.name}</span>
                            <span className="ck-tile-sub" style={{ whiteSpace: 'normal' }}>{lead?.name ?? 'No lead'}{team.length ? ` and ${team.length} more` : ''}</span>
                          </span>
                        </span>
                        <span className="ck-dept-status">
                          {w > 0 && <span className="ck-pill" data-live="1">Working on {w}</span>}
                          {a > 0 && <span className="ck-pill" data-on="1">{a} for approval</span>}
                          {r > 0 && <span className="ck-pill">{r} to read</span>}
                          {w === 0 && a === 0 && r === 0 && <span className="ck-tile-sub" style={{ marginTop: 0 }}>{last ? `Last finished ${agoLabel(last.finished_at ?? last.created_at)}` : 'Nothing yet. Open to brief the lead.'}</span>}
                        </span>
                        <span className="ck-tile-sub" style={{ marginTop: 'auto' }}>{pounds(spend[d.key] ?? 0)} this month</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {open.length > 0 && (
              <>
                <h2 className="ck-h2" style={{ marginTop: 30 }}>{hired.length ? 'Not hired yet' : 'Build your org'}</h2>
                <div className="ck-depts">
                  {open.map((d) => {
                    const seats = seatsIn(d.key, current?.name)
                    const lead = seats.find((s) => s.seat === 'lead')
                    return (
                      <div key={d.key} className="ck-dept" data-open="1" style={{ ['--ck-dept' as never]: d.accent }}>
                        <span className="ck-dept-head">
                          <span className="ck-dept-mark">{d.mark}</span>
                          <span style={{ minWidth: 0 }}>
                            <span className="ck-tile-label" style={{ fontSize: 15 }}>{d.name}</span>
                            <span className="ck-tile-sub" style={{ whiteSpace: 'normal' }}>{d.tagline}</span>
                          </span>
                        </span>
                        <span className="ck-tile-sub" style={{ whiteSpace: 'normal', lineHeight: 1.5 }}>
                          {lead ? `${lead.name}${seats.length > 1 ? `, with ${seats.filter((s) => s.seat !== 'lead').map((s) => s.name.toLowerCase()).join(', ')}` : ', a single seat'}.` : 'No lead defined for this brand yet.'}
                        </span>
                        <span style={{ marginTop: 'auto' }}>
                          <button className="ck-go" style={{ marginLeft: 0 }} disabled={busy === d.key || !lead} onClick={() => void hire(d)}>
                            {busy === d.key ? 'Hiring…' : `Hire ${seats.length > 1 ? `${seats.length} seats` : 'the seat'}`}
                          </button>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

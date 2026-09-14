import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updatePriority, type Priority } from '../lib/priorities'
import { listRoles, listPriorityJobs, listDeptJobs, listRunsFor, assignJob, type Role, type RoleJob, type RoleRun } from '../lib/roles'
import { DEPARTMENTS, deptOf } from '../lib/org'
import { agoLabel } from './chrome/AssetCard'
import DeliverableView from './DeliverableView'

/* ============================================================
   One priority, opened. Everything you need to decide on it:
   what done looks like, who owns it, the work already done
   against it, and a way to brief the owning lead from here.
   ============================================================ */

export default function PriorityDetail({ p, onChange, onClose }: { p: Priority; onChange: (patch: Partial<Priority>) => void; onClose: () => void }) {
  const nav = useNavigate()
  const [roster, setRoster] = useState<Role[]>([])
  const [jobs, setJobs] = useState<RoleJob[]>([])
  const [deptJobs, setDeptJobs] = useState<RoleJob[]>([])
  const [runs, setRuns] = useState<RoleRun[]>([])
  const [reading, setReading] = useState<RoleRun | null>(null)
  const [brief, setBrief] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const dept = deptOf(p.dept)
  const lead = roster.find((r) => r.dept === p.dept && r.seat === 'lead')

  async function load() {
    const [rs, js] = await Promise.all([listRoles(), listPriorityJobs(p.id)])
    setRoster(rs); setJobs(js)
    const dj = p.dept ? await listDeptJobs(p.dept) : []
    setDeptJobs(dj.filter((j) => j.priority_id !== p.id && j.status === 'done').slice(0, 5))
    const runIds = [...js, ...dj].map((j) => j.run_id).filter(Boolean) as string[]
    const ids = rs.filter((r) => r.dept === p.dept).map((r) => r.id)
    const all = ids.length ? await listRunsFor(ids) : []
    setRuns(all.filter((r) => runIds.includes(r.id)))
  }
  useEffect(() => { void load() /* eslint-disable-next-line */ }, [p.id])

  const active = jobs.filter((j) => j.status === 'queued' || j.status === 'running')
  useEffect(() => {
    if (!active.length) return
    const t = setInterval(() => { void load() }, 5000)
    return () => clearInterval(t)
    /* eslint-disable-next-line */
  }, [active.length])

  async function send() {
    if (!lead || !brief.trim()) return
    setBusy(true); setNote(null)
    const task = `PRIORITY ${p.title}${p.detail ? ` (done looks like: ${p.detail})` : ''}.\n\nThe founder asks: ${brief.trim()}`
    const r = await assignJob(lead, task, { priority_id: p.id })
    setBusy(false)
    if (r.error) { setNote(r.error); return }
    setBrief('')
    if (r.job) setJobs((l) => [r.job!, ...l])
  }

  const runOf = (j: RoleJob) => runs.find((r) => r.id === j.run_id)
  const JobRow = ({ j }: { j: RoleJob }) => {
    const r = runOf(j); const d = deptOf(j.dept)
    const st = j.status === 'done' ? (j.approval === 'pending' ? 'approval' : 'done') : j.status === 'failed' ? 'failed' : 'working'
    return (
      <div className="ck-job" data-state={st} style={{ ['--ck-dept' as never]: d?.accent }}>
        <span className="ck-job-dot" aria-hidden="true" />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="ck-job-task">{r?.output.title ?? j.task.replace(/^PRIORITY [^.]*\.\s*/, '').replace(/^The founder asks:\s*/, '')}</span>
          <span className="ck-job-meta">{roster.find((x) => x.id === j.role_id)?.name ?? d?.name ?? 'Lead'} · {st === 'working' ? 'working' : st === 'failed' ? `did not finish${j.error ? `: ${j.error}` : ''}` : st === 'approval' ? 'needs your approval' : 'done'} · {agoLabel(j.finished_at ?? j.created_at)}</span>
        </span>
        {r && <button className="ck-pill" onClick={() => setReading(reading?.id === r.id ? null : r)}>{reading?.id === r.id ? 'Close' : 'Read'}</button>}
        {!r && j.status === 'done' && <button className="ck-pill" onClick={() => nav(`/team/${j.dept}?job=${j.id}`)}>Open</button>}
      </div>
    )
  }

  return (
    <div className="ck-prio-detail" style={{ ['--ck-dept' as never]: dept?.accent }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ck-eyebrow">Priority{dept ? ` · ${dept.name}` : ' · yours'}{p.due ? ` · due ${p.due}` : ''}</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', margin: '4px 0 8px' }}>{p.title}</h2>
        </div>
        <button className="ck-pill" onClick={onClose}>Close</button>
      </div>

      <div className="ck-prio-grid">
        <div>
          <div className="ck-board-title">What done looks like</div>
          <textarea className="ck-search" style={{ width: '100%', minHeight: 72, resize: 'vertical', fontSize: 13 }} defaultValue={p.detail}
            placeholder="Write what done looks like, so the org and you can tell when it is."
            onBlur={(e) => { if (e.target.value !== p.detail) { void updatePriority(p.id, { detail: e.target.value }); onChange({ detail: e.target.value }) } }} />
          {p.note && <div className="ck-note" style={{ marginTop: 8 }}>{p.status === 'parked' ? 'Parked: ' : ''}{p.note}</div>}

          <div className="ck-board-title" style={{ marginTop: 18 }}><b>Work against it</b> {jobs.length || ''}</div>
          {jobs.length === 0 && <div className="ck-note">Nothing yet. Brief {lead?.name ?? 'a department'} below and it appears here.</div>}
          <div className="ck-jobs" style={{ margin: 0 }}>{jobs.map((j) => <JobRow key={j.id} j={j} />)}</div>
          {reading && <div style={{ marginTop: 12 }}><DeliverableView run={reading} roster={roster} /></div>}

          {deptJobs.length > 0 && (
            <>
              <div className="ck-board-title" style={{ marginTop: 18 }}>Recent from {dept?.name}</div>
              <div className="ck-jobs" style={{ margin: 0 }}>{deptJobs.map((j) => <JobRow key={j.id} j={j} />)}</div>
            </>
          )}
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="ck-board-title">Owned by</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="ck-pill" data-on={!p.dept ? '1' : '0'} onClick={() => { void updatePriority(p.id, { dept: null }); onChange({ dept: null }) }}>Me</button>
              {DEPARTMENTS.map((d) => <button key={d.key} className="ck-pill" data-on={p.dept === d.key ? '1' : '0'} onClick={() => { void updatePriority(p.id, { dept: d.key }); onChange({ dept: d.key }) }}>{d.name}</button>)}
            </div>
            {lead && <button className="ck-pill" style={{ marginTop: 8 }} onClick={() => nav(`/team/${p.dept}`)}>Open {dept?.name} room</button>}
            {p.dept && !lead && <div className="ck-note" style={{ marginTop: 8 }}>{dept?.name} is not hired in this workspace yet.</div>}
          </div>

          {lead && (
            <div>
              <div className="ck-board-title">Brief {lead.name}</div>
              <div className="ck-composer" style={{ marginTop: 0 }}>
                <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={3}
                  placeholder={`What do you need on this? e.g. "What is blocking it and what do you need from me?"`}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send() } }} />
                <div className="ck-composer-row">
                  <button className="ck-pill" disabled={busy} onClick={() => { setBrief('Where does this stand, what is blocking it, and what do you need from me to finish it? Be specific and short.'); }}>Status and blockers</button>
                  <button className="ck-go" disabled={busy || !brief.trim()} onClick={() => void send()}>{busy ? 'Sending…' : 'Brief'}</button>
                </div>
              </div>
              {note && <div className="ck-note">{note}</div>}
            </div>
          )}

          <div>
            <div className="ck-board-title">Due</div>
            <input className="ck-search" type="date" defaultValue={p.due ?? ''} style={{ fontSize: 12.5 }}
              onChange={(e) => { const v = e.target.value || null; void updatePriority(p.id, { due: v }); onChange({ due: v }) }} />
          </div>
        </aside>
      </div>
    </div>
  )
}

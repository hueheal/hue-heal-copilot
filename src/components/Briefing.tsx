import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendBriefing, latestBriefing, briefingJobs, listRoles, deptNameOf, type Role, type RoleJob, type Briefing as BriefingRow } from '../lib/roles'
import { deptOf } from '../lib/org'
import { agoLabel } from './chrome/AssetCard'

/* ============================================================
   The daily briefing: one message to the whole leadership team.
   Each lead answers in its own card; open one to read the work.
   Lives on Home and on Team, and works the same from the phone.
   ============================================================ */

export default function Briefing({ compact = false }: { compact?: boolean }) {
  const nav = useNavigate()
  const [leads, setLeads] = useState<Role[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [current, setCurrent] = useState<BriefingRow | null>(null)
  const [jobs, setJobs] = useState<RoleJob[]>([])
  const [open, setOpen] = useState(!compact)

  useEffect(() => {
    let live = true
    ;(async () => {
      const [roles, b] = await Promise.all([listRoles(), latestBriefing()])
      if (!live) return
      setLeads(roles.filter((r) => r.seat === 'lead' && r.enabled))
      setCurrent(b)
      if (b) setJobs(await briefingJobs(b.id))
    })()
    return () => { live = false }
  }, [])

  const working = jobs.filter((j) => j.status === 'queued' || j.status === 'running')
  useEffect(() => {
    if (!current || working.length === 0) return
    const t = setInterval(() => { briefingJobs(current.id).then(setJobs).catch(() => {}) }, 5000)
    return () => clearInterval(t)
  }, [current?.id, working.length])

  async function send() {
    if (!text.trim() || busy) return
    if (!leads.length) { setNote('Hire a department first: there is no one to brief.'); return }
    setBusy(true); setNote(null)
    const r = await sendBriefing(text, leads)
    setBusy(false)
    if (r.error) { setNote(r.error); return }
    setText(''); setCurrent(r.briefing ?? null); setJobs(r.jobs); setOpen(true)
  }

  const today = current && Date.now() - new Date(current.created_at).getTime() < 36 * 3600000
  const chief = leads.find((r) => r.key === 'chief')
  const routeJob = chief ? jobs.find((j) => j.role_id === chief.id && j.task.startsWith('ROUTE:')) : undefined
  const deskJob = chief ? jobs.find((j) => j.role_id === chief.id && j.task.startsWith('DESK:')) : undefined
  const replies = jobs.filter((j) => j.id !== routeJob?.id && j.id !== deskJob?.id)
  const [showReplies, setShowReplies] = useState(false)
  const stateOf = (j: RoleJob) => (j.status === 'done' ? (j.approval === 'pending' ? 'approval' : 'done') : j.status === 'failed' ? 'failed' : 'working')

  return (
    <div className="ck-brief">
      <div className="ck-board-title" style={{ marginBottom: 8 }}>
        <b>Daily briefing</b>
        <span>{leads.length ? (leads.some((r) => r.key === 'chief') ? 'via your chief of staff' : `to ${leads.length} lead${leads.length === 1 ? '' : 's'}`) : 'no leads hired yet'}</span>
        {compact && current && <button className="ck-pill" style={{ marginLeft: 'auto' }} onClick={() => setOpen((v) => !v)}>{open ? 'Hide' : 'Show latest'}</button>}
      </div>
      <div className="ck-composer" style={{ marginTop: 0 }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={compact ? 2 : 3}
          placeholder={leads.length ? (leads.some((r) => r.key === 'chief') ? 'Tell your chief of staff what matters today. It goes to the right leads and comes back as one desk.' : 'What matters today. Every lead reads it, takes what is theirs, hands over the rest.') : 'Hire a department on the Team page, then brief the leads here each morning.'}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send() } }} />
        <div className="ck-composer-row">
          <span style={{ fontSize: 11.5, color: 'var(--ck-faint)' }}>Also from your phone: just type in Telegram.</span>
          <button className="ck-go" disabled={busy || !text.trim() || !leads.length} onClick={() => void send()}>{busy ? 'Sending…' : leads.some((r) => r.key === 'chief') ? 'Send' : 'Brief the leads'}</button>
        </div>
      </div>
      {note && <div className="ck-note" role="status">{note}</div>}

      {current && open && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12.5, color: 'var(--ck-muted)', lineHeight: 1.55, whiteSpace: 'pre-wrap', borderLeft: '2px solid var(--ck-line-strong)', padding: '2px 0 2px 12px' }}>
            <span style={{ color: 'var(--ck-faint)', fontSize: 11.5, display: 'block', marginBottom: 2 }}>{today ? 'Today' : 'Last briefing'} · {agoLabel(current.created_at)}{current.source === 'telegram' ? ' · from your phone' : ''}</span>
            {current.text}
          </div>
          {chief ? (
            <div style={{ marginTop: 10 }}>
              {routeJob && (
                <div className="ck-job" data-state={stateOf(routeJob)} style={{ ['--ck-dept' as never]: deptOf('founder')?.accent }}>
                  <span className="ck-dept-mark" data-size="s">FO</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="ck-job-task">{chief.name}</span>
                    <span className="ck-job-meta">{routeJob.status === 'done' ? (routeJob.run_id ? 'Routed. ' : '') + (replies.length ? `${replies.filter((r) => r.status === 'done').length} of ${replies.length} replies in` : 'Noted') : routeJob.status === 'failed' ? `Could not route${routeJob.error ? `: ${routeJob.error}` : ''}` : 'Reading your message…'}</span>
                  </span>
                  {routeJob.status === 'done' && <button className="ck-pill" onClick={() => nav(`/team/founder?job=${routeJob.id}`)}>What went where</button>}
                </div>
              )}
              {deskJob && (
                <div className="ck-job" data-state={stateOf(deskJob)} style={{ ['--ck-dept' as never]: deptOf('founder')?.accent, marginTop: 8 }}>
                  <span className="ck-dept-mark" data-size="s">FO</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="ck-job-task">Your desk</span>
                    <span className="ck-job-meta">{deskJob.status === 'done' ? 'One thing to do now, then next, then parked' : deskJob.status === 'failed' ? 'Could not write the desk' : 'Being written from the replies…'}</span>
                  </span>
                  {deskJob.status === 'done' && <button className="ck-pill" data-on="1" onClick={() => nav(`/team/founder?job=${deskJob.id}`)}>Read</button>}
                </div>
              )}
              {replies.length > 0 && (
                <button className="ck-pill" style={{ marginTop: 8 }} onClick={() => setShowReplies((v) => !v)}>{showReplies ? 'Hide replies' : `Replies (${replies.length})`}</button>
              )}
            </div>
          ) : null}
          {(!chief || showReplies) && (
          <div className="ck-jobs" style={{ marginTop: 10 }}>
            {replies.map((j) => {
              const lead = leads.find((r) => r.id === j.role_id)
              const d = deptOf(j.dept)
              const st = stateOf(j)
              return (
                <div key={j.id} className="ck-job" data-state={st} style={{ ['--ck-dept' as never]: d?.accent }}>
                  <span className="ck-dept-mark" data-size="s">{d?.mark ?? '··'}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="ck-job-task">{lead?.name ?? (lead ? deptNameOf(lead) : d?.name ?? 'Lead')}</span>
                    <span className="ck-job-meta">
                      {st === 'working' ? 'Reading the briefing…' : st === 'failed' ? `Could not reply${j.error ? `: ${j.error}` : ''}` : st === 'approval' ? 'Replied · needs your approval' : 'Replied'}
                    </span>
                  </span>
                  {j.status === 'done' && <button className="ck-pill" onClick={() => nav(`/team/${j.dept}?job=${j.id}`)}>Read</button>}
                </div>
              )
            })}
          </div>
          )}
        </div>
      )}
    </div>
  )
}

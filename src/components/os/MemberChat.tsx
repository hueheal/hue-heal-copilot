import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listRuns, type Role, type RoleJob, type RoleRun } from '../../lib/roles'
import { deptOf } from '../../lib/org'

/* ============================================================
   One chat with one team member: the history between you (your
   briefs, their replies) on the left, their task list on the
   right. Opened from any card on the OS home; the home's
   composer then speaks to this member.
   ============================================================ */

export interface ChatMessage { id: string; me: boolean; text: string; title?: string; at: string; open?: string }

const stripPrefix = (task: string) => task.replace(/^(ROUTE|DESK|MEETING|IMAGES):\s*/, '').split('\n')[0]
const when = (iso: string) => {
  const d = new Date(iso); const diff = Date.now() - d.getTime(); const h = Math.floor(diff / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
const stateOf = (j: RoleJob) => (j.status === 'done' ? (j.approval === 'pending' ? 'approval' : 'done') : j.status === 'failed' ? 'failed' : 'working')

export default function MemberChat({ role, jobs, avatar, demoRuns, onClose }: {
  role: Role; jobs: RoleJob[]; avatar: string; demoRuns?: RoleRun[]; onClose: () => void
}) {
  const nav = useNavigate()
  const [runs, setRuns] = useState<RoleRun[]>(demoRuns ?? [])
  useEffect(() => {
    if (demoRuns) { setRuns(demoRuns); return }
    let live = true
    listRuns(role.id).then((r) => { if (live) setRuns(r) }).catch(() => {})
    const t = setInterval(() => { listRuns(role.id).then((r) => { if (live) setRuns(r) }).catch(() => {}) }, 8000)
    return () => { live = false; clearInterval(t) }
  }, [role.id, demoRuns])

  /* DESK: jobs are the system asking the chief to write the desk, not the founder's words. */
  const mine = useMemo(() => jobs.filter((j) => j.role_id === role.id && !j.task.startsWith('DESK:')), [jobs, role.id])
  const thread = useMemo<ChatMessage[]>(() => {
    const out: ChatMessage[] = []
    for (const j of mine) out.push({ id: `j${j.id}`, me: true, text: stripPrefix(j.task), at: j.created_at })
    for (const r of runs) out.push({ id: `r${r.id}`, me: false, title: r.output?.title, text: r.output?.summary ?? '', at: r.created_at, open: r.id })
    return out.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  }, [mine, runs])

  const dept = deptOf(role.dept)
  const roomPath = role.seat === 'member' ? `/roles/${role.id}` : `/team/${role.dept}`

  return (
    <div className="os-chat">
      <div className="os-chat-head">
        <img className="os-msg-avatar" src={avatar} alt="" />
        <div>
          <h2>{role.name}</h2>
          <p>{role.title}{dept ? ` · ${dept.name}` : ''}</p>
        </div>
        <div className="os-chips" style={{ marginTop: 0 }}>
          <button className="os-chip" onClick={() => nav(roomPath)}>Full room</button>
          <button className="os-chip" onClick={onClose} aria-label="Back to today">Back</button>
        </div>
      </div>
      <div className="os-chat-grid">
        <div className="os-thread">
          {thread.length === 0 && <div className="os-empty">Nothing between you yet. Say what you need below.</div>}
          {thread.map((m) => (
            <div key={m.id} className="os-bubble" data-me={m.me ? '1' : undefined}>
              {m.title && <b>{/[.!?]$/.test(m.title) ? m.title : `${m.title}.`} </b>}{m.text}
              <small>{m.me ? 'You' : role.name} · {when(m.at)}{m.open ? <> · <a href={`${roomPath}?run=${m.open}`} onClick={(e) => { e.preventDefault(); nav(`${roomPath}?run=${m.open}`) }} style={{ color: 'inherit' }}>open</a></> : null}</small>
            </div>
          ))}
        </div>
        <aside className="os-tasks">
          <h4>{role.name.split(' ')[0]}'s tasks</h4>
          {mine.length === 0 && <div style={{ fontSize: 14, color: 'var(--os-ink-60)' }}>No tasks yet.</div>}
          {[...mine].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8).map((j) => {
            const st = stateOf(j)
            return (
              <div key={j.id} className="os-task" data-state={st}>
                <i />
                <span>
                  {stripPrefix(j.task)}
                  <small>{st === 'working' ? 'Working on it' : st === 'approval' ? 'Waiting for your approval' : st === 'failed' ? 'Could not finish' : 'Done'} · {when(j.created_at)}</small>
                </span>
              </div>
            )
          })}
        </aside>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useBrand } from '../lib/brandContext'
import {
  listRoles, updateRole, retireDepartment, presetFor, listRunsFor, listDeptItems, setItemStatus,
  assignJob, listDeptJobs, markReviewed, decideJob, getDeptState, saveDeptState, deptSpend, learnNow, retryImageJob,
  type Role, type RoleRun, type RoleItem, type RoleSchedule, type RoleJob, type DeptState,
} from '../lib/roles'
import { deptOf, seatFor, toolOf, pounds } from '../lib/org'
import { officeImage } from '../lib/office'
import { agoLabel } from '../components/chrome/AssetCard'
import DeliverableView from '../components/DeliverableView'
import AssetReview from '../components/AssetReview'
import ConfirmButton from '../components/ConfirmButton'

/* ============================================================
   A department room on the office stage: chat with the lead on
   the left, the room itself in the centre, work on the right
   behind tabs. Progressive disclosure per the September brief.
   ============================================================ */

type Tab = 'tasks' | 'images' | 'room'

export default function DeptRoom() {
  const { dept: deptKey } = useParams()
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()
  const { current: brand } = useBrand()
  const dept = deptOf(deptKey)

  const [roster, setRoster] = useState<Role[] | null>(null)
  const [jobs, setJobs] = useState<RoleJob[]>([])
  const [runs, setRuns] = useState<RoleRun[]>([])
  const [items, setItems] = useState<RoleItem[]>([])
  const [state, setState] = useState<DeptState | null>(null)
  const [spend, setSpend] = useState(0)
  const [task, setTask] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [viewRun, setViewRun] = useState<RoleRun | null>(null)
  const [tab, setTab] = useState<Tab>('tasks')
  const [learning, setLearning] = useState(false)
  const [imgBroken, setImgBroken] = useState(false)

  const team = useMemo(() => (roster ?? []).filter((r) => r.dept === deptKey), [roster, deptKey])
  const lead = team.find((r) => r.seat === 'lead') ?? null
  const members = team.filter((r) => r.seat === 'member')
  const ids = useMemo(() => team.map((r) => r.id), [team])

  async function reload() {
    const all = await listRoles()
    setRoster(all)
    const mine = all.filter((r) => r.dept === deptKey).map((r) => r.id)
    if (!deptKey || !mine.length) return
    const [js, rs, its, st, sp] = await Promise.all([listDeptJobs(deptKey), listRunsFor(mine), listDeptItems(mine), getDeptState(deptKey), deptSpend(mine)])
    setJobs(js); setRuns(rs); setItems(its); setState(st); setSpend(sp)
    const wanted = params.get('job')
    if (wanted) {
      const j = js.find((x) => x.id === wanted)
      const r = rs.find((x) => x.id === j?.run_id)
      if (r) setViewRun(r)
    }
  }
  useEffect(() => { setRoster(null); setViewRun(null); setTab('tasks'); void reload() /* eslint-disable-next-line */ }, [deptKey, brand?.id])

  const active = jobs.filter((j) => j.status === 'queued' || j.status === 'running')
  useEffect(() => {
    if (!deptKey || active.length === 0) return
    const t = setInterval(async () => {
      const fresh = await listDeptJobs(deptKey)
      setJobs(fresh)
      const landed = fresh.filter((j) => active.some((a) => a.id === j.id) && j.status !== 'queued' && j.status !== 'running')
      if (landed.length) {
        const rs = await listRunsFor(ids)
        setRuns(rs)
        listDeptItems(ids).then(setItems).catch(() => {})
        const done = landed.find((j) => j.status === 'done' && j.run_id)
        const target = rs.find((r) => r.id === done?.run_id)
        if (target) setViewRun(target)
      }
    }, 4000)
    return () => clearInterval(t)
    /* eslint-disable-next-line */
  }, [deptKey, active.length, ids.join(',')])

  async function brief(text: string) {
    if (!lead || busy || !text.trim()) return
    setBusy(true); setNote(null)
    const { job, error } = await assignJob(lead, text.trim())
    setBusy(false)
    if (error) { setNote(error); return }
    setTask('')
    if (job) setJobs((l) => [job, ...l])
  }
  async function decide(j: RoleJob, approval: 'approved' | 'declined') {
    await decideJob(j.id, approval)
    setJobs((l) => l.map((x) => (x.id === j.id ? { ...x, approval, reviewed_at: new Date().toISOString() } : x)))
  }
  async function reviewed(j: RoleJob) {
    await markReviewed(j.id)
    setJobs((l) => l.map((x) => (x.id === j.id ? { ...x, reviewed_at: new Date().toISOString() } : x)))
  }
  async function saveSchedule(patch: Partial<RoleSchedule>) {
    if (!lead) return
    const schedule = { ...(lead.schedule ?? {}), ...patch }
    await updateRole(lead.id, { schedule })
    setRoster((all) => (all ?? []).map((r) => (r.id === lead.id ? { ...r, schedule } : r)))
  }
  async function patchState(patch: Partial<Pick<DeptState, 'playbook' | 'budget_pence' | 'tools'>>) {
    if (!deptKey) return
    try { await saveDeptState(deptKey, patch); setState((s) => ({ ...(s ?? { dept: deptKey, playbook: '', playbook_updated_at: null, budget_pence: 5000, tools: [] }), ...patch })) }
    catch (e) { setNote(e instanceof Error ? e.message : String(e)) }
  }
  async function learn() {
    if (!lead) return
    setLearning(true); setNote(null)
    const r = await learnNow(lead)
    setLearning(false)
    setNote(r.error ?? r.note ?? `${lead.name} rewrote the playbook: ${(r.lessons ?? []).length} lessons.`)
    if (!r.error && !r.note) void reload()
  }

  if (!dept) return <div className="ck-page"><div className="ck-page-inner"><div className="ck-empty"><div style={{ fontSize: 15, fontWeight: 500 }}>No such room</div><p><button className="ck-pill" onClick={() => nav('/team')}>← Team</button></p></div></div></div>
  if (roster === null) return <div className="ck-page"><div className="ck-page-inner"><div className="ck-skeleton" style={{ height: 200, borderRadius: 20 }} /></div></div>
  if (!lead) return (
    <div className="ck-page"><div className="ck-page-inner">
      <div className="ck-empty"><div style={{ fontSize: 15, fontWeight: 500 }}>{dept.name} is not hired in {brand?.name ?? 'this workspace'}</div><p><button className="ck-pill" onClick={() => nav('/team')}>← Team</button></p></div>
    </div></div>
  )

  const preset = presetFor(lead, brand?.name)
  const nameOf = (id?: string | null) => team.find((r) => r.id === id)?.name ?? 'A seat'
  const runOf = (j: RoleJob) => runs.find((r) => r.id === j.run_id)
  const titleOf = (j: RoleJob) => runOf(j)?.output.title ?? j.task.replace(/^(ROUTE|DESK|IMAGES|MEETING|PRIORITY):?\s*/, '')
  const whoOf = (j: RoleJob) => `${nameOf(j.role_id)}${j.plan?.approach === 'team' ? ` with ${(j.plan.assignments ?? []).map((a) => a.to).join(', ')}` : ''}`
  const cadence = lead.schedule?.cadence ?? 'off'

  const approvals = jobs.filter((j) => j.status === 'done' && j.approval === 'pending')
  const failed = jobs.filter((j) => j.status === 'failed' && !j.reviewed_at)
  const done = jobs.filter((j) => j.status === 'done' && j.approval !== 'pending')
  const unread = done.filter((j) => !j.reviewed_at)
  const openItems = items.filter((i) => i.status === 'open')
  const budget = state?.budget_pence ?? 5000
  const wanted = dept.tools.filter((k) => k !== 'anthropic')

  /* The chat: the conversation with the lead, oldest first. */
  const thread = jobs.filter((j) => !j.task.startsWith('IMAGES:')).slice(0, 14).reverse()

  const JobCard = ({ j, st, actions }: { j: RoleJob; st: string; actions: React.ReactNode }) => (
    <div className="ck-job" data-state={st}>
      <span className="ck-job-dot" aria-hidden="true" />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="ck-job-task">{titleOf(j)}</span>
        <span className="ck-job-meta">{whoOf(j)} · {agoLabel(j.finished_at ?? j.created_at)}{j.cost_pence > 0 ? ` · ${pounds(Number(j.cost_pence))}` : ''}</span>
      </span>
      <span style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{actions}</span>
    </div>
  )

  return (
    <div className="ck-room-stage" style={{ ['--ck-dept' as never]: dept.accent }}>
      {/* Chat with the lead */}
      <section className="ck-glasspanel" aria-label={`Chat with ${lead.name}`}>
        <div className="ck-panel-head"><span className="ck-avatar">{lead.name.slice(0, 1)}</span> {lead.name}</div>
        <div className="ck-panel-scroll">
          <div className="ck-chat">
            {thread.length === 0 && <div className="ck-note">Say what you need. {lead.name} reads the priorities, the playbook and the org before answering.</div>}
            {thread.map((j) => {
              const r = runOf(j)
              return (
                <div key={j.id} style={{ display: 'contents' }}>
                  <div className="ck-msg" data-me="1">
                    {j.task.replace(/^(MEETING|PRIORITY):?\s*/, '').split('\n')[0].slice(0, 220)}
                    <span className="ck-msg-meta">{agoLabel(j.created_at)}{j.source === 'telegram' ? ' · phone' : ''}</span>
                  </div>
                  <div className="ck-msg" data-me="0" data-click={r ? '1' : '0'} onClick={() => r && setViewRun(r)} role={r ? 'button' : undefined}>
                    {j.status === 'failed' ? `Could not finish${j.error ? `: ${j.error.slice(0, 120)}` : ''}.`
                      : j.status !== 'done' ? 'Working on it…'
                      : r ? <>
                          <b style={{ fontWeight: 600 }}>{r.output.title}</b>
                          <span style={{ display: 'block', marginTop: 2 }}>{(r.output.summary ?? '').slice(0, 180)}</span>
                          <span className="ck-msg-meta">Open the deliverable →</span>
                        </>
                      : 'Done.'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="ck-chat-compose">
          {(preset?.playbook ?? []).length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(preset?.playbook ?? []).slice(0, 3).map((p) => (
                <button key={p.label} className="ck-pill" disabled={busy} onClick={() => void brief(p.task)}>{p.label}</button>
              ))}
            </div>
          )}
          <textarea value={task} onChange={(e) => setTask(e.target.value)} placeholder={`Brief ${lead.name}…`}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void brief(task) } }} />
          <button className="ck-go" style={{ marginLeft: 'auto' }} disabled={busy || !task.trim()} onClick={() => void brief(task)}>{busy ? 'Sending…' : 'Send'}</button>
        </div>
      </section>

      {/* The room */}
      <section className="ck-room-centre">
        {viewRun ? (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '2px 0 12px' }}>
              <button className="ck-pill" onClick={() => { setViewRun(null); if (params.get('job')) setParams({}) }}>← {dept.name}</button>
              {(() => {
                const j = jobs.find((x) => x.run_id === viewRun.id)
                if (!j) return null
                return <>
                  {j.approval === 'pending' && <>
                    <button className="ck-pill" data-on="1" onClick={() => void decide(j, 'approved')}>Approve</button>
                    <button className="ck-pill" onClick={() => void decide(j, 'declined')}>Decline</button>
                  </>}
                  {j.status === 'done' && j.approval !== 'pending' && !j.reviewed_at && <button className="ck-pill" onClick={() => void reviewed(j)}>Mark as read</button>}
                </>
              })()}
            </div>
            <DeliverableView run={viewRun} roster={roster ?? []} />
          </>
        ) : (
          <>
            <div className="ck-scene">
              {imgBroken ? (
                <div style={{ aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(145deg, color-mix(in srgb, ${dept.accent} 18%, var(--ck-surface-2)), var(--ck-surface-2))` }}>
                  <span className="ck-dept-mark" data-size="l">{dept.mark}</span>
                </div>
              ) : (
                <img src={officeImage(dept.key)} alt="" onError={() => setImgBroken(true)} />
              )}
              <div className="ck-scene-veil">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{dept.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>{dept.tagline}</div>
                </div>
                {active.length > 0 && <span className="ck-pill" data-live="1" style={{ color: '#FBFAF6', pointerEvents: 'none' }}>{active.length} working</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              {[lead, ...members].map((r) => {
                const seat = seatFor(r, brand?.name)
                return (
                  <button key={r.id} className="ck-people-chip" onClick={() => nav(`/roles/${r.id}`)} title={seat?.learnsFrom ? `Learns from ${seat.learnsFrom}` : undefined}>
                    <span className="ck-avatar">{r.name.slice(0, 1)}</span>
                    {r.name}
                    {r.seat === 'lead' && <span style={{ color: 'var(--ck-faint)', fontWeight: 400 }}>lead</span>}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 14, fontSize: 12, color: 'var(--ck-faint)' }}>
              <span>{pounds(spend)} of {pounds(budget)} this month</span>
              <span>·</span>
              <span>{cadence === 'off' ? 'Works when briefed' : `Reports each morning (${cadence})`}</span>
            </div>
            {note && <div className="ck-note" role="status" style={{ marginTop: 12 }}>{note}</div>}
          </>
        )}
      </section>

      {/* Work */}
      <section className="ck-glasspanel" aria-label="Work">
        <div className="ck-panel-head" style={{ paddingBottom: 6 }}>Work</div>
        <div className="ck-tabs">
          <button className="ck-tab" data-on={tab === 'tasks' ? '1' : '0'} onClick={() => setTab('tasks')}>Tasks{approvals.length + unread.length > 0 ? ` · ${approvals.length + unread.length}` : ''}</button>
          <button className="ck-tab" data-on={tab === 'images' ? '1' : '0'} onClick={() => setTab('images')}>Images</button>
          <button className="ck-tab" data-on={tab === 'room' ? '1' : '0'} onClick={() => setTab('room')}>Room</button>
        </div>
        <div className="ck-panel-scroll">
          {tab === 'tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
              {approvals.length > 0 && (
                <div>
                  <div className="ck-board-title"><b>Needs your approval</b> {approvals.length}</div>
                  <div className="ck-jobs" style={{ margin: 0 }}>
                    {approvals.map((j) => <JobCard key={j.id} j={j} st="approval" actions={<>
                      {runOf(j) && <button className="ck-pill" onClick={() => setViewRun(runOf(j)!)}>Read</button>}
                      <button className="ck-pill" data-on="1" onClick={() => void decide(j, 'approved')}>Approve</button>
                      <button className="ck-pill" onClick={() => void decide(j, 'declined')}>Decline</button>
                    </>} />)}
                  </div>
                </div>
              )}
              {(active.length > 0 || failed.length > 0) && (
                <div>
                  <div className="ck-board-title"><b>Working on</b> {active.length}</div>
                  <div className="ck-jobs" style={{ margin: 0 }}>
                    {active.map((j) => <JobCard key={j.id} j={j} st="working" actions={null} />)}
                    {failed.map((j) => <JobCard key={j.id} j={j} st="failed" actions={<>
                      <button className="ck-pill" disabled={busy} onClick={() => { if (j.task.startsWith('IMAGES:')) { void retryImageJob(j).then((r) => { if (r.error) setNote(r.error); else if (r.job) { setJobs((l) => [r.job!, ...l]); void reviewed(j) } }) } else void brief(j.task) }}>Try again</button>
                      <button className="ck-pill" onClick={() => void reviewed(j)}>Dismiss</button>
                    </>} />)}
                  </div>
                </div>
              )}
              <div>
                <div className="ck-board-title"><b>Done</b> {unread.length ? `${unread.length} to read` : ''}</div>
                {done.length === 0 && active.length === 0 && <div className="ck-note">Nothing yet. Brief {lead.name} in the chat.</div>}
                <div className="ck-jobs" style={{ margin: 0 }}>
                  {unread.map((j) => <JobCard key={j.id} j={j} st="done" actions={<>
                    {runOf(j) && <button className="ck-pill" onClick={() => setViewRun(runOf(j)!)}>Read</button>}
                    <button className="ck-pill" onClick={() => void reviewed(j)}>Mark as read</button>
                  </>} />)}
                  {done.filter((j) => j.reviewed_at).slice(0, 6).map((j) => <JobCard key={j.id} j={j} st="read" actions={
                    runOf(j) ? <button className="ck-pill" onClick={() => setViewRun(runOf(j)!)}>Read</button> : null
                  } />)}
                </div>
              </div>
              {openItems.length > 0 && (
                <div>
                  <div className="ck-board-title"><b>Requests</b> {openItems.length}</div>
                  {openItems.map((i) => (
                    <div key={i.id} className="ck-ledger">
                      <div style={{ fontSize: 11.5, color: 'var(--ck-faint)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{nameOf(i.role_id)} · {i.kind}</div>
                      <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{i.title}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--ck-muted)', lineHeight: 1.5, margin: '4px 0 8px' }}>{i.detail}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="ck-pill" onClick={() => { void setItemStatus(i.id, 'approved'); setItems((l) => l.map((x) => (x.id === i.id ? { ...x, status: 'approved' } : x))) }}>Approve</button>
                        <button className="ck-pill" onClick={() => { void setItemStatus(i.id, 'declined'); setItems((l) => l.map((x) => (x.id === i.id ? { ...x, status: 'declined' } : x))) }}>Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === 'images' && <AssetReview dept={dept.key} showApproved />}
          {tab === 'room' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 8 }}>
              <div>
                <div className="ck-board-title">Cadence</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(['off', 'daily', 'weekdays', 'weekly'] as const).map((c) => (
                    <button key={c} className="ck-pill" data-on={cadence === c ? '1' : '0'} onClick={() => void saveSchedule({ cadence: c })}>
                      {c === 'off' ? 'On demand' : c[0].toUpperCase() + c.slice(1)}
                    </button>
                  ))}
                </div>
                {cadence !== 'off' && (
                  <input className="ck-search" style={{ width: '100%', fontSize: 12.5, marginTop: 8 }} defaultValue={lead.schedule?.task ?? ''}
                    placeholder="Standing brief for the morning run"
                    onBlur={(e) => void saveSchedule({ task: e.target.value })} />
                )}
              </div>
              <div>
                <div className="ck-board-title">Playbook {state?.playbook_updated_at ? `· ${agoLabel(state.playbook_updated_at)}` : ''}</div>
                <textarea className="ck-search" style={{ width: '100%', minHeight: 140, resize: 'vertical', fontSize: 12.5 }} defaultValue={state?.playbook ?? ''}
                  placeholder="Nothing learned yet. Rewritten every Friday from what actually happened."
                  onBlur={(e) => { if (e.target.value !== (state?.playbook ?? '')) void patchState({ playbook: e.target.value }) }} />
                <button className="ck-pill" style={{ marginTop: 6 }} disabled={learning} onClick={() => void learn()}>{learning ? 'Learning…' : 'Learn now'}</button>
              </div>
              <div>
                <div className="ck-board-title">Tools and budget</div>
                <div style={{ fontSize: 12.5, color: 'var(--ck-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{pounds(spend)} of</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>£<input className="ck-search" style={{ width: 64, fontSize: 12.5, padding: '3px 6px' }} type="number" min={0} step={5} defaultValue={budget / 100}
                    onBlur={(e) => { const v = Math.max(0, Math.round(Number(e.target.value) * 100)); if (v !== budget) void patchState({ budget_pence: v }) }} /></span>
                  <span>this month</span>
                </div>
                <div className="ck-toggle" style={{ marginTop: 6 }}><span>Claude</span><span className="ck-kbd" style={{ display: 'inline' }}>connected</span></div>
                {wanted.map((k) => {
                  const t = toolOf(k)
                  const on = (state?.tools ?? []).includes(k)
                  return (
                    <div key={k} className="ck-toggle">
                      <span style={{ minWidth: 0 }}>{t?.name ?? k}<span style={{ color: 'var(--ck-faint)', display: 'block', fontSize: 11.5 }}>{t?.status === 'connected' ? 'Connected' : 'Not connected yet'}</span></span>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--ck-faint)', flexShrink: 0 }}>
                        {on ? 'Approved' : 'Approve'}
                        <input type="checkbox" checked={on} onChange={(e) => void patchState({ tools: e.target.checked ? [...(state?.tools ?? []), k] : (state?.tools ?? []).filter((x) => x !== k) })} />
                      </label>
                    </div>
                  )
                })}
              </div>
              <div>
                <div className="ck-board-title">Standing instructions</div>
                <textarea className="ck-search" style={{ minHeight: 64, resize: 'vertical', fontSize: 12.5, width: '100%' }} defaultValue={lead.instructions}
                  placeholder={`Anything ${lead.name} should always know.`}
                  onBlur={(e) => { void updateRole(lead.id, { instructions: e.target.value }); setRoster((all) => (all ?? []).map((r) => (r.id === lead.id ? { ...r, instructions: e.target.value } : r))) }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button className="ck-pill" onClick={() => { void updateRole(lead.id, { enabled: !lead.enabled }); setRoster((all) => (all ?? []).map((r) => (r.id === lead.id ? { ...r, enabled: !lead.enabled } : r))) }}>
                    {lead.enabled ? 'Pause department' : 'Resume department'}
                  </button>
                  <ConfirmButton onConfirm={async () => { await retireDepartment(dept.key); nav('/team') }} confirmLabel={`Retire ${dept.name}?`}
                    style={{ background: 'none', border: '1px solid var(--ck-line)', borderRadius: 999, padding: '5px 12px', fontSize: 12.5, color: 'var(--ck-muted)', cursor: 'pointer', fontFamily: 'var(--ck-font)' }}>
                    Retire
                  </ConfirmButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

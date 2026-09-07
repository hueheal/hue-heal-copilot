import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useBrand } from '../lib/brandContext'
import {
  listRoles, updateRole, retireDepartment, presetFor, listRunsFor, listDeptItems, setItemStatus,
  assignJob, listDeptJobs, markReviewed, decideJob, getDeptState, saveDeptState, deptSpend, learnNow,
  type Role, type RoleRun, type RoleItem, type RoleSchedule, type RoleJob, type DeptState,
} from '../lib/roles'
import { deptOf, seatFor, toolOf, pounds } from '../lib/org'
import { agoLabel } from '../components/chrome/AssetCard'
import DeliverableView from '../components/DeliverableView'
import ConfirmButton from '../components/ConfirmButton'

/* ============================================================
   A department's room. You brief the lead; the lead runs the
   team. The board shows what needs your approval, what is being
   worked on, and what is done. The rail holds the people, the
   playbook, the tools and budget, and the lead's requests.
   ============================================================ */

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
  const [openJob, setOpenJob] = useState<string | null>(params.get('job'))
  const [showDone, setShowDone] = useState(false)
  const [editPlaybook, setEditPlaybook] = useState(false)
  const [learning, setLearning] = useState(false)

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
  }
  useEffect(() => { setRoster(null); setOpenJob(params.get('job')); void reload() /* eslint-disable-next-line */ }, [deptKey, brand?.id])

  // Watch the board while anything is in flight; open the result when it lands.
  const active = jobs.filter((j) => j.status === 'queued' || j.status === 'running')
  useEffect(() => {
    if (!deptKey || active.length === 0) return
    const t = setInterval(async () => {
      const fresh = await listDeptJobs(deptKey)
      setJobs(fresh)
      const landed = fresh.filter((j) => active.some((a) => a.id === j.id) && j.status !== 'queued' && j.status !== 'running')
      if (landed.length) {
        const [rs, its, sp] = await Promise.all([listRunsFor(ids), listDeptItems(ids), deptSpend(ids)])
        setRuns(rs); setItems(its); setSpend(sp)
        const done = landed.find((j) => j.status === 'done')
        if (done) setOpenJob(done.id)
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
    if (job) { setJobs((l) => [job, ...l]); setOpenJob(null) }
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
    if (r.error) setNote(r.error)
    else if (r.note) setNote(r.note)
    else { setNote(`${lead.name} rewrote the playbook: ${(r.lessons ?? []).length} lessons.`); void reload() }
  }

  if (!dept) return <div className="ck-page"><div className="ck-page-inner"><div className="ck-empty"><div style={{ fontSize: 15, fontWeight: 500 }}>No such department</div><p><button className="ck-pill" onClick={() => nav('/team')}>← Team</button></p></div></div></div>
  if (roster === null) return <div className="ck-page"><div className="ck-page-inner"><div className="ck-skeleton" style={{ height: 120 }} /></div></div>
  if (!lead) return (
    <div className="ck-page"><div className="ck-page-inner">
      <div className="ck-empty"><div style={{ fontSize: 15, fontWeight: 500 }}>{dept.name} is not hired in {brand?.name ?? 'this workspace'}</div><p><button className="ck-pill" onClick={() => nav('/team')}>← Team</button></p></div>
    </div></div>
  )

  const preset = presetFor(lead, brand?.name)
  const nameOf = (id?: string | null) => team.find((r) => r.id === id)?.name ?? 'A seat'
  const runOf = (j: RoleJob) => runs.find((r) => r.id === j.run_id)
  const titleOf = (j: RoleJob) => runOf(j)?.output.title ?? j.task.replace(/^(ROUTE|DESK):\s*/, '')
  const whoOf = (j: RoleJob) => `${nameOf(j.role_id)}${j.plan?.approach === 'team' ? ` with ${j.plan.assignments.filter((a) => a.ok !== false).map((a) => a.to).join(', ')}` : ''}`
  const srcOf = (j: RoleJob) => (j.source === 'telegram' ? ' · from your phone' : j.source === 'schedule' ? ' · on its own cadence' : '')

  const approvals = jobs.filter((j) => j.status === 'done' && j.approval === 'pending')
  const failed = jobs.filter((j) => j.status === 'failed' && !j.reviewed_at)
  const done = jobs.filter((j) => j.status === 'done' && j.approval !== 'pending')
  const unread = done.filter((j) => !j.reviewed_at)
  const read = done.filter((j) => j.reviewed_at)
  const opened = openJob ? jobs.find((j) => j.id === openJob) : null
  const openedRun = opened ? runOf(opened) : null
  const openItems = items.filter((i) => i.status === 'open')
  const budget = state?.budget_pence ?? 5000
  const wanted = dept.tools.filter((k) => k !== 'anthropic')
  const cadence = lead.schedule?.cadence ?? 'off'

  const JobCard = ({ j, state: st, actions }: { j: RoleJob; state: string; actions: React.ReactNode }) => (
    <div className="ck-job" data-state={st}>
      <span className="ck-job-dot" aria-hidden="true" />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="ck-job-task">{titleOf(j)}</span>
        <span className="ck-job-meta">
          {st === 'working' ? `${whoOf(j)} on it · briefed ${agoLabel(j.created_at)}` : `${whoOf(j)} · ${agoLabel(j.finished_at ?? j.created_at)}`}{srcOf(j)}
          {j.cost_pence > 0 ? ` · ${pounds(Number(j.cost_pence))}` : ''}
        </span>
      </span>
      <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>{actions}</span>
    </div>
  )

  return (
    <div className="ck-page" style={{ ['--ck-dept' as never]: dept.accent }}>
      <div className="ck-page-inner" style={{ maxWidth: 1040 }}>
        <div className="ck-eyebrow"><button className="ck-pill" style={{ border: 'none', padding: '0 6px 0 0' }} onClick={() => nav('/team')}>← Team</button> {brand?.name}</div>

        {/* Identity band */}
        <div className="ck-band" style={{ marginTop: 8 }}>
          <span className="ck-dept-mark" data-size="l">{dept.mark}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="ck-h1" style={{ margin: 0, fontSize: 22 }}>{dept.name}</h1>
            <div style={{ fontSize: 13, color: 'var(--ck-muted)', marginTop: 2 }}>{dept.tagline}. Led by <strong style={{ color: 'var(--ck-ink)', fontWeight: 500 }}>{lead.name}</strong>{members.length ? `, with ${members.map((m) => m.name.toLowerCase()).join(', ')}` : ''}.</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {(['off', 'daily', 'weekdays', 'weekly'] as const).map((c) => (
                <button key={c} className="ck-pill" data-on={cadence === c ? '1' : '0'} onClick={() => void saveSchedule({ cadence: c })}>
                  {c === 'off' ? 'On demand' : c[0].toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ck-faint)' }}>{cadence === 'off' ? 'Works when you brief it. Learns every Friday.' : 'Reports each morning. Digest and learning on Fridays.'}</div>
          </div>
        </div>
        {cadence !== 'off' && (
          <input className="ck-search" style={{ width: '100%', fontSize: 12.5, marginTop: 8 }} defaultValue={lead.schedule?.task ?? ''}
            placeholder="Standing brief for the morning run (blank = a daily review of the department)"
            onBlur={(e) => void saveSchedule({ task: e.target.value })} />
        )}

        {/* Composer */}
        <div className="ck-composer" style={{ marginTop: 14 }}>
          <textarea value={task} onChange={(e) => setTask(e.target.value)} rows={2}
            placeholder={`Brief ${lead.name}. ${members.length ? 'They will bring in the team if the work needs it.' : ''}`}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void brief(task) } }} />
          <div className="ck-composer-row">
            {(preset?.playbook ?? []).map((p) => (
              <button key={p.label} className="ck-pill" disabled={busy} onClick={() => void brief(p.task)}>{p.label}</button>
            ))}
            <button className="ck-go" disabled={busy || !task.trim()} onClick={() => void brief(task)}>{busy ? 'Briefing…' : 'Brief'}</button>
          </div>
        </div>
        {note && <div className="ck-note" role="status">{note}</div>}

        <div className="ck-rolegrid" style={{ marginTop: 6 }}>
          {/* Board, or the open deliverable */}
          <div>
            {opened ? (
              <>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0' }}>
                  <button className="ck-pill" onClick={() => { setOpenJob(null); if (params.get('job')) setParams({}) }}>← Board</button>
                  {opened.approval === 'pending' && <>
                    <span style={{ fontSize: 12.5, color: 'var(--ck-muted)' }}>Acting on this would go public or cost money.</span>
                    <button className="ck-pill" data-on="1" onClick={() => void decide(opened, 'approved')}>Approve</button>
                    <button className="ck-pill" onClick={() => void decide(opened, 'declined')}>Decline</button>
                  </>}
                  {opened.approval === 'approved' && <span className="ck-pill" style={{ pointerEvents: 'none' }}>Approved</span>}
                  {opened.approval === 'declined' && <span className="ck-pill" style={{ pointerEvents: 'none' }}>Declined</span>}
                  {opened.status === 'done' && opened.approval !== 'pending' && !opened.reviewed_at && <button className="ck-pill" onClick={() => void reviewed(opened)}>Mark as read</button>}
                </div>
                {openedRun ? (
                  <DeliverableView run={openedRun} roster={roster} by={whoOf(opened)} />
                ) : (
                  <div className="ck-empty"><div style={{ fontSize: 15, fontWeight: 500 }}>{opened.status === 'failed' ? 'This one did not finish' : 'Still working'}</div><p>{opened.error ?? opened.task}</p></div>
                )}
                {opened.plan?.approach === 'team' && (
                  <div style={{ marginTop: 18 }}>
                    <div className="ck-board-title">How the team worked it</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ck-muted)', lineHeight: 1.55 }}>{opened.plan.reason}</div>
                    {opened.plan.assignments.map((a, i) => {
                      const r = runs.find((x) => x.id === a.runId)
                      return (
                        <div key={i} className="ck-handoff" style={{ marginTop: 8 }}>
                          <div style={{ fontSize: 11.5, color: 'var(--ck-faint)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{a.to}{a.ok === false ? ' · could not finish' : ''}</div>
                          <div style={{ fontSize: 12.5, color: 'var(--ck-muted)', lineHeight: 1.5, marginTop: 3 }}>{a.brief}</div>
                          {r && a.roleId && <button className="ck-pill" style={{ marginTop: 8 }} onClick={() => nav(`/roles/${a.roleId}?run=${r.id}`)}>Read their part</button>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                {approvals.length > 0 && (
                  <div className="ck-board-group">
                    <div className="ck-board-title"><b>Needs your approval</b> {approvals.length}</div>
                    <div className="ck-jobs" style={{ margin: 0 }}>
                      {approvals.map((j) => <JobCard key={j.id} j={j} state="approval" actions={<>
                        <button className="ck-pill" onClick={() => setOpenJob(j.id)}>Read</button>
                        <button className="ck-pill" data-on="1" onClick={() => void decide(j, 'approved')}>Approve</button>
                        <button className="ck-pill" onClick={() => void decide(j, 'declined')}>Decline</button>
                      </>} />)}
                    </div>
                  </div>
                )}
                {(active.length > 0 || failed.length > 0) && (
                  <div className="ck-board-group">
                    <div className="ck-board-title"><b>Working on</b> {active.length}</div>
                    <div className="ck-jobs" style={{ margin: 0 }}>
                      {active.map((j) => <JobCard key={j.id} j={j} state="working" actions={null} />)}
                      {failed.map((j) => <JobCard key={j.id} j={j} state="failed" actions={<>
                        <button className="ck-pill" disabled={busy} onClick={() => void brief(j.task)}>Try again</button>
                        <button className="ck-pill" onClick={() => void reviewed(j)}>Dismiss</button>
                      </>} />)}
                    </div>
                  </div>
                )}
                <div className="ck-board-group">
                  <div className="ck-board-title"><b>Done</b> {unread.length ? `${unread.length} to read` : done.length ? 'all read' : ''}</div>
                  {done.length === 0 && active.length === 0 && (
                    <div className="ck-empty"><div style={{ fontSize: 15, fontWeight: 500 }}>Nothing yet</div><p>Brief {lead.name} above, or run one of their plays.</p></div>
                  )}
                  <div className="ck-jobs" style={{ margin: 0 }}>
                    {unread.map((j) => <JobCard key={j.id} j={j} state="done" actions={<>
                      <button className="ck-pill" onClick={() => setOpenJob(j.id)}>Read</button>
                      <button className="ck-pill" onClick={() => void reviewed(j)}>Mark as read</button>
                    </>} />)}
                    {(showDone ? read : read.slice(0, 4)).map((j) => <JobCard key={j.id} j={j} state="read" actions={
                      <button className="ck-pill" onClick={() => setOpenJob(j.id)}>Read{j.approval === 'approved' ? ' · approved' : j.approval === 'declined' ? ' · declined' : ''}</button>
                    } />)}
                  </div>
                  {read.length > 4 && <button className="ck-pill" style={{ marginTop: 8 }} onClick={() => setShowDone((v) => !v)}>{showDone ? 'Show fewer' : `Show all ${read.length}`}</button>}
                </div>
              </>
            )}
          </div>

          {/* Rail */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <h3 className="ck-h2">People</h3>
              {[lead, ...members].map((r) => {
                const seat = seatFor(r, brand?.name)
                const last = runs.find((x) => x.role_id === r.id)
                return (
                  <button key={r.id} className="ck-seat" data-lead={r.seat === 'lead' ? '1' : '0'} onClick={() => nav(`/roles/${r.id}`)} title={seat?.learnsFrom ? `Learns from ${seat.learnsFrom}` : undefined}>
                    <span className="ck-seat-dot" style={{ opacity: r.seat === 'lead' ? 1 : 0.45 }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                    <span className="ck-kbd" style={{ display: 'inline' }}>{last ? agoLabel(last.created_at) : 'idle'}</span>
                  </button>
                )
              })}
            </div>

            <div>
              <h3 className="ck-h2">Playbook</h3>
              <div style={{ fontSize: 12, color: 'var(--ck-faint)', margin: '-4px 0 8px', lineHeight: 1.5 }}>
                {state?.playbook_updated_at ? `Rewritten ${agoLabel(state.playbook_updated_at)}. ` : 'Nothing learned yet. '}The lead rewrites it every Friday from what actually happened.
              </div>
              {editPlaybook ? (
                <textarea className="ck-search" style={{ minHeight: 220, resize: 'vertical', fontSize: 12.5, width: '100%' }} defaultValue={state?.playbook ?? ''}
                  onBlur={(e) => { void patchState({ playbook: e.target.value }); setEditPlaybook(false) }} autoFocus />
              ) : state?.playbook ? (
                <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--ck-muted)', whiteSpace: 'pre-wrap', maxHeight: 220, overflow: 'auto' }}>{state.playbook}</div>
              ) : null}
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button className="ck-pill" disabled={learning} onClick={() => void learn()}>{learning ? 'Learning…' : 'Learn now'}</button>
                {!editPlaybook && <button className="ck-pill" onClick={() => setEditPlaybook(true)}>{state?.playbook ? 'Edit' : 'Write it yourself'}</button>}
              </div>
            </div>

            <div>
              <h3 className="ck-h2">Tools and budget</h3>
              <div style={{ fontSize: 12.5, color: 'var(--ck-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{pounds(spend)} of</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>£<input className="ck-search" style={{ width: 64, fontSize: 12.5, padding: '3px 6px' }} type="number" min={0} step={5} defaultValue={budget / 100}
                  onBlur={(e) => { const v = Math.max(0, Math.round(Number(e.target.value) * 100)); if (v !== budget) void patchState({ budget_pence: v }) }} /></span>
                <span>this month</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ck-faint)', marginTop: 4, marginBottom: 8, lineHeight: 1.5 }}>
                Model use is metered per run (an estimate). Approving a tool lets the department plan with it and ask to use it. Connecting is a separate step; nothing here connects anything.
              </div>
              <div className="ck-toggle"><span>Claude</span><span className="ck-kbd" style={{ display: 'inline' }}>connected</span></div>
              {wanted.map((k) => {
                const t = toolOf(k)
                const on = (state?.tools ?? []).includes(k)
                const connected = t?.status === 'connected'
                return (
                  <div key={k} className="ck-toggle">
                    <span style={{ minWidth: 0 }}>
                      {t?.name ?? k}
                      <span style={{ color: 'var(--ck-faint)', display: 'block', fontSize: 11.5 }}>{connected ? 'Connected' : 'Not connected yet'}{t?.cost ? ` · ${t.cost}` : ''}</span>
                    </span>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--ck-faint)', flexShrink: 0 }}>
                      {on ? 'Approved' : 'Approve'}
                      <input type="checkbox" checked={on} onChange={(e) => void patchState({ tools: e.target.checked ? [...(state?.tools ?? []), k] : (state?.tools ?? []).filter((x) => x !== k) })} />
                    </label>
                  </div>
                )
              })}
            </div>

            {openItems.length > 0 && (
              <div>
                <h3 className="ck-h2">Requests</h3>
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

            <div>
              <h3 className="ck-h2">Standing instructions</h3>
              <textarea className="ck-search" style={{ minHeight: 64, resize: 'vertical', fontSize: 12.5, width: '100%' }} defaultValue={lead.instructions}
                placeholder={`Anything ${lead.name} should always know or always do.`}
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
          </aside>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useBrand } from '../lib/brandContext'
import {
  listRoles, updateRole, retireRole, presetFor, listRuns, listItems, setItemStatus,
  listNotes, ackNote, ownsOf, defersOf, assignJob, listJobs, markReviewed,
  type Role, type RoleRun, type RoleItem, type RoleAction, type RoleSchedule, type RoleNote, type RoleJob,
} from '../lib/roles'
import { listAssets } from '../lib/assets'
import { savePost } from '../lib/socialCopilot'
import { agoLabel } from '../components/chrome/AssetCard'
import ConfirmButton from '../components/ConfirmButton'

/* ============================================================
   A role's dashboard: its division at a glance, the composer and
   playbook it runs on, its latest deliverable (actions spawn real
   drafts), its ledger of needs and experiments for the controller,
   its cadence, and its desk of past runs incl. the weekly digest.
   ============================================================ */

export default function RoleRoom() {
  const { id } = useParams()
  const nav = useNavigate()
  const { current: brand } = useBrand()
  const [role, setRole] = useState<Role | null>(null)
  const [roster, setRoster] = useState<Role[]>([])
  const [inbox, setInbox] = useState<RoleNote[]>([])
  const [runs, setRuns] = useState<RoleRun[]>([])
  const [jobs, setJobs] = useState<RoleJob[]>([])
  const [items, setItems] = useState<RoleItem[]>([])
  const [kpis, setKpis] = useState<{ label: string; value: string }[]>([])
  const [task, setTask] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [viewRun, setViewRun] = useState<RoleRun | null>(null)
  const [spawning, setSpawning] = useState<string | null>(null)

  async function reload() {
    const all = await listRoles()
    const r = all.find((x) => x.id === id) ?? null
    setRole(r); setRoster(all)
    if (r) {
      const [rs, its, notes, js] = await Promise.all([listRuns(r.id), listItems(r.id), listNotes(r.id, 'in'), listJobs(r.id)])
      setRuns(rs); setItems(its); setInbox(notes.filter((n) => n.status === 'open')); setJobs(js)
      setViewRun((v) => v ?? rs[0] ?? null)
    }
  }
  useEffect(() => { reload() /* eslint-disable-next-line */ }, [id, brand?.id])

  useEffect(() => {
    listAssets().then((assets) => {
      const week = assets.filter((a) => Date.now() - new Date(a.when).getTime() < 7 * 86400000)
      const drafts = assets.filter((a) => a.status === 'draft')
      const published = assets.filter((a) => a.status !== 'draft')
      const lastShip = published[0] ? agoLabel(published[0].when) : '—'
      setKpis([
        { label: 'Pieces this week', value: String(week.length) },
        { label: 'Open drafts', value: String(drafts.length) },
        { label: 'Published total', value: String(published.length) },
        { label: 'Last shipped', value: lastShip },
      ])
    }).catch(() => {})
  }, [brand?.id])

  // Watch the queue while anything is in flight, and pull the finished
  // deliverable in as soon as it lands.
  const active = jobs.filter((j) => j.status === 'queued' || j.status === 'running')
  useEffect(() => {
    if (!role || active.length === 0) return
    const id = setInterval(async () => {
      const fresh = await listJobs(role.id)
      setJobs(fresh)
      const landed = fresh.some((j) => active.some((a) => a.id === j.id) && j.status !== 'queued' && j.status !== 'running')
      if (landed) {
        const rs = await listRuns(role.id)
        setRuns(rs)
        const newest = fresh.find((j) => j.status === 'done' && j.run_id)
        const target = rs.find((r) => r.id === newest?.run_id)
        if (target) setViewRun(target)
        listItems(role.id).then(setItems).catch(() => {})
        listNotes(role.id, 'in').then((n) => setInbox(n.filter((x) => x.status === 'open'))).catch(() => {})
      }
    }, 4000)
    return () => clearInterval(id)
    /* eslint-disable-next-line */
  }, [role?.id, active.length])

  const preset = role ? presetFor(role) : undefined
  const digest = useMemo(() => runs.find((r) => r.kind === 'digest'), [runs])

  /* Assigning files the job and returns. The work runs on the server, so it
     survives a reload or a closed tab; the room watches the job row. */
  async function run(taskText: string) {
    if (!role || busy || !taskText.trim()) return
    setBusy(true); setNote(null)
    const { job, error } = await assignJob(role, taskText.trim())
    setBusy(false)
    if (error) { setNote(error); return }
    setTask('')
    if (job) setJobs((list) => [job, ...list])
  }

  async function saveSchedule(patch: Partial<RoleSchedule>) {
    if (!role) return
    const schedule = { ...(role.schedule ?? {}), ...patch }
    await updateRole(role.id, { schedule })
    setRole({ ...role, schedule })
  }

  async function spawn(a: RoleAction) {
    setSpawning(a.topic)
    try {
      if (a.kind === 'journal') { nav(`/create/journal?topic=${encodeURIComponent(a.topic)}`); return }
      if (a.kind === 'newsletter') { nav(`/create/newsletter?topic=${encodeURIComponent(a.topic)}`); return }
      const post = await savePost({ topic: a.topic, format: a.kind, sector: 'hospitality', accent: 'copper', platform: 'instagram', headline: '', caption: '', hashtags: [], slides: [], image_url: null, status: 'draft' })
      nav(`/create/social/${post.id}`)
    } finally { setSpawning(null) }
  }

  async function judge(item: RoleItem, status: RoleItem['status']) {
    await setItemStatus(item.id, status)
    setItems((list) => list.map((x) => (x.id === item.id ? { ...x, status } : x)))
  }

  if (!role) {
    return <div className="ck-page"><div className="ck-page-inner"><div className="ck-skeleton" style={{ height: 120 }} /></div></div>
  }

  const toReview = jobs.filter((j) => j.status === 'done' && !j.reviewed_at)
  const failed = jobs.filter((j) => j.status === 'failed' && !j.reviewed_at)
  const open = (k: 'need' | 'experiment') => items.filter((i) => i.kind === k && i.status === 'open')
  const judged = (k: 'need' | 'experiment') => items.filter((i) => i.kind === k && i.status !== 'open').slice(0, 4)
  const kindBadge = (k?: string) => (k === 'digest' ? 'Weekly digest' : k === 'scheduled' ? 'Scheduled' : 'Task')

  return (
    <div className="ck-page">
      <div className="ck-page-inner" style={{ maxWidth: 1040 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="ck-eyebrow"><button className="ck-pill" style={{ border: 'none', padding: '0 6px 0 0' }} onClick={() => nav('/roles')}>← Roles</button> {brand?.name}</div>
            <h1 className="ck-h1" style={{ marginBottom: 6 }}>{role.name}</h1>
            <div style={{ color: 'var(--ck-muted)', fontSize: 13.5, maxWidth: '64ch', lineHeight: 1.55 }}>{role.charter}</div>
            {roster.length > 1 && (
              <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--ck-faint)', maxWidth: '64ch', lineHeight: 1.55 }}>
                <span style={{ color: 'var(--ck-muted)' }}>Owns</span> {ownsOf(role)}.
                {defersOf(role) && <> <span style={{ color: 'var(--ck-muted)' }}>Hands over</span> {defersOf(role)}.</>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11.5, color: 'var(--ck-faint)' }}>Cadence</span>
              {(['off', 'daily', 'weekdays', 'weekly'] as const).map((c) => (
                <button key={c} className="ck-pill" data-on={(role.schedule?.cadence ?? 'off') === c ? '1' : '0'} onClick={() => void saveSchedule({ cadence: c })}>
                  {c === 'off' ? 'On demand' : c[0].toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
            {(role.schedule?.cadence ?? 'off') !== 'off' && (
              <input className="ck-search" style={{ width: 380, fontSize: 12.5 }} defaultValue={role.schedule?.task ?? ''}
                placeholder="Standing task (blank = daily division review)"
                onBlur={(e) => void saveSchedule({ task: e.target.value })} />
            )}
            <div style={{ fontSize: 11.5, color: 'var(--ck-faint)' }}>Scheduled runs land each morning; the digest lands Fridays.</div>
          </div>
        </div>

        {/* KPIs */}
        <div className="ck-kpis">
          {kpis.map((k) => (
            <div key={k.label} className="ck-kpi"><div className="ck-kpi-v">{k.value}</div><div className="ck-kpi-l">{k.label}</div></div>
          ))}
          <div className="ck-kpi"><div className="ck-kpi-v">{open('need').length + open('experiment').length}</div><div className="ck-kpi-l">Awaiting your call</div></div>
          {(active.length > 0 || toReview.length > 0) && (
            <div className="ck-kpi"><div className="ck-kpi-v">{active.length || toReview.length}</div><div className="ck-kpi-l">{active.length ? 'In progress' : 'To review'}</div></div>
          )}
        </div>

        {/* Composer + playbook */}
        <div className="ck-composer" style={{ marginTop: 8 }}>
          <textarea value={task} onChange={(e) => setTask(e.target.value)} rows={2}
            placeholder={`Assign your ${role.name} a task — or run a play below`}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void run(task) } }} />
          <div className="ck-composer-row">
            {(preset?.playbook ?? []).map((p) => (
              <button key={p.label} className="ck-pill" disabled={busy} onClick={() => void run(p.task)}>{p.label}</button>
            ))}
            <button className="ck-go" disabled={busy || !task.trim()} onClick={() => void run(task)}>{busy ? 'Assigning…' : 'Assign'}</button>
          </div>
        </div>
        {note && <div className="ck-note" role="status">{note}</div>}

        {/* The job board: what this role is working on, and what it has
            finished that you have not read yet. */}
        {(active.length > 0 || toReview.length > 0 || failed.length > 0) && (
          <div className="ck-jobs">
            {active.map((j) => (
              <div key={j.id} className="ck-job" data-state="working">
                <span className="ck-job-dot" aria-hidden="true" />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="ck-job-task">{j.task}</span>
                  <span className="ck-job-meta">
                    {role.name} is working on this · assigned {agoLabel(j.created_at)}
                    {j.source === 'telegram' ? ' · from Telegram' : j.source === 'schedule' ? ' · scheduled' : ''}
                  </span>
                </span>
              </div>
            ))}
            {toReview.map((j) => {
              const target = runs.find((r) => r.id === j.run_id)
              return (
                <div key={j.id} className="ck-job" data-state="done">
                  <span className="ck-job-dot" aria-hidden="true" />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="ck-job-task">{target?.output.title ?? j.task}</span>
                    <span className="ck-job-meta">Ready to review · finished {agoLabel(j.finished_at ?? j.created_at)}</span>
                  </span>
                  <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {target && <button className="ck-pill" onClick={() => setViewRun(target)}>Read</button>}
                    <button className="ck-pill" onClick={() => { void markReviewed(j.id); setJobs((l) => l.map((x) => (x.id === j.id ? { ...x, reviewed_at: new Date().toISOString() } : x))) }}>
                      Mark reviewed
                    </button>
                  </span>
                </div>
              )
            })}
            {failed.map((j) => (
              <div key={j.id} className="ck-job" data-state="failed">
                <span className="ck-job-dot" aria-hidden="true" />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="ck-job-task">{j.task}</span>
                  <span className="ck-job-meta">Did not finish{j.error ? `: ${j.error}` : ''}</span>
                </span>
                <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="ck-pill" disabled={busy} onClick={() => void run(j.task)}>Try again</button>
                  <button className="ck-pill" onClick={() => { void markReviewed(j.id); setJobs((l) => l.filter((x) => x.id !== j.id)) }}>Dismiss</button>
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="ck-rolegrid">
          {/* Deliverable */}
          <div>
            {digest && viewRun?.id !== digest.id && (
              <button className="ck-digestbar" onClick={() => setViewRun(digest)}>
                Latest weekly digest · {agoLabel(digest.created_at)} — read it
              </button>
            )}
            {viewRun ? (
              <article className="ck-deliverable">
                <div className="ck-eyebrow">{kindBadge(viewRun.kind)} · {agoLabel(viewRun.created_at)}</div>
                <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', margin: '6px 0 8px' }}>{viewRun.output.title}</h2>
                <p style={{ color: 'var(--ck-muted)', fontSize: 13.5, lineHeight: 1.6, marginTop: 0 }}>{viewRun.output.summary}</p>
                {viewRun.output.sections?.map((s) => (
                  <section key={s.heading}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, margin: '18px 0 6px' }}>{s.heading}</h3>
                    {s.body.split(/\n{2,}/).map((p, i) => (
                      <p key={i} style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--ck-ink)', margin: '6px 0', whiteSpace: 'pre-wrap' }}>{p}</p>
                    ))}
                  </section>
                ))}
                {(viewRun.output.handoffs ?? []).length > 0 && (
                  <>
                    <h3 style={{ fontSize: 13, fontWeight: 600, margin: '20px 0 8px' }}>Handed to colleagues</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(viewRun.output.handoffs ?? []).map((h, i) => {
                        const to = roster.find((r) => r.name.toLowerCase() === (h.to ?? '').toLowerCase())
                        return (
                          <div key={i} className="ck-handoff">
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                              <span className="ck-pill" style={{ pointerEvents: 'none', flexShrink: 0 }}>→ {h.to}</span>
                              <span style={{ fontSize: 13.5, fontWeight: 500 }}>{h.subject}</span>
                            </div>
                            <div style={{ fontSize: 12.5, color: 'var(--ck-muted)', lineHeight: 1.55, marginTop: 4 }}>{h.body}</div>
                            {to && <button className="ck-pill" style={{ marginTop: 8 }} onClick={() => nav(`/roles/${to.id}`)}>Open {to.name}</button>}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
                {(viewRun.output.actions ?? []).length > 0 && (
                  <>
                    <h3 style={{ fontSize: 13, fontWeight: 600, margin: '20px 0 8px' }}>Proposed pieces</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {viewRun.output.actions.map((a, i) => (
                        <div key={i} className="ck-actionrow">
                          <span className="ck-pill" style={{ pointerEvents: 'none', flexShrink: 0 }}>{a.kind}</span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 500 }}>{a.topic}</span>
                            {a.note && <span style={{ fontSize: 12, color: 'var(--ck-faint)', display: 'block' }}>{a.note}</span>}
                          </span>
                          <button className="ck-go" style={{ marginLeft: 0, flexShrink: 0 }} disabled={spawning === a.topic} onClick={() => void spawn(a)}>
                            {spawning === a.topic ? 'Creating…' : 'Create draft'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </article>
            ) : (
              <div className="ck-empty">
                <div style={{ fontSize: 15, fontWeight: 500 }}>No deliverables yet</div>
                <p>Run a play above, or set a cadence and your {role.name} reports every morning.</p>
              </div>
            )}
          </div>

          {/* Rail: ledger + desk + admin */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {inbox.length > 0 && (
              <div>
                <h3 className="ck-h2">From colleagues</h3>
                <div style={{ fontSize: 12, color: 'var(--ck-faint)', margin: '-4px 0 8px' }}>
                  {role.name} reads these on its next run and answers them in the deliverable.
                </div>
                {inbox.map((n) => {
                  const from = roster.find((r) => r.id === n.from_role_id)
                  return (
                    <div key={n.id} className="ck-handoff">
                      <div style={{ fontSize: 11.5, color: 'var(--ck-faint)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {from?.name ?? 'A colleague'} · {agoLabel(n.created_at)}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, margin: '3px 0' }}>{n.subject}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--ck-muted)', lineHeight: 1.5 }}>{n.body}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button className="ck-pill" disabled={busy} onClick={() => void run(`Answer this handoff from your ${from?.name ?? 'colleague'} — "${n.subject}": ${n.body}\n\nRespond within your own remit, say what you will change, and hand anything back that is theirs to decide.`)}>
                          Answer now
                        </button>
                        <button className="ck-pill" onClick={() => { void ackNote(n.id); setInbox((l) => l.filter((x) => x.id !== n.id)) }}>Dismiss</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div>
              <h3 className="ck-h2">Requests</h3>
              {open('need').length === 0 && <div className="ck-note" style={{ marginTop: 4 }}>Nothing requested.</div>}
              {open('need').map((i) => (
                <LedgerCard key={i.id} item={i} onJudge={(s) => void judge(i, s)} />
              ))}
              {judged('need').map((i) => <LedgerDone key={i.id} item={i} />)}
            </div>
            <div>
              <h3 className="ck-h2">Experiments</h3>
              {open('experiment').length === 0 && <div className="ck-note" style={{ marginTop: 4 }}>None proposed.</div>}
              {open('experiment').map((i) => (
                <LedgerCard key={i.id} item={i} onJudge={(s) => void judge(i, s)} approveLabel="Approve" />
              ))}
              {judged('experiment').map((i) => <LedgerDone key={i.id} item={i} />)}
            </div>
            <div>
              <h3 className="ck-h2">Desk</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {runs.map((r) => (
                  <button key={r.id} className="ck-item" data-active={viewRun?.id === r.id ? '1' : '0'} onClick={() => setViewRun(r)} style={{ padding: '7px 9px' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.output.title}</span>
                    <span className="ck-kbd" style={{ display: 'inline' }}>{r.kind === 'digest' ? 'digest' : agoLabel(r.created_at)}</span>
                  </button>
                ))}
                {runs.length === 0 && <div className="ck-note">Empty desk.</div>}
              </div>
            </div>
            <div>
              <h3 className="ck-h2">Standing instructions</h3>
              <textarea className="ck-search" style={{ minHeight: 64, resize: 'vertical', fontSize: 12.5 }} defaultValue={role.instructions}
                placeholder="Anything this role should always know or always do."
                onBlur={(e) => { void updateRole(role.id, { instructions: e.target.value }); setRole({ ...role, instructions: e.target.value }) }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="ck-pill" onClick={() => { void updateRole(role.id, { enabled: !role.enabled }); setRole({ ...role, enabled: !role.enabled }) }}>
                  {role.enabled ? 'Pause role' : 'Resume role'}
                </button>
                <ConfirmButton onConfirm={async () => { await retireRole(role.id); nav('/roles') }} confirmLabel="Retire this role?"
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

function LedgerCard({ item, onJudge, approveLabel = 'Approve' }: { item: RoleItem; onJudge: (s: RoleItem['status']) => void; approveLabel?: string }) {
  return (
    <div className="ck-ledger">
      <div style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</div>
      <div style={{ fontSize: 12.5, color: 'var(--ck-muted)', lineHeight: 1.5, margin: '4px 0 8px' }}>{item.detail}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="ck-pill" onClick={() => onJudge('approved')}>{approveLabel}</button>
        <button className="ck-pill" onClick={() => onJudge('declined')}>Decline</button>
      </div>
    </div>
  )
}

function LedgerDone({ item }: { item: RoleItem }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '5px 2px', fontSize: 12.5, color: 'var(--ck-faint)' }}>
      <span style={{ textTransform: 'capitalize' }}>{item.status}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ck-muted)' }}>{item.title}</span>
    </div>
  )
}

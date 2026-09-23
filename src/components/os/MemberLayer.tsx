import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { listRuns, listRunsFor, latestBriefing, briefingJobs, deptSpend, getDeptState, type Role, type RoleJob, type RoleRun, type Briefing } from '../../lib/roles'
import { listImageAssets, decideImage, type ImageAsset } from '../../lib/imageAssets'
import { deptOf, pounds } from '../../lib/org'

/* ============================================================
   The team member layer (Figma 23-811): Teams & Rooms on the
   left, one chat in the middle under the member's name and their
   output tabs, task history on the right. The same layer serves
   a group (SLT Team = the daily briefing / meetings). Everything
   an agent does arrives in the chat: replies with actions, work
   in progress, delegation, image candidates, failures, needs.
   ============================================================ */

export const GROUP_SLT = 'slt'

export interface LayerDemo { runs?: Record<string, RoleRun[]>; briefing?: Briefing; briefingJobs?: RoleJob[]; images?: ImageAsset[] }

const stripPrefix = (task: string) => task.replace(/^(ROUTE|DESK|MEETING|IMAGES):\s*/, '').split('\n')[0]
const when = (iso: string) => {
  const d = new Date(iso); const diff = Date.now() - d.getTime(); const h = Math.floor(diff / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
const stateOf = (j: RoleJob) => (j.status === 'done' ? (j.approval === 'pending' ? 'approval' : 'done') : j.status === 'failed' ? 'failed' : 'working')
const list = (names: string[]) => names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

/* What each department produces, so the tabs fit the seat. */
const TABS: Record<string, string[]> = {
  growth: ['Socials', 'Emails', 'Journals', 'Images'], product: ['Product', 'Research'], partnerships: ['Outreach'],
  founder: ['Desk', 'Meetings'], finance: ['Documents'], counsel: ['Reviews'], experts: ['Research'],
}
const TAB_KINDS: Record<string, string[]> = { Socials: ['carousel', 'portrait', 'story'], Emails: ['newsletter'], Journals: ['journal'] }

interface Bubble { id: string; at: string; node: ReactNode }

export default function MemberLayer({ role, group, roles, jobs, avatarFor, demo, skin = 'sand', onSelect, onClose, onDecide, onRetry, onSend }: {
  role: Role | null; group?: string; roles: Role[]; jobs: RoleJob[]; avatarFor: (dept: string | null | undefined) => string; skin?: 'sand' | 'graphite'
  demo?: LayerDemo; onSelect: (id: string) => void; onClose: () => void
  onDecide: (j: RoleJob, approval: 'approved' | 'declined') => void; onRetry: (j: RoleJob) => void; onSend: (text: string) => Promise<string | null>
}) {
  const nav = useNavigate()
  const [tab, setTab] = useState('Chat')
  const [runs, setRuns] = useState<RoleRun[]>([])
  const [images, setImages] = useState<ImageAsset[]>([])
  const [spend, setSpend] = useState<{ used: number; budget: number } | null>(null)
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [bJobs, setBJobs] = useState<RoleJob[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [compact, setCompact] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const leads = roles.filter((r) => r.seat === 'lead' && r.enabled)
  const members = role ? roles.filter((r) => r.dept === role.dept && r.seat === 'member') : []
  const leadOfSelected = role?.seat === 'lead' ? role : roles.find((r) => r.dept === role?.dept && r.seat === 'lead') ?? null
  const dept = deptOf(role?.dept)
  const name = group ? 'SLT Team' : role?.name ?? ''
  const tabs = group ? ['Chat', 'Meetings'] : ['Chat', ...(TABS[role?.dept ?? ''] ?? [])]

  useEffect(() => { setTab('Chat'); setNote(null) }, [role?.id, group])
  /* The title settles once the thread has been scrolled. */
  const onThreadScroll = () => { const el = scrollRef.current; if (!el) return; setCompact(el.scrollTop > 40); stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }

  /* The member's own history, images, and spend. */
  useEffect(() => {
    if (!role) return
    let live = true
    const pull = async () => {
      if (demo) { setRuns(demo.runs?.[role.id] ?? []); setImages((demo.images ?? []).filter((i) => i.dept === role.dept)); setSpend({ used: 320, budget: 5000 }); return }
      const [rs, im, st, sp] = await Promise.all([listRuns(role.id), listImageAssets({ dept: role.dept ?? undefined, limit: 24 }), getDeptState(role.dept ?? ''), deptSpend(roles.filter((r) => r.dept === role.dept).map((r) => r.id))])
      if (!live) return
      setRuns(rs); setImages(im); setSpend({ used: sp, budget: st.budget_pence })
    }
    pull().catch(() => {})
    const t = setInterval(() => { pull().catch(() => {}) }, 8000)
    return () => { live = false; clearInterval(t) }
  }, [role?.id, demo])

  /* The group: the latest briefing and every lead's reply. */
  useEffect(() => {
    if (!group) return
    let live = true
    const pull = async () => {
      if (demo) { setBriefing(demo.briefing ?? null); setBJobs(demo.briefingJobs ?? []); setRuns(Object.values(demo.runs ?? {}).flat()); return }
      const b = await latestBriefing(); if (!live) return
      setBriefing(b)
      if (b) { const bj = await briefingJobs(b.id); if (!live) return; setBJobs(bj); setRuns(await listRunsFor([...new Set(bj.map((j) => j.role_id))])) }
    }
    pull().catch(() => {})
    const t = setInterval(() => { pull().catch(() => {}) }, 8000)
    return () => { live = false; clearInterval(t) }
  }, [group, demo])

  const mine = useMemo(() => (role ? jobs.filter((j) => j.role_id === role.id && !j.task.startsWith('DESK:')) : []), [jobs, role?.id])
  const roleByName = (n: string) => roles.find((r) => r.name.toLowerCase() === n.toLowerCase())
  const roomPath = (r: Role) => (r.seat === 'member' ? `/roles/${r.id}` : `/team/${r.dept}`)

  /* Every kind of thing an agent does, as a bubble. */
  const thread = useMemo<Bubble[]>(() => {
    const out: Bubble[] = []
    const runById = new Map(runs.map((r) => [r.id, r]))
    const meBubble = (id: string, at: string, text: string) => out.push({ id, at, node: <div className="os-b" data-me="1">{text}<small>You · {when(at)}</small></div> })
    const replyBubble = (r: Role, run: RoleRun, job?: RoleJob) => {
      const out2 = run.output
      const assigned = job?.plan?.assignments?.map((a) => a.to) ?? []
      const pending = images.filter((i) => i.run_id === run.id && i.status === 'pending')
      const st = job ? stateOf(job) : 'done'
      out.push({ id: `r${run.id}`, at: run.created_at, node: (
        <div className="os-b">
          <b>{out2.title}.</b> {out2.brief || out2.summary}
          {assigned.length > 0 && (
            <span className="os-b-line">Asked {list(assigned)}
              {assigned.map((n) => { const m = roleByName(n); return m ? <button key={n} className="os-chip" data-small="1" onClick={() => onSelect(m.id)}>{m.name.split(' ')[0]}</button> : null })}
            </span>
          )}
          {(out2.needs ?? []).length > 0 && <span className="os-b-line">Asks for: {(out2.needs ?? []).map((n) => n.title).join('; ')}</span>}
          {(out2.handoffs ?? []).length > 0 && <span className="os-b-line">Handed to {list((out2.handoffs ?? []).map((h) => h.to))}{(out2.handoffs ?? []).map((h) => { const m = roleByName(h.to); return m ? <button key={h.to} className="os-chip" data-small="1" onClick={() => onSelect(m.id)}>Open {m.name.split(' ').slice(-1)[0]}</button> : null })}</span>}
          {pending.length > 0 && (
            <span className="os-b-images">
              {pending.map((i) => (
                <span key={i.id} className="os-b-image"><img src={i.url} alt="" />
                  <span><button className="os-chip" data-small="1" data-primary="1" onClick={() => void decideImage(i.id, 'approved').then(() => setImages((l) => l.map((x) => x.id === i.id ? { ...x, status: 'approved' } : x)))}>Keep</button><button className="os-chip" data-small="1" onClick={() => void decideImage(i.id, 'declined').then(() => setImages((l) => l.map((x) => x.id === i.id ? { ...x, status: 'declined' } : x)))}>No</button></span>
                </span>
              ))}
            </span>
          )}
          {job && st === 'approval' && (
            <span className="os-chips" style={{ marginTop: 10 }}>
              <button className="os-chip" data-primary="1" onClick={() => onDecide(job, 'approved')}>Approve</button>
              <button className="os-chip" onClick={() => onDecide(job, 'declined')}>Decline</button>
              <button className="os-chip" onClick={() => nav(`${roomPath(r)}?run=${run.id}`)}>Open</button>
            </span>
          )}
          <small>{r.name} · {when(run.created_at)}{job?.approval === 'approved' ? ' · approved' : job?.approval === 'declined' ? ' · declined' : ''} · <a href={`${roomPath(r)}?run=${run.id}`} onClick={(e) => { e.preventDefault(); nav(`${roomPath(r)}?run=${run.id}`) }}>open</a></small>
        </div>
      ) })
    }
    const workingBubble = (r: Role, job: RoleJob) => {
      const team = job.plan?.assignments?.map((a) => a.to) ?? []
      out.push({ id: `w${job.id}`, at: job.created_at, node: (
        <div className="os-b" data-working="1">
          <span className="os-dots"><i /><i /><i /></span>
          {job.status === 'queued' ? 'Picking it up…' : team.length ? `Briefing ${list(team)}…` : 'Reading your brief…'}
          <small>{r.name} · {when(job.created_at)}</small>
        </div>
      ) })
    }
    const failedBubble = (r: Role, job: RoleJob) => out.push({ id: `f${job.id}`, at: job.finished_at ?? job.created_at, node: (
      <div className="os-b" data-failed="1">
        Couldn't finish this{job.error ? `: ${job.error}` : ''}.
        <span className="os-chips" style={{ marginTop: 10 }}><button className="os-chip" data-primary="1" onClick={() => onRetry(job)}>Try again</button></span>
        <small>{r.name} · {when(job.finished_at ?? job.created_at)}</small>
      </div>
    ) })

    if (role) {
      for (const j of mine) {
        meBubble(`j${j.id}`, j.created_at, stripPrefix(j.task))
        const run = j.run_id ? runById.get(j.run_id) : undefined
        if (run) replyBubble(role, run, j)
        else if (j.status === 'queued' || j.status === 'running') workingBubble(role, j)
        else if (j.status === 'failed') failedBubble(role, j)
      }
      const linked = new Set(mine.map((j) => j.run_id).filter(Boolean))
      for (const run of runs) if (!linked.has(run.id)) replyBubble(role, run)
    } else if (group && briefing) {
      meBubble(`b${briefing.id}`, briefing.created_at, briefing.text)
      for (const j of bJobs) {
        const r = roles.find((x) => x.id === j.role_id); if (!r) continue
        if (j.task.startsWith('DESK:') && j.status !== 'done') continue
        const run = j.run_id ? runById.get(j.run_id) : undefined
        if (run) replyBubble(r, run, j)
        else if (j.status === 'queued' || j.status === 'running') workingBubble(r, j)
        else if (j.status === 'failed') failedBubble(r, j)
      }
    }
    return out.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  }, [role, group, mine, runs, images, bJobs, briefing, roles])

  /* The newest message is always in view: on open, when a message lands,
     and when the content grows, unless the founder has scrolled up to read. */
  const stick = useRef(true)
  useEffect(() => {
    const el = scrollRef.current; if (!el) return
    stick.current = true
    const toBottom = () => { el.scrollTop = el.scrollHeight }
    toBottom(); const r = requestAnimationFrame(toBottom); const t = setTimeout(toBottom, 120)
    return () => { cancelAnimationFrame(r); clearTimeout(t) }
  }, [thread.length, tab, role?.id, group])
  useEffect(() => {
    const el = scrollRef.current; const inner = el?.firstElementChild
    if (!el || !inner || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => { if (stick.current) el.scrollTop = el.scrollHeight })
    ro.observe(inner); return () => ro.disconnect()
  }, [tab, role?.id, group])

  async function send() {
    const t = text.trim(); if (!t || busy) return
    setBusy(true); setNote(null)
    try { const n = await onSend(t); setText(''); if (n) { setNote(n); setTimeout(() => setNote(null), 6000) } } finally { setBusy(false) }
  }

  /* Output tabs: that member's produced things, as cards. */
  const tabCards = useMemo<{ id: string; image?: string; title: string; sub: string; go: () => void }[]>(() => {
    if (tab === 'Chat') return []
    if (tab === 'Images') return images.map((i) => ({ id: i.id, image: i.url, title: i.purpose || i.category, sub: `${i.surface} · ${i.status}`, go: () => nav(`/team/${role?.dept}`) }))
    const kinds = TAB_KINDS[tab]
    const rs = kinds ? runs.filter((r) => (r.output.actions ?? []).some((a) => kinds.includes(a.kind))) : runs
    return rs.map((r) => ({ id: r.id, title: r.output.title, sub: r.output.brief || r.output.summary, go: () => (tab === 'Emails' ? nav('/os/newsletter') : nav(`${role ? roomPath(role) : '/team'}?run=${r.id}`)) }))
  }, [tab, runs, images, role])

  const history = useMemo(() => [...(group ? bJobs.filter((j) => !j.task.startsWith('DESK:')) : mine)].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 9), [mine, bJobs, group])

  return (
    <div className="os-layer" data-compact={compact ? '1' : undefined}>
      <h1 className="os-layer-title">{name}</h1>
      <div className="os-pill" role="tablist">
        {tabs.map((t) => <button key={t} role="tab" aria-selected={tab === t} data-on={tab === t ? '1' : undefined} onClick={() => setTab(t)}>{t}</button>)}
        <button role="tab" className="os-pill-mobile" aria-selected={tab === 'Tasks'} data-on={tab === 'Tasks' ? '1' : undefined} onClick={() => setTab('Tasks')}>Tasks</button>
      </div>

      <div className="os-layer-grid">
        <aside className="os-rooms">
          <div className="os-col-label">Teams &amp; Rooms</div>
          {skin === 'graphite' ? (
            <>
              <div className="os-portrait">
                {role ? <img src={avatarFor(role.dept)} alt="" /> : <img src={avatarFor(leads[0]?.dept)} alt="" />}
                <div><b>{name}</b><span>{group ? `${leads.length} leads · one briefing` : `${role?.title ?? ''}${dept ? ` · ${dept.name}` : ''}`}</span></div>
              </div>
              <div className="os-portrait-strip">
                <button title="SLT Team" data-on={group ? '1' : undefined} onClick={() => onSelect(GROUP_SLT)}><img src={avatarFor('founder')} alt="" /></button>
                {leads.map((l) => <button key={l.id} title={l.name} data-on={role?.id === l.id ? '1' : undefined} onClick={() => onSelect(l.id)}><img src={avatarFor(l.dept)} alt="" /></button>)}
                {members.map((m) => <button key={m.id} title={m.name} data-on={role?.id === m.id ? '1' : undefined} onClick={() => onSelect(m.id)}><img src={avatarFor(m.dept)} alt="" /></button>)}
              </div>
            </>
          ) : (
          <>
          <button className="os-room" data-on={group ? '1' : undefined} onClick={() => onSelect(GROUP_SLT)}>
            <span className="os-room-avatar" data-group="1">{leads.slice(0, 4).map((l) => <img key={l.id} src={avatarFor(l.dept)} alt="" />)}</span><span>SLT Team</span>
          </button>
          {leads.map((l) => (
            <div key={l.id}>
              <button className="os-room" data-on={role?.id === l.id ? '1' : undefined} onClick={() => onSelect(l.id)}>
                <span className="os-room-avatar"><img src={avatarFor(l.dept)} alt="" /></span><span>{l.name}</span>
              </button>
              {leadOfSelected?.id === l.id && members.map((m) => (
                <button key={m.id} className="os-room" data-member="1" data-on={role?.id === m.id ? '1' : undefined} onClick={() => onSelect(m.id)}>
                  <span className="os-room-avatar"><img src={avatarFor(m.dept)} alt="" /></span><span>{m.name}</span>
                </button>
              ))}
            </div>
          ))}
          </>
          )}
        </aside>

        <section className="os-chatbox" data-tab={tab}>
          <div className="os-scroll" ref={scrollRef} onScroll={onThreadScroll}>
            {tab === 'Chat' && (
              <div className="os-thread2">
                {thread.length === 0 && <div className="os-empty">{group ? 'No briefing yet. Say what matters today and every lead answers here.' : `Nothing between you and ${name} yet. Say what you need.`}</div>}
                {thread.map((b) => <div key={b.id}>{b.node}</div>)}
              </div>
            )}
            {tab !== 'Chat' && tab !== 'Tasks' && (
              <div className="os-cards">
                {tabCards.length === 0 && <div className="os-empty">Nothing here yet. Ask {name.split(' ').slice(-1)[0] === 'Team' ? 'the team' : name} for one.</div>}
                {tabCards.map((c) => (
                  <button key={c.id} className="os-card2" onClick={c.go}>
                    {c.image ? <img src={c.image} alt="" /> : null}
                    <span><b>{c.title}</b><span>{c.sub}</span></span>
                  </button>
                ))}
              </div>
            )}
            {tab === 'Tasks' && <History history={history} roles={roles} group={!!group} spend={spend} />}
          </div>
          {note && <div className="os-b-note" role="status">{note}</div>}
          <form className="os-compose2" onSubmit={(e) => { e.preventDefault(); void send() }}>
            <label className="os-compose-copy">
              <small>{group ? 'Brief the whole leadership team' : `Chat with ${name}`}</small>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder={group ? 'What matters today?' : 'What can I help you with today?'} />
            </label>
            <button type="submit" className="os-send" disabled={busy || !text.trim()} aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>
          </form>
        </section>

        <aside className="os-history">
          <div className="os-col-label">Task history</div>
          <History history={history} roles={roles} group={!!group} spend={spend} />
          <button className="os-chip" style={{ marginTop: 12 }} onClick={onClose}>Back to today</button>
          {role && <button className="os-chip" style={{ marginTop: 12, marginLeft: 8 }} onClick={() => nav(roomPath(role))}>Full room</button>}
          {dept && role && <div className="os-col-label" style={{ marginTop: 14 }}>{role.title} · {dept.name}</div>}
        </aside>
      </div>
    </div>
  )
}

function History({ history, roles, group, spend }: { history: RoleJob[]; roles: Role[]; group: boolean; spend: { used: number; budget: number } | null }) {
  return (
    <div className="os-hist">
      {history.length === 0 && <div className="os-hist-row"><i /><span>No tasks yet.</span></div>}
      {history.map((j) => {
        const st = stateOf(j)
        const who = group ? roles.find((r) => r.id === j.role_id)?.name.split(' ').slice(-1)[0] : null
        return (
          <div key={j.id} className="os-hist-row" data-state={st}>
            <i />
            <span>{stripPrefix(j.task)}<small>{st === 'working' ? 'Working on it' : st === 'approval' ? 'Waiting for your approval' : st === 'failed' ? 'Could not finish' : 'Done'}{who ? ` · ${who}` : ''} · {when(j.created_at)}</small></span>
          </div>
        )
      })}
      {spend && !group && <div className="os-hist-spend">{pounds(spend.used)} of {pounds(spend.budget)} this month</div>}
    </div>
  )
}

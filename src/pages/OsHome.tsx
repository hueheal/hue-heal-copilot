import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBrand } from '../lib/brandContext'
import { listRoles, listWorkspaceJobs, decideJob, latestBriefing, briefingJobs, sendBriefing, listRunsFor, type Role, type RoleJob, type RoleRun } from '../lib/roles'
import { listPriorities, updatePriority, type Priority } from '../lib/priorities'
import { deptOf } from '../lib/org'
import { isSupabaseConfigured } from '../lib/supabase'
import '../styles/os.css'

/* ============================================================
   Company OS — draft home. The greeting speaks first, then the
   day comes into focus: what needs you, what to do now and next
   (the chief of staff's desk), your priorities. Everything else
   is one message away through the composer.
   ============================================================ */

/* Until profiles carry a display name. */
const FOUNDER = 'Maria'

const GREET_HOLD_MS = 3200

interface Line { text: string; tag?: string }
interface Desk { runId: string; now: Line[]; next: Line[]; parked: Line[]; decisions: Line[]; at: string }

/* Sample day for local mode and ?demo, so the draft can be judged before a
   chief has written a real desk. Nothing here is saved. */
const DEMO = {
  roles: [
    { id: 'd-chief', key: 'chief', name: 'Chief of staff', seat: 'lead', enabled: true, dept: 'founder' },
    { id: 'd-growth', key: 'growth', name: 'Head of Growth', seat: 'lead', enabled: true, dept: 'growth' },
    { id: 'd-partner', key: 'partnerships', name: 'Head of Partnerships', seat: 'lead', enabled: true, dept: 'partnerships' },
  ] as unknown as Role[],
  jobs: [
    { id: 'd-j1', role_id: 'd-growth', dept: 'growth', task: 'Freemium to premium pricing outline', status: 'done', approval: 'pending', created_at: new Date().toISOString() },
    { id: 'd-j2', role_id: 'd-growth', dept: 'growth', task: 'Sleep ritual hero images, four candidates', status: 'done', approval: 'pending', created_at: new Date().toISOString() },
    { id: 'd-j3', role_id: 'd-partner', dept: 'partnerships', task: 'Pilot tester outreach: universities shortlist', status: 'running', approval: 'none', created_at: new Date().toISOString() },
  ] as unknown as RoleJob[],
  priorities: [
    { id: 'd-p1', position: 1, title: 'Answer Counsel\'s ten rewrites', detail: 'Ten claims on the site need softer wording before pilot week 6. One sitting, with Counsel\'s proposed lines beside each.', dept: 'counsel', status: 'active', due: null },
    { id: 'd-p2', position: 2, title: 'Original imagery live on the site', detail: 'Replace every stock frame with our own renders so nothing on remedae.app is potentially copyrighted.', dept: 'growth', status: 'active', due: null },
    { id: 'd-p3', position: 3, title: 'Pilot testers and practitioners', detail: 'Universities first, then practitioners. Partnerships owns the list; you make the introductions.', dept: 'partnerships', status: 'active', due: null },
    { id: 'd-p4', position: 4, title: 'Pricing outline', detail: 'Growth proposes the freemium to premium model; you decide the line.', dept: 'growth', status: 'active', due: null },
  ] as unknown as Priority[],
  desk: {
    runId: 'demo', at: new Date().toISOString(),
    now: [{ text: 'Approve the pricing outline so Growth can write the paywall copy', tag: 'Priority 4' }],
    next: [
      { text: 'Answer Counsel\'s ten rewrites in one sitting', tag: 'Priority 1' },
      { text: 'Drop the five reference frames into the site so renders match the guide', tag: 'Priority 2' },
      { text: 'Confirm the pilot welcome email now arrives as The Remedae Pilot', tag: 'Priority 3' },
    ],
    parked: [{ text: 'Paid safety review: wait for pilot week 6 data' }, { text: 'Founding creator offer: after pricing lands' }],
    decisions: [{ text: 'Keep the pilot at 100 testers or open to 250? Default: 100 until week 6' }],
  } as Desk,
}

/* ---- Icons (1.6px stroke, HIG weight) ---- */
const I = {
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" /></svg>,
  chat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5z" /></svg>,
  team: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><circle cx="17" cy="9.5" r="2.4" /><path d="M15.5 14.2a4.5 4.5 0 0 1 5 4.3" /></svg>,
  create: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16M4 12h16" /></svg>,
  clients: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M4 12h16" /></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2.2" /><circle cx="10" cy="17" r="2.2" /></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>,
  chev: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>,
  tick: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4.5 4.5L19 7" /></svg>,
  send: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M6 11l6-6 6 6" /></svg>,
  bolt: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg>,
  flame: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.2 1.5 1 2.5 2 3 0-4 1-7 1-9.5z" /></svg>,
}


/* The desk's sections come back as prose lists; keep one line per item. */
function linesOf(body: string): Line[] {
  return body.split(/\n+/).map((s) => s.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()).filter(Boolean)
    .map((text) => { const m = text.match(/\(?(?:priority|P)\s*#?(\d+)\)?/i); return { text, tag: m ? `Priority ${m[1]}` : undefined } })
}
function deskOf(run: RoleRun): Desk {
  const sec = (re: RegExp) => run.output.sections?.find((s) => re.test(s.heading))?.body ?? ''
  return {
    runId: run.id, at: run.created_at,
    now: linesOf(sec(/^now/i)), next: linesOf(sec(/^next/i)), parked: linesOf(sec(/^parked/i)), decisions: linesOf(sec(/^decision/i)),
  }
}

const greetingWord = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }
const dayLabel = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
const doneKey = (brand: string | undefined, runId: string) => `os.done.${brand ?? 'x'}.${runId}`

export default function OsHome() {
  const { current, brands, setCurrent } = useBrand()
  const nav = useNavigate()
  const [roles, setRoles] = useState<Role[]>([])
  const [jobs, setJobs] = useState<RoleJob[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [desk, setDesk] = useState<Desk | null>(null)
  const [ready, setReady] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'greet' | 'list'>('idle')
  const [wsOpen, setWsOpen] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [ticked, setTicked] = useState<Record<string, boolean>>({})
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const needsRef = useRef<HTMLDivElement>(null)

  /* Pull the day: roles, jobs, priorities, and the chief's latest desk. */
  const demo = !isSupabaseConfigured || new URLSearchParams(window.location.search).has('demo')
  async function pull() {
    if (demo) { setRoles(DEMO.roles); setJobs(DEMO.jobs); setPriorities(DEMO.priorities); setDesk(DEMO.desk); return }
    const [rs, js, ps, b] = await Promise.all([listRoles(), listWorkspaceJobs(), listPriorities(), latestBriefing()])
    setRoles(rs); setJobs(js); setPriorities(ps)
    const chief = rs.find((r) => r.key === 'chief')
    if (chief && b) {
      const bj = await briefingJobs(b.id)
      const deskJob = [...bj].reverse().find((j) => j.role_id === chief.id && j.task.startsWith('DESK:') && j.status === 'done' && j.run_id)
      if (deskJob) {
        const runs = await listRunsFor([chief.id])
        const run = runs.find((r) => r.id === deskJob.run_id)
        if (run) { const d = deskOf(run); setDesk(d); try { setTicked(JSON.parse(localStorage.getItem(doneKey(current?.id, d.runId)) ?? '{}')) } catch { /* fresh */ } }
      }
    }
  }
  useEffect(() => {
    let live = true
    pull().catch(() => {}).finally(() => { if (live) setReady(true) })
    const t = setInterval(() => { pull().catch(() => {}) }, 12000)
    return () => { live = false; clearInterval(t) }
  }, [current?.id])

  /* The greeting fades in once the day is known, holds, then the list takes focus. */
  useEffect(() => {
    if (!ready || phase !== 'idle') return
    const t = setTimeout(() => setPhase('greet'), 60)
    return () => clearTimeout(t)
  }, [ready, phase])
  useEffect(() => {
    if (phase !== 'greet') return
    const t = setTimeout(() => setPhase('list'), GREET_HOLD_MS)
    return () => clearTimeout(t)
  }, [phase])
  const skip = () => { if (phase === 'greet') setPhase('list') }

  const chief = roles.find((r) => r.key === 'chief')
  const leads = roles.filter((r) => r.seat === 'lead' && r.enabled)
  const approvals = jobs.filter((j) => j.status === 'done' && j.approval === 'pending')
  const working = jobs.filter((j) => j.status === 'queued' || j.status === 'running')
  const active = priorities.filter((p) => p.status === 'active')
  const todo = desk ? [...desk.now, ...desk.next] : []
  const deskCount = todo.length || active.length

  function tick(id: string) {
    if (!desk) return
    const next = { ...ticked, [id]: !ticked[id] }
    setTicked(next); localStorage.setItem(doneKey(current?.id, desk.runId), JSON.stringify(next))
  }
  async function decide(j: RoleJob, approval: 'approved' | 'declined') {
    await decideJob(j.id, approval)
    setJobs((l) => l.map((x) => (x.id === j.id ? { ...x, approval, reviewed_at: new Date().toISOString() } : x)))
  }
  async function donePriority(p: Priority) {
    await updatePriority(p.id, { status: 'done' })
    setPriorities((l) => l.map((x) => (x.id === p.id ? { ...x, status: 'done' } : x)))
  }
  async function send() {
    const t = text.trim()
    if (!t || busy) return
    if (!leads.length) { setNote('Hire a department first, there is no one to brief.'); return }
    setBusy(true); setNote(null)
    const r = await sendBriefing(t, leads)
    setBusy(false)
    if (r.error) { setNote(r.error); return }
    setText('')
    setNote(chief ? 'With your chief of staff. The desk rewrites itself when the replies land.' : `Sent to ${leads.length} leads.`)
    setTimeout(() => setNote(null), 6000)
    pull().catch(() => {})
  }
  const answer = (line: string) => { setText(`Decision on "${line.slice(0, 80)}": `); inputRef.current?.focus() }
  const title = (j: RoleJob) => j.task.replace(/^(ROUTE|DESK|MEETING|IMAGES):\s*/, '').split('\n')[0]

  const rail = useMemo(() => [
    { key: 'today', label: 'Today', icon: I.home, on: true, go: () => {} },
    { key: 'chat', label: 'Chat', icon: I.chat, go: () => inputRef.current?.focus() },
    { key: 'teams', label: 'Teams', icon: I.team, go: () => nav('/team') },
    { key: 'create', label: 'Create', icon: I.create, go: () => nav('/create') },
    { key: 'clients', label: 'Clients', icon: I.clients, go: () => nav('/clients') },
  ], [nav])

  const wsInitials = (name: string) => name.split(/\s+/).map((w) => w[0]).join('').replace('&', '').slice(0, 2).toUpperCase()

  return (
    <div className="os" data-phase={phase} onClick={skip} onKeyDown={skip}>
      {/* Top: settings, workspace, bell */}
      <header className="os-top">
        <div className="os-top-left">
          <button className="os-icon" aria-label="Settings" onClick={(e) => { e.stopPropagation(); nav('/settings') }}>{I.settings}</button>
        </div>
        <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
          <button className="os-ws" aria-haspopup="menu" aria-expanded={wsOpen} onClick={() => setWsOpen((v) => !v)}>
            <span className="os-ws-mark" style={{ background: current?.accent_color || undefined }}>{wsInitials(current?.name ?? 'HH')}</span>
            <span>{current?.name ?? 'Workspace'}</span>
            <span className="os-ws-chev">{I.chev}</span>
          </button>
          {wsOpen && (
            <div className="os-ws-menu" role="menu">
              {brands.map((b) => (
                <button key={b.id} role="menuitem" className="os-ws-row" data-on={b.id === current?.id ? '1' : undefined} onClick={() => { setCurrent(b.id); setWsOpen(false); setPhase('idle'); setReady(false); setDesk(null) }}>
                  <span className="os-ws-mark" style={{ background: b.accent_color || undefined, width: 22, height: 22, fontSize: 9.5 }}>{wsInitials(b.name)}</span>
                  <span>{b.name}</span>
                  {b.id === current?.id && <span className="os-sub">current</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="os-top-right">
          <button className="os-icon" aria-label={`${approvals.length} waiting for you`} onClick={(e) => { e.stopPropagation(); setPhase('list'); needsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}>
            {I.bell}{approvals.length > 0 && <span className="os-badge">{approvals.length}</span>}
          </button>
        </div>
      </header>

      {/* Right rail: the core areas */}
      <nav className="os-rail" aria-label="Areas" onClick={(e) => e.stopPropagation()}>
        {rail.map((r) => (
          <button key={r.key} className="os-rail-item" data-on={r.on ? '1' : undefined} onClick={r.go}>{r.icon}<span>{r.label}</span></button>
        ))}
      </nav>

      <div className="os-stage">
        <div className="os-col">
          {/* The greeting */}
          <div className="os-greet" aria-hidden={phase === 'list'}>
            <h1>
              {greetingWord()}, <b>{FOUNDER}</b><br />
              <span className="os-greet-line">You have <span className="os-glyph">{I.bolt}</span><b>{approvals.length} {approvals.length === 1 ? 'approval' : 'approvals'}</b></span><br />
              <span className="os-greet-line">and <span className="os-glyph">{I.flame}</span><b>{deskCount} {deskCount === 1 ? 'thing' : 'things'}</b> on your desk</span>
            </h1>
          </div>

          {/* The day */}
          <div className="os-list" aria-hidden={phase !== 'list'}>
            <div className="os-day">
              <span><b>{greetingWord()}, {FOUNDER}.</b> {dayLabel()}</span>
              <span>{working.length ? `${working.length} in flight` : chief ? `${chief.name} is on desk` : ''}</span>
            </div>

            <Group title="Needs you" sub={approvals.length + (desk?.decisions.length ?? 0) ? undefined : 'nothing waiting'} refEl={needsRef}>
              {approvals.map((j) => {
                const d = deptOf(j.dept)
                return (
                  <Row key={j.id} title={title(j)} meta={<><i style={{ ['--ck-dept' as never]: d?.accent }} />{d?.name ?? 'Team'} · needs your approval</>}
                    open={open === j.id} onOpen={() => setOpen(open === j.id ? null : j.id)}
                    actions={<><button className="os-chip" onClick={(e) => { e.stopPropagation(); void decide(j, 'declined') }}>Decline</button><button className="os-chip" data-primary="1" onClick={(e) => { e.stopPropagation(); void decide(j, 'approved') }}>Approve</button></>}
                    detail={<><span>Open the room to read the full deliverable before deciding.</span> <button className="os-chip" style={{ marginLeft: 8 }} onClick={(e) => { e.stopPropagation(); nav(`/team/${j.dept}?job=${j.id}`) }}>Open</button></>} />
                )
              })}
              {desk?.decisions.map((l, i) => (
                <Row key={`dec${i}`} title={l.text} meta="Decision waiting on you · a default is proposed" actions={<button className="os-chip" data-primary="1" onClick={(e) => { e.stopPropagation(); answer(l.text) }}>Answer</button>} />
              ))}
            </Group>

            {desk && (
              <Group title="Now" sub="the one thing first">
                {desk.now.map((l, i) => <Row key={`now${i}`} tick={!!ticked[`now${i}`]} onTick={() => tick(`now${i}`)} title={l.text} meta={l.tag} />)}
                {desk.now.length === 0 && <div className="os-empty">Nothing singled out.</div>}
              </Group>
            )}
            {desk && desk.next.length > 0 && (
              <Group title="Next" sub={`${desk.next.length}`}>
                {desk.next.map((l, i) => <Row key={`next${i}`} tick={!!ticked[`next${i}`]} onTick={() => tick(`next${i}`)} title={l.text} meta={l.tag} />)}
              </Group>
            )}

            <Group title="Priorities" sub={active.length ? `${active.length} active` : 'none yet'}>
              {active.slice(0, 5).map((p, i) => {
                const d = deptOf(p.dept)
                return (
                  <Row key={p.id} onTick={() => void donePriority(p)} title={`${i + 1}. ${p.title}`}
                    meta={<>{d ? <><i style={{ ['--ck-dept' as never]: d.accent }} />{d.name}</> : 'Unassigned'}{p.due ? ` · due ${new Date(p.due).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}</>}
                    open={open === p.id} onOpen={() => setOpen(open === p.id ? null : p.id)}
                    detail={p.detail || 'No detail yet.'}
                    actions={<button className="os-chip" onClick={(e) => { e.stopPropagation(); nav(`/team?priority=${p.id}`) }}>Open</button>} />
                )
              })}
              {active.length === 0 && <div className="os-empty">Tell your chief of staff what matters and it becomes the list.</div>}
            </Group>

            {desk && desk.parked.length > 0 && (
              <Group title="Parked" sub={`${desk.parked.length}`}>
                {desk.parked.map((l, i) => <Row key={`park${i}`} title={l.text} muted />)}
              </Group>
            )}
          </div>
        </div>
      </div>

      {/* The composer */}
      {note && <div className="os-compose-note" role="status">{note}</div>}
      <form className="os-compose" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); void send() }}>
        <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder={chief ? `Tell ${chief.name} what matters…` : leads.length ? 'Brief the leads…' : 'Hire a department in Teams to start'} />
        <button type="submit" className="os-send" disabled={busy || !text.trim()} aria-label="Send">{I.send}</button>
      </form>
    </div>
  )
}

function Group({ title, sub, children, refEl }: { title: string; sub?: string; children: ReactNode; refEl?: React.RefObject<HTMLDivElement> }) {
  const empty = !children || (Array.isArray(children) && children.every((c) => !c || (Array.isArray(c) && c.length === 0)))
  return (
    <section className="os-group" ref={refEl}>
      <div className="os-group-head">{title}{sub && <span>{sub}</span>}</div>
      <div className="os-card">{empty ? <div className="os-empty">Clear.</div> : children}</div>
    </section>
  )
}

function Row({ title, meta, actions, detail, open, onOpen, tick, onTick, muted }: {
  title: string; meta?: ReactNode; actions?: ReactNode; detail?: ReactNode; open?: boolean; onOpen?: () => void
  tick?: boolean; onTick?: () => void; muted?: boolean
}) {
  return (
    <div className="os-row" onClick={(e) => { e.stopPropagation(); onOpen?.() }} style={muted ? { opacity: 0.7 } : undefined}>
      <button className="os-tick" data-on={tick ? '1' : undefined} aria-label={tick ? 'Done' : 'Mark done'} onClick={(e) => { e.stopPropagation(); onTick?.() }} disabled={!onTick}>{I.tick}</button>
      <div className="os-row-main">
        <div className="os-row-title" data-done={tick ? '1' : undefined}>{title}</div>
        {meta && <div className="os-row-meta">{meta}</div>}
      </div>
      {actions ? <div className="os-chips">{actions}</div> : <span />}
      {open && detail && <div className="os-detail">{detail}</div>}
    </div>
  )
}

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBrand } from '../lib/brandContext'
import { listRoles, listWorkspaceJobs, decideJob, latestBriefing, briefingJobs, sendBriefing, listRunsFor, type Role, type RoleJob, type RoleRun } from '../lib/roles'
import { listPriorities, updatePriority, type Priority } from '../lib/priorities'
import { deptOf } from '../lib/org'
import { isSupabaseConfigured } from '../lib/supabase'
import '../styles/os.css'

/* ============================================================
   Company OS — draft home, to the founder's Figma frame
   (Copilot, node 8-179). The greeting speaks first, then the
   day arrives as messages from the team: what needs you, the
   chief's now and next, your priorities. The composer at the
   bottom is how you talk back.
   ============================================================ */

/* Until profiles carry a display name. */
const FOUNDER = 'Maria'
const GREET_HOLD_MS = 3400

interface Line { text: string; tag?: string }
interface Desk { runId: string; now: Line[]; next: Line[]; parked: Line[]; decisions: Line[]; at: string }

/* Sample day for local mode and ?demo, so the draft can be judged before a
   chief has written a real desk. Nothing here is saved. */
const DEMO = {
  roles: [
    { id: 'd-chief', key: 'chief', name: 'Chief of staff', seat: 'lead', enabled: true, dept: 'founder' },
    { id: 'd-growth', key: 'growth', name: 'Head of Growth', seat: 'lead', enabled: true, dept: 'growth' },
    { id: 'd-finance', key: 'finance', name: 'Head of Finance', seat: 'lead', enabled: true, dept: 'finance' },
    { id: 'd-partner', key: 'partnerships', name: 'Head of Partnerships', seat: 'lead', enabled: true, dept: 'partnerships' },
  ] as unknown as Role[],
  jobs: [
    { id: 'd-j1', role_id: 'd-growth', dept: 'growth', task: 'Two Instagram posts for the sleep ritual launch', status: 'done', approval: 'pending', created_at: new Date().toISOString() },
    { id: 'd-j2', role_id: 'd-finance', dept: 'finance', task: 'Funding for 2027: investor update email', status: 'done', approval: 'pending', created_at: new Date().toISOString() },
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
    ],
    parked: [{ text: 'Paid safety review: wait for pilot week 6 data' }, { text: 'Founding creator offer: after pricing lands' }],
    decisions: [{ text: 'Keep the pilot at 100 testers or open to 250? Default: 100 until week 6' }],
  } as Desk,
}

/* ---- Icons (1.6px stroke) ---- */
const I = {
  menu: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" /></svg>,
  chat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5z" /></svg>,
  team: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><circle cx="17" cy="9.5" r="2.4" /><path d="M15.5 14.2a4.5 4.5 0 0 1 5 4.3" /></svg>,
  create: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16M4 12h16" /></svg>,
  clients: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M4 12h16" /></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>,
  arrow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
}

/* Workspace tiles: the brand's own logo when it has one, else the frame's tiles. */
const TILE: Record<string, string> = { 'hue & heal': '/os/ws-hh.png', remedae: '/os/ws-remedae.png' }
const tileFor = (b: { name: string; logo_url?: string | null }) => b.logo_url || TILE[b.name.trim().toLowerCase()] || ''

/* Bot avatars from the frame, warm or cool by department, until each seat has its own. */
const WARM = new Set(['growth', 'founder', 'experts'])
const avatarFor = (dept: string | null | undefined) => (WARM.has(dept ?? '') ? '/os/bot-warm.png' : '/os/bot-cool.png')

/* The desk's sections come back as prose lists; keep one line per item. */
function linesOf(body: string): Line[] {
  return body.split(/\n+/).map((s) => s.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()).filter(Boolean)
    .map((text) => { const m = text.match(/\(?(?:priority|P)\s*#?(\d+)\)?/i); return { text, tag: m ? `Priority ${m[1]}` : undefined } })
}
function deskOf(run: RoleRun): Desk {
  const sec = (re: RegExp) => run.output.sections?.find((s) => re.test(s.heading))?.body ?? ''
  return { runId: run.id, at: run.created_at, now: linesOf(sec(/^now/i)), next: linesOf(sec(/^next/i)), parked: linesOf(sec(/^parked/i)), decisions: linesOf(sec(/^decision/i)) }
}

const greetingWord = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }
const dayLabel = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
const doneKey = (brand: string | undefined, runId: string) => `os.done.${brand ?? 'x'}.${runId}`
const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

export default function OsHome() {
  const { current, brands, setCurrent } = useBrand()
  const nav = useNavigate()
  const [roles, setRoles] = useState<Role[]>([])
  const [jobs, setJobs] = useState<RoleJob[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [desk, setDesk] = useState<Desk | null>(null)
  const [ready, setReady] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'greet' | 'list'>('idle')
  const [rail, setRail] = useState(true)
  const [open, setOpen] = useState<string | null>(null)
  const [ticked, setTicked] = useState<Record<string, boolean>>({})
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

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
        const run = (await listRunsFor([chief.id])).find((r) => r.id === deskJob.run_id)
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

  /* Greeting in once the day is known; the feed takes focus after the hold. */
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
  const tasks = desk ? desk.now.length + desk.next.length : active.length
  const chiefName = chief?.name ?? 'Chief of staff'

  function tick(id: string) {
    if (!desk) return
    const next = { ...ticked, [id]: !ticked[id] }
    setTicked(next); localStorage.setItem(doneKey(current?.id, desk.runId), JSON.stringify(next))
  }
  async function decide(j: RoleJob, approval: 'approved' | 'declined') {
    if (!demo) await decideJob(j.id, approval)
    setJobs((l) => l.map((x) => (x.id === j.id ? { ...x, approval, reviewed_at: new Date().toISOString() } : x)))
  }
  async function donePriority(p: Priority) {
    if (!demo) await updatePriority(p.id, { status: 'done' })
    setPriorities((l) => l.map((x) => (x.id === p.id ? { ...x, status: 'done' } : x)))
  }
  async function send() {
    const t = text.trim()
    if (!t || busy) return
    if (demo) { setText(''); setNote(`Sample day: in the live app this goes to ${chiefName}.`); setTimeout(() => setNote(null), 5000); return }
    if (!leads.length) { setNote('Hire a department first, there is no one to brief.'); return }
    setBusy(true); setNote(null)
    const r = await sendBriefing(t, leads)
    setBusy(false)
    if (r.error) { setNote(r.error); return }
    setText('')
    setNote(chief ? `With ${chiefName}. The desk rewrites itself when the replies land.` : `Sent to ${leads.length} leads.`)
    setTimeout(() => setNote(null), 6000)
    pull().catch(() => {})
  }
  const answer = (line: string) => { setText(`Decision on "${line.slice(0, 80)}": `); inputRef.current?.focus() }
  const title = (j: RoleJob) => j.task.replace(/^(ROUTE|DESK|MEETING|IMAGES):\s*/, '').split('\n')[0]
  const leadOf = (j: RoleJob) => roles.find((r) => r.id === j.role_id)?.name ?? deptOf(j.dept)?.name ?? 'Team'

  const railItems = useMemo(() => [
    { key: 'today', label: 'Today', icon: I.home, on: true, go: () => {} },
    { key: 'chat', label: 'Chat', icon: I.chat, go: () => inputRef.current?.focus() },
    { key: 'teams', label: 'Teams', icon: I.team, go: () => nav('/team') },
    { key: 'create', label: 'Create', icon: I.create, go: () => nav('/create') },
    { key: 'clients', label: 'Clients', icon: I.clients, go: () => nav('/clients') },
  ], [nav])

  const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join('').replace('&', '').slice(0, 2).toUpperCase()

  return (
    <div className="os" data-phase={phase} onClick={skip}>
      <header className="os-top">
        <div className="os-top-left">
          <button className="os-icon" aria-label="Menu" aria-pressed={rail} onClick={(e) => { e.stopPropagation(); setRail((v) => !v) }}>{I.menu}</button>
        </div>
        <div className="os-ws" role="tablist" aria-label="Workspaces" onClick={(e) => e.stopPropagation()}>
          {brands.map((b) => {
            const src = tileFor(b)
            return (
              <button key={b.id} role="tab" aria-selected={b.id === current?.id} title={b.name} className="os-ws-tile" data-on={b.id === current?.id ? '1' : undefined}
                style={src ? undefined : { background: b.accent_color || undefined }}
                onClick={() => { if (b.id === current?.id) return; setCurrent(b.id); setPhase('idle'); setReady(false); setDesk(null) }}>
                {src ? <img src={src} alt="" /> : initials(b.name)}
              </button>
            )
          })}
        </div>
        <div className="os-top-right">
          <button className="os-icon" aria-label={`${approvals.length} waiting for you`} onClick={(e) => { e.stopPropagation(); setPhase('list'); listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
            {I.bell}{approvals.length > 0 && <span className="os-badge">{approvals.length}</span>}
          </button>
        </div>
      </header>

      <nav className="os-rail" data-hidden={rail ? undefined : '1'} aria-label="Areas" onClick={(e) => e.stopPropagation()}>
        {railItems.map((r) => (
          <button key={r.key} className="os-rail-item" data-on={r.on ? '1' : undefined} onClick={r.go}>{r.icon}<span>{r.label}</span></button>
        ))}
      </nav>

      <div className="os-stage">
        <div className="os-col">
          <div className="os-greet" aria-hidden={phase === 'list'}>
            <h1>{greetingWord()} <b>{FOUNDER}</b>, you have {n(tasks, 'task', 'tasks')} and {n(approvals.length, 'approval', 'approvals')} today</h1>
          </div>

          <div className="os-list" ref={listRef} aria-hidden={phase !== 'list'}>
            <div className="os-day">
              <span><b>{greetingWord()}, {FOUNDER}.</b> {dayLabel()}</span>
              <span>{working.length ? `${n(working.length, 'piece', 'pieces')} of work in flight` : ''}</span>
            </div>

            {approvals.map((j) => (
              <Msg key={j.id} who={leadOf(j)} dept={j.dept}
                text={<>I have <b>{title(j)}</b> ready. It goes out when you approve it.</>}
                chips={<><button className="os-chip" data-primary="1" onClick={() => void decide(j, 'approved')}>Approve</button><button className="os-chip" onClick={() => void decide(j, 'declined')}>Decline</button><button className="os-chip" onClick={() => nav(`/team/${j.dept}?job=${j.id}`)}>Take a look</button></>} />
            ))}

            {desk?.decisions.map((l, i) => (
              <Msg key={`dec${i}`} who={chiefName} dept="founder" text={<>A decision is waiting on you: {l.text}</>}
                chips={<button className="os-chip" data-primary="1" onClick={() => answer(l.text)}>Answer</button>} />
            ))}

            {desk && (desk.now.length > 0 || desk.next.length > 0) && (
              <Msg who={chiefName} dept="founder" text={desk.now[0] ? <>First thing today: <b>{desk.now[0].text}</b>.</> : <>Your desk for today.</>}
                lines={[...desk.now.slice(1).map((l, i) => ({ id: `now${i + 1}`, ...l })), ...desk.next.map((l, i) => ({ id: `next${i}`, ...l }))].map((l) => ({ key: l.id, text: l.text, tag: l.tag, done: !!ticked[l.id], onClick: () => tick(l.id) }))}
                chips={desk.now[0] ? <button className="os-chip" data-primary={ticked.now0 ? undefined : '1'} onClick={() => tick('now0')}>{ticked.now0 ? 'Done, undo' : 'Done'}</button> : undefined} />
            )}

            {active.length > 0 && (
              <Msg who={chiefName} dept="founder" text={<>Your priorities, in order. Open one for the context.</>}
                lines={active.slice(0, 5).map((p, i) => ({ key: p.id, num: i + 1, text: p.title, tag: deptOf(p.dept)?.name, onClick: () => setOpen(open === p.id ? null : p.id) }))}
                detail={open && active.some((p) => p.id === open) ? (
                  <div className="os-detail">
                    {active.find((p) => p.id === open)?.detail || 'No detail yet.'}
                    <div className="os-chips" style={{ marginTop: 10 }}>
                      <button className="os-chip" onClick={() => nav(`/team?priority=${open}`)}>Open in Teams</button>
                      <button className="os-chip" onClick={() => { const p = active.find((x) => x.id === open); if (p) void donePriority(p); setOpen(null) }}>Mark done</button>
                    </div>
                  </div>
                ) : undefined} />
            )}

            {working.map((j) => (
              <Msg key={j.id} who={leadOf(j)} dept={j.dept} quiet text={<>I'm working on <b>{title(j)}</b>. I'll bring it to you when it's ready.</>} />
            ))}

            {desk && desk.parked.length > 0 && (
              <Msg who={chiefName} dept="founder" quiet text={<>Parked, so nothing is lost:</>} lines={desk.parked.map((l, i) => ({ key: `park${i}`, text: l.text }))} />
            )}

            {approvals.length === 0 && !desk && active.length === 0 && working.length === 0 && (
              <div className="os-empty">Quiet so far. Tell {chiefName} what matters and the day fills in.</div>
            )}
          </div>
        </div>
      </div>

      {note && <div className="os-compose-note" role="status">{note}</div>}
      <form className="os-compose" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); void send() }}>
        <label className="os-compose-copy">
          <small>Ask me anything</small>
          <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="What can I help you with today?" />
        </label>
        <button type="submit" className="os-send" disabled={busy || !text.trim()} aria-label="Send">{I.arrow}</button>
      </form>
    </div>
  )
}

interface MsgLine { key: string; text: string; tag?: string; num?: number; done?: boolean; onClick?: () => void }

function Msg({ who, dept, text, lines, chips, detail, quiet }: { who: string; dept?: string | null; text: ReactNode; lines?: MsgLine[]; chips?: ReactNode; detail?: ReactNode; quiet?: boolean }) {
  return (
    <article className="os-msg" data-quiet={quiet ? '1' : undefined} onClick={(e) => e.stopPropagation()}>
      <img className="os-msg-avatar" src={avatarFor(dept)} alt="" />
      <div className="os-msg-body">
        <h3>{who}:</h3>
        <p>{text}</p>
        {lines && lines.length > 0 && (
          <ul className="os-lines">
            {lines.map((l) => (
              <li key={l.key} data-done={l.done ? '1' : undefined} onClick={l.onClick} style={l.onClick ? undefined : { cursor: 'default' }}>
                {l.num ? <i>{l.num}</i> : null}<span>{l.text}</span>{l.tag && <small>{l.tag}</small>}
              </li>
            ))}
          </ul>
        )}
        {detail}
        {chips && <div className="os-chips">{chips}</div>}
      </div>
    </article>
  )
}

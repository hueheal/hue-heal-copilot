import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useBrand } from '../lib/brandContext'
import { listRoles, listWorkspaceJobs, decideJob, latestBriefing, briefingJobs, sendBriefing, assignJob, listRunsFor, type Role, type RoleJob, type RoleRun, type Briefing } from '../lib/roles'
import { listPriorities, type Priority } from '../lib/priorities'
import { isSupabaseConfigured } from '../lib/supabase'
import { readSkin, saveSkin, type Skin } from '../lib/osSkin'
import MemberLayer, { GROUP_SLT, type LayerDemo } from '../components/os/MemberLayer'
import '../styles/os.css'

/* ============================================================
   Company OS — draft home, to the founder's Figma frames
   (Copilot 8-179 and 16-176). The greeting speaks first and
   scrolls away; the day arrives as one-sentence messages, each
   from one team member. Open any of them and you are in a single
   chat with that member: your history and their task list. The
   composer at the bottom talks to whoever is in front of you.
   ============================================================ */

/* Until profiles carry a display name. */
const FOUNDER = 'Maria'
const GREET_HOLD_MS = 3600

interface Line { text: string; tag?: string }
interface Desk { runId: string; now: Line[]; next: Line[]; parked: Line[]; decisions: Line[]; at: string }

const ago = (h: number) => new Date(Date.now() - h * 3600000).toISOString()

/* Sample day for local mode and ?demo, so the draft can be judged before a
   chief has written a real desk. Nothing here is saved. */
const DEMO = {
  roles: [
    { id: 'd-chief', key: 'chief', name: 'Chief of staff', title: 'Founder office', seat: 'lead', enabled: true, dept: 'founder' },
    { id: 'd-growth', key: 'growth', name: 'Head of Growth', title: 'Marketing, offers and content', seat: 'lead', enabled: true, dept: 'growth' },
    { id: 'd-finance', key: 'finance', name: 'Head of Finance', title: 'Cash, forecasts and funding', seat: 'lead', enabled: true, dept: 'finance' },
    { id: 'd-partner', key: 'partnerships', name: 'Head of Partnerships', title: 'Universities, practitioners, distribution', seat: 'lead', enabled: true, dept: 'partnerships' },
    { id: 'd-counsel', key: 'counsel', name: 'Counsel', title: 'Legal and compliance', seat: 'lead', enabled: true, dept: 'counsel' },
    { id: 'd-editor', key: 'editor', name: 'Editor-in-chief', title: 'Journal, newsletters, voice', seat: 'member', enabled: true, dept: 'growth' },
    { id: 'd-social', key: 'social', name: 'Social strategist', title: 'Instagram and short form', seat: 'member', enabled: true, dept: 'growth' },
  ] as unknown as Role[],
  jobs: [
    { id: 'd-j1', role_id: 'd-growth', dept: 'growth', task: 'Two Instagram posts for the sleep ritual launch', status: 'done', approval: 'pending', created_at: ago(3) },
    { id: 'd-j2', role_id: 'd-finance', dept: 'finance', task: 'Funding for 2027: investor update email', status: 'done', approval: 'pending', created_at: ago(5) },
    { id: 'd-j3', role_id: 'd-partner', dept: 'partnerships', task: 'Pilot tester outreach: universities shortlist', status: 'running', approval: 'none', created_at: ago(1) },
    { id: 'd-j4', role_id: 'd-growth', dept: 'growth', task: 'Freemium to premium pricing outline', status: 'done', approval: 'approved', created_at: ago(30) },
    { id: 'd-j5', role_id: 'd-growth', dept: 'growth', task: 'Sleep ritual hero images in the premium editorial style', status: 'done', approval: 'approved', created_at: ago(52), run_id: 'd-r5' },
    { id: 'd-j6', role_id: 'd-growth', dept: 'growth', task: 'Draft the October content calendar', status: 'running', approval: 'none', created_at: ago(0.4), plan: { approach: 'team', assignments: [{ to: 'Editor-in-chief', brief: 'Journal pieces' }, { to: 'Social strategist', brief: 'Posts' }] } },
    { id: 'd-j7', role_id: 'd-finance', dept: 'finance', task: 'Reconcile September card spend', status: 'failed', approval: 'none', error: 'Xero is not connected yet', created_at: ago(9), finished_at: ago(8.8) },
  ] as unknown as RoleJob[],
  runs: {
    'd-growth': [
      { id: 'd-r5', role_id: 'd-growth', task: 'Sleep ritual hero images', output: { title: 'Sleep ritual hero images', brief: 'Four candidates rendered in the editorial style; two are strong. Keep the ones you like and I file them to the site.', summary: '', sections: [], actions: [], needs: [{ title: 'Higgsfield credits topped up to 500', detail: '' }] }, created_at: ago(50) },
      { id: 'd-r1', role_id: 'd-growth', task: 'Freemium to premium pricing outline', output: { title: 'Pricing outline', summary: 'Free tier keeps the library and one ritual; Remedae+ at £6.99 a month unlocks all rituals, practitioner Shorts and reminders. A founding rate of £4.99 for the first 100 pilot testers.', sections: [], actions: [] }, created_at: ago(28) },
      { id: 'd-r2', role_id: 'd-growth', task: 'Two Instagram posts for the sleep ritual launch', output: { title: 'Sleep ritual launch posts', summary: 'Two carousels: one on the evening tea ritual, one on the 4-7-8 breath. Both use our own renders, captions in the plain voice, no claims Counsel has flagged.', sections: [], actions: [] }, created_at: ago(3) },
    ],
    'd-finance': [
      { id: 'd-r3', role_id: 'd-finance', task: 'Funding for 2027: investor update email', output: { title: 'Funding for 2027', summary: 'A short update to the three advisors: pilot numbers, the £48k runway position, and the ask for warm introductions before the October round conversations.', sections: [], actions: [] }, created_at: ago(5) },
    ],
    'd-chief': [
      { id: 'd-r4', role_id: 'd-chief', task: 'DESK: today', output: { title: 'Your desk', summary: 'One thing first: approve the pricing outline so Growth can write the paywall copy. Then Counsel\'s rewrites and the reference frames. Two items parked.', sections: [], actions: [] }, created_at: ago(2) },
    ],
  } as Record<string, RoleRun[]>,
  briefing: { id: 'd-b1', text: 'Remedae is at pilot stage. Coverage first so testers stop hitting a search wall, then the universities list, then pricing. Counsel\'s rewrites still outrank everything.', source: 'studio', created_at: ago(26) } as Briefing,
  briefingJobs: [
    { id: 'd-bj1', role_id: 'd-chief', dept: 'founder', task: 'ROUTE: Remedae is at pilot stage…', status: 'done', approval: 'none', created_at: ago(26), run_id: 'd-r4', briefing_id: 'd-b1' },
    { id: 'd-bj2', role_id: 'd-growth', dept: 'growth', task: 'Coverage and pricing', status: 'done', approval: 'none', created_at: ago(25.5), run_id: 'd-r1', briefing_id: 'd-b1' },
    { id: 'd-bj3', role_id: 'd-partner', dept: 'partnerships', task: 'Universities list', status: 'running', approval: 'none', created_at: ago(25.5), briefing_id: 'd-b1' },
  ] as unknown as RoleJob[],
  priorities: [
    { id: 'd-p1', position: 1, title: 'Answer Counsel\'s ten rewrites', detail: 'Ten claims on the site need softer wording before pilot week 6.', dept: 'counsel', status: 'active', due: null },
    { id: 'd-p2', position: 2, title: 'Original imagery live on the site', detail: 'Replace every stock frame with our own renders.', dept: 'growth', status: 'active', due: null },
    { id: 'd-p3', position: 3, title: 'Pilot testers and practitioners', detail: 'Universities first, then practitioners.', dept: 'partnerships', status: 'active', due: null },
  ] as unknown as Priority[],
  desk: {
    runId: 'demo', at: ago(2),
    now: [{ text: 'approve the pricing outline so Growth can write the paywall copy', tag: 'Priority 4' }],
    next: [{ text: 'answer Counsel\'s ten rewrites in one sitting', tag: 'Priority 1' }, { text: 'drop the five reference frames into the site so renders match the guide', tag: 'Priority 2' }],
    parked: [{ text: 'the paid safety review until pilot week 6' }, { text: 'the founding creator offer until pricing lands' }],
    decisions: [{ text: 'keep the pilot at 100 testers or open it to 250? My default: 100 until week 6.' }],
  } as Desk,
}

const DEMO_BRIEFS: Record<string, string> = {
  'd-j1': 'I have two Instagram posts for the sleep ritual launch ready. They go out when you approve them.',
  'd-j2': 'I have drafted the email titled "Funding for 2027" to the three advisors. Take a look before it goes.',
}

/* ---- Icons ---- */
const I = {
  menu: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>,
  arrow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
}

/* Workspace tiles: the brand's own logo when it has one, else the frame's tiles. */
const TILE: Record<string, string> = { 'hue & heal': '/os/ws-hh.png', remedae: '/os/ws-remedae.png', 'mazzi summer showdown': '/os/ws-showdown.png' }
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
const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`
const lower = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s)
const stripPrefix = (task: string) => task.replace(/^(ROUTE|DESK|MEETING|IMAGES):\s*/, '').split('\n')[0]

interface Card { key: string; role: Role; text: ReactNode; chips?: ReactNode; quiet?: boolean }

export default function OsHome() {
  const { current, brands, setCurrent } = useBrand()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [roles, setRoles] = useState<Role[]>([])
  const [jobs, setJobs] = useState<RoleJob[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [desk, setDesk] = useState<Desk | null>(null)
  const [briefs, setBriefs] = useState<Record<string, string>>({})
  const [ready, setReady] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'greet' | 'list'>('idle')
  const [menu, setMenu] = useState(false)
  const [skin, setSkin] = useState<Skin>(() => readSkin())
  const toggleSkin = () => setSkin((s) => { const n = s === 'graphite' ? 'sand' : 'graphite'; saveSkin(n); return n })
  const [ticked, setTicked] = useState<Record<string, boolean>>({})
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const demo = !isSupabaseConfigured || params.has('demo')
  const withId = params.get('with')
  const group = withId === GROUP_SLT ? GROUP_SLT : undefined
  const member = withId && !group ? roles.find((r) => r.id === withId) ?? null : null
  const layerOpen = !!group || !!member
  const openChat = (r: Role | string) => { params.set('with', typeof r === 'string' ? r : r.id); setParams(params); setPhase('list'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const closeChat = () => { params.delete('with'); setParams(params) }

  async function pull() {
    if (demo) { setRoles(DEMO.roles); setJobs((j) => (j.length ? j : DEMO.jobs)); setPriorities(DEMO.priorities); setDesk(DEMO.desk); return }
    const [rs, js, ps, b] = await Promise.all([listRoles(), listWorkspaceJobs(), listPriorities(), latestBriefing()])
    setRoles(rs); setJobs(js); setPriorities(ps)
    /* The two-line brief each seat wrote for the founder, by run. */
    const waiting = js.filter((j) => j.status === 'done' && j.approval === 'pending' && j.run_id)
    if (waiting.length) {
      const runs = await listRunsFor([...new Set(waiting.map((j) => j.role_id))])
      const map: Record<string, string> = {}
      for (const r of runs) { const b = (r.output?.brief || '').trim(); if (b) map[r.id] = b }
      setBriefs(map)
    }
    const chief = rs.find((r) => r.key === 'chief')
    if (chief && b) {
      const bj = await briefingJobs(b.id)
      const deskJob = [...bj].reverse().find((j) => j.role_id === chief.id && j.task.startsWith('DESK:') && j.status === 'done' && j.run_id)
      if (deskJob) {
        const run = (await listRunsFor([chief.id])).find((r) => r.id === deskJob.run_id)
        if (run) { const d = deskOf(run); setDesk(d); try { setTicked(JSON.parse(localStorage.getItem(`os.done.${current?.id}.${d.runId}`) ?? '{}')) } catch { /* fresh */ } }
      }
    }
  }
  useEffect(() => {
    let live = true
    pull().catch(() => {}).finally(() => { if (live) setReady(true) })
    const t = setInterval(() => { pull().catch(() => {}) }, 12000)
    return () => { live = false; clearInterval(t) }
  }, [current?.id])

  /* Greeting in once the day is known; it scrolls away after the hold and the feed arrives. */
  useEffect(() => {
    if (!ready || phase !== 'idle') return
    const t = setTimeout(() => setPhase(withId ? 'list' : 'greet'), 60)
    return () => clearTimeout(t)
  }, [ready, phase, withId])
  useEffect(() => {
    if (phase !== 'greet') return
    const t = setTimeout(() => setPhase('list'), GREET_HOLD_MS)
    return () => clearTimeout(t)
  }, [phase])
  const skip = () => { if (phase === 'greet') setPhase('list') }

  const chief = roles.find((r) => r.key === 'chief') ?? null
  const leads = roles.filter((r) => r.seat === 'lead' && r.enabled)
  const leadOfDept = (dept: string | null | undefined) => roles.find((r) => r.dept === dept && r.seat === 'lead') ?? chief
  const roleOf = (j: RoleJob) => roles.find((r) => r.id === j.role_id) ?? leadOfDept(j.dept)
  const approvals = jobs.filter((j) => j.status === 'done' && j.approval === 'pending')
  const working = jobs.filter((j) => j.status === 'queued' || j.status === 'running')
  const active = priorities.filter((p) => p.status === 'active')
  const tasks = (desk ? desk.now.length + desk.next.length : 0) + active.length

  function tick(id: string) {
    if (!desk) return
    const next = { ...ticked, [id]: !ticked[id] }
    setTicked(next); localStorage.setItem(`os.done.${current?.id}.${desk.runId}`, JSON.stringify(next))
  }
  async function decide(j: RoleJob, approval: 'approved' | 'declined') {
    if (!demo) await decideJob(j.id, approval)
    setJobs((l) => l.map((x) => (x.id === j.id ? { ...x, approval, reviewed_at: new Date().toISOString() } : x)))
  }
  /* The layer's composer: to one member, or to every lead at once. */
  async function sendTo(t: string): Promise<string | null> {
    if (group) {
      if (demo) return 'Sample day: in the live app every lead answers this.'
      if (!leads.length) return 'Hire a department first, there is no one to brief.'
      const r = await sendBriefing(t, leads)
      if (r.error) return r.error
      pull().catch(() => {})
      return chief ? `With ${chief.name}. Replies land here as they come.` : `Sent to ${leads.length} leads.`
    }
    if (!member) return null
    if (demo) { setJobs((l) => [{ id: `d-${Date.now()}`, role_id: member.id, dept: member.dept, task: t, status: 'running', approval: 'none', created_at: new Date().toISOString() } as unknown as RoleJob, ...l]); return `${member.name} has it.` }
    const r = await assignJob(member, t)
    if (r.error) return r.error
    if (r.job) setJobs((l) => [r.job as RoleJob, ...l])
    return `${member.name} has it.`
  }
  async function retry(j: RoleJob) {
    const r = roles.find((x) => x.id === j.role_id); if (!r) return
    if (demo) { setJobs((l) => l.map((x) => (x.id === j.id ? { ...x, status: 'running', error: null } : x))); return }
    const res = await assignJob(r, stripPrefix(j.task))
    if (res.job) setJobs((l) => [res.job as RoleJob, ...l])
  }
  const layerDemo: LayerDemo | undefined = demo ? { runs: DEMO.runs, briefing: DEMO.briefing, briefingJobs: DEMO.briefingJobs, images: [] } : undefined
  async function send() {
    const t = text.trim()
    if (!t || busy) return
    setBusy(true); setNote(null)
    try {
      if (member) {
        if (demo) {
          setJobs((l) => [{ id: `d-${Date.now()}`, role_id: member.id, dept: member.dept, task: t, status: 'running', approval: 'none', created_at: new Date().toISOString() } as unknown as RoleJob, ...l])
        } else {
          const r = await assignJob(member, t)
          if (r.error) { setNote(r.error); return }
          if (r.job) setJobs((l) => [r.job as RoleJob, ...l])
        }
        setText(''); setNote(`${member.name} has it.`)
      } else {
        if (demo) { setText(''); setNote(`Sample day: in the live app this goes to ${chief?.name ?? 'your chief of staff'}.`); return }
        if (!leads.length) { setNote('Hire a department first, there is no one to brief.'); return }
        const r = await sendBriefing(t, leads)
        if (r.error) { setNote(r.error); return }
        setText(''); setNote(chief ? `With ${chief.name}. The desk rewrites itself when the replies land.` : `Sent to ${leads.length} leads.`)
        pull().catch(() => {})
      }
    } finally { setBusy(false); setTimeout(() => setNote(null), 6000) }
  }
  const answer = (line: string) => { if (chief) openChat(chief); setText(`On "${line.slice(0, 60)}": `); setTimeout(() => inputRef.current?.focus(), 50) }

  /* The feed: one sentence, one member, one card. */
  const cards = useMemo<Card[]>(() => {
    const out: Card[] = []
    const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn() }
    for (const j of approvals) {
      const r = roleOf(j); if (!r) continue
      const brief = (j.run_id && briefs[j.run_id]) || (demo && DEMO_BRIEFS[j.id])
      out.push({ key: `a${j.id}`, role: r, text: brief ? brief : <>I have <b>{stripPrefix(j.task)}</b> ready. It goes out when you approve it.</>,
        chips: <><button className="os-chip" data-primary="1" onClick={stop(() => void decide(j, 'approved'))}>Approve</button><button className="os-chip" onClick={stop(() => void decide(j, 'declined'))}>Decline</button></> })
    }
    if (desk && chief) {
      for (const [i, l] of desk.decisions.entries()) out.push({ key: `d${i}`, role: chief, text: <>A decision is waiting on you: {lower(l.text)}</>, chips: <button className="os-chip" data-primary="1" onClick={stop(() => answer(l.text))}>Answer</button> })
      for (const [i, l] of desk.now.entries()) out.push({ key: `n${i}`, role: chief, text: <>First thing today: <b>{lower(l.text)}</b>.</>, quiet: !!ticked[`now${i}`], chips: <button className="os-chip" data-primary={ticked[`now${i}`] ? undefined : '1'} onClick={stop(() => tick(`now${i}`))}>{ticked[`now${i}`] ? 'Done, undo' : 'Done'}</button> })
      for (const [i, l] of desk.next.entries()) out.push({ key: `x${i}`, role: chief, text: <>Then, {lower(l.text)}.</>, quiet: !!ticked[`next${i}`], chips: <button className="os-chip" onClick={stop(() => tick(`next${i}`))}>{ticked[`next${i}`] ? 'Done, undo' : 'Done'}</button> })
    }
    for (const [i, p] of active.entries()) {
      const r = leadOfDept(p.dept); if (!r) continue
      out.push({ key: `p${p.id}`, role: r, text: <>Priority {i + 1} is <b>{lower(p.title)}</b>{p.detail ? `: ${lower(p.detail.split(/(?<=\.)\s/)[0])}` : '.'}</> })
    }
    for (const j of working) { const r = roleOf(j); if (r) out.push({ key: `w${j.id}`, role: r, quiet: true, text: <>I'm working on <b>{lower(stripPrefix(j.task))}</b> and will bring it to you when it's ready.</> }) }
    if (desk && chief && desk.parked.length) out.push({ key: 'park', role: chief, quiet: true, text: <>Parked for now: {desk.parked.map((l) => lower(l.text)).join('; ')}.</> })
    return out
  }, [approvals, working, active, desk, chief, roles, ticked, briefs])

  const menuItems = [
    { label: 'Marketing', go: () => nav('/create') },
    { label: 'Teams', go: () => nav('/team') },
    { label: 'Clients', go: () => nav('/clients') },
    { label: 'Approvals', go: () => { closeChat(); setMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }) } },
    { label: 'Settings', go: () => nav('/settings') },
    { label: skin === 'graphite' ? 'Sand skin' : 'Graphite skin', go: toggleSkin },
  ]
  const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join('').replace('&', '').slice(0, 2).toUpperCase()

  return (
    <div className="os" data-phase={phase} data-skin={skin} onClick={() => { skip(); setMenu(false) }}>
      <div className="os-sky" aria-hidden />
      <header className="os-top">
        <div className="os-top-left">
          <button className="os-icon" aria-label={menu ? 'Close menu' : 'Menu'} aria-expanded={menu} onClick={(e) => { e.stopPropagation(); setMenu((v) => !v) }}>{menu ? I.close : I.menu}</button>
        </div>
        <div className="os-ws" role="tablist" aria-label="Workspaces" onClick={(e) => e.stopPropagation()}>
          {brands.map((b) => {
            const src = tileFor(b)
            return (
              <button key={b.id} role="tab" aria-selected={b.id === current?.id} title={b.name} className="os-ws-tile" data-on={b.id === current?.id ? '1' : undefined}
                style={src ? undefined : { background: b.accent_color || undefined }}
                onClick={() => { if (b.id === current?.id) return; closeChat(); setCurrent(b.id); setPhase('idle'); setReady(false); setDesk(null); setJobs([]) }}>
                {src ? <img src={src} alt="" /> : initials(b.name)}
              </button>
            )
          })}
        </div>
        <div className="os-top-right">
          <button className="os-icon" data-round="1" aria-label={`${approvals.length} waiting for you`} onClick={(e) => { e.stopPropagation(); closeChat(); setPhase('list'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
            {I.bell}{approvals.length > 0 && <span className="os-badge">{approvals.length}</span>}
          </button>
        </div>
      </header>

      <nav className="os-menu" data-open={menu ? '1' : undefined} aria-label="Areas" aria-hidden={!menu} onClick={(e) => e.stopPropagation()}>
        {menuItems.map((m) => <button key={m.label} tabIndex={menu ? 0 : -1} onClick={() => { setMenu(false); m.go() }}>{m.label}</button>)}
      </nav>

      <div className="os-stage">
        <div className="os-col">
          {!layerOpen && (
            <div className="os-greet" aria-hidden={phase === 'list'}>
              <h1>{greetingWord()} <b>{FOUNDER}</b>, you have {n(tasks, 'task', 'tasks')} and {n(approvals.length, 'approval', 'approvals')} today</h1>
            </div>
          )}

          {layerOpen ? (
            <MemberLayer key={withId ?? ''} role={member} group={group} roles={roles} jobs={jobs} avatarFor={avatarFor} demo={layerDemo} skin={skin}
              onSelect={openChat} onClose={closeChat} onDecide={(j, a) => void decide(j, a)} onRetry={(j) => void retry(j)} onSend={sendTo} />
          ) : (
            <div className="os-list" aria-hidden={phase !== 'list'}>
              {skin === 'graphite' && leads.length > 0 && (
                <div className="os-bots">
                  {leads.map((r) => {
                    const st = jobs.some((j) => j.role_id === r.id && j.status === 'done' && j.approval === 'pending') ? 'approval' : jobs.some((j) => j.role_id === r.id && (j.status === 'queued' || j.status === 'running')) ? 'working' : 'idle'
                    return (
                      <button key={r.id} className="os-bot" onClick={(e) => { e.stopPropagation(); openChat(r) }}>
                        <img src={avatarFor(r.dept)} alt="" /><i data-state={st} />
                        <span>{r.name}<small>{st === 'approval' ? 'Needs you' : st === 'working' ? 'Working' : r.title}</small></span>
                      </button>
                    )
                  })}
                </div>
              )}
              {cards.map((c) => (
                <article key={c.key} className="os-msg" data-quiet={c.quiet ? '1' : undefined} onClick={(e) => { e.stopPropagation(); openChat(c.role) }}>
                  <img className="os-msg-avatar" src={avatarFor(c.role.dept)} alt="" />
                  <div className="os-msg-body">
                    <h3>{c.role.name}:</h3>
                    <p>{c.text}</p>
                    {c.chips && <div className="os-chips">{c.chips}</div>}
                  </div>
                </article>
              ))}
              {cards.length === 0 && <div className="os-empty">Quiet so far. Tell {chief?.name ?? 'your chief of staff'} what matters and the day fills in.</div>}
            </div>
          )}
        </div>
      </div>

      {!layerOpen && <div className="os-ground" aria-hidden />}
      {note && <div className="os-compose-note" role="status">{note}</div>}
      {!layerOpen && <form className="os-compose" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); void send() }}>
        <label className="os-compose-copy">
          <small>Ask me anything</small>
          <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="What can I help you with today?" />
        </label>
        <button type="submit" className="os-send" disabled={busy || !text.trim()} aria-label="Send">{I.arrow}</button>
      </form>}
    </div>
  )
}

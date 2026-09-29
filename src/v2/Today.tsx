import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Check, Circle } from '@phosphor-icons/react'
import { useLife, ApprovalCard, Section } from './V2App'
import { doneTask, isNew, isUrgent, latestRuns, listEvents, listOpportunities, listPipeline, listTasks, listTeamApprovals, makeNow, shortDate, timeOf, daysUntil, type LifeEvent, type LifeTask, type Opportunity, type PipelineItem, type RadarBrief, type TeamApproval } from './life'

/* Today: the greeting frosts in and settles into the headline, then the
   day in the order you would act on it. One column, one thing at a time. */

const GREET_MS = 3200
const hello = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }

export default function Today() {
  const { profile, inLens, colorOf, nameOf, version, bump, pending, decide, prefill, lens } = useLife()
  const loc = useLocation()
  const [tasks, setTasks] = useState<LifeTask[] | null>(null)
  const [events, setEvents] = useState<LifeEvent[]>([])
  const [pipe, setPipe] = useState<PipelineItem[]>([])
  const [team, setTeam] = useState<TeamApproval[]>([])
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [brief, setBrief] = useState<RadarBrief | null>(null)
  const [phase, setPhase] = useState<'in' | 'settled'>(() => (sessionStorage.getItem('v2.greeted') ? 'settled' : 'in'))

  useEffect(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const end = new Date(); end.setHours(23, 59, 59, 999)
    void Promise.all([listTasks(), listEvents(start.toISOString(), end.toISOString()), listPipeline(), listTeamApprovals(), listOpportunities(), latestRuns()])
      .then(([t, e, p, j, o, r]) => { setTasks(t); setEvents(e); setPipe(p); setTeam(j); setOpps(o); setBrief(r.briefed?.brief ?? null) })
  }, [version])

  useEffect(() => {
    if (phase === 'settled') return
    const t = window.setTimeout(() => { setPhase('settled'); sessionStorage.setItem('v2.greeted', '1') }, GREET_MS)
    return () => window.clearTimeout(t)
  }, [phase])
  useEffect(() => { if (loc.hash === '#needs-you') { setPhase('settled'); window.setTimeout(() => document.getElementById('needs-you')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60) } }, [loc.hash])

  const mine = useMemo(() => (tasks ?? []).filter((t) => inLens(t.brand_id)), [tasks, inLens])
  const now = mine.find((t) => t.is_now) ?? mine[0]
  const next = mine.filter((t) => t.id !== now?.id).slice(0, 3)
  const todayEvents = events.filter((e) => inLens(e.brand_id))
  const approvals = pending.filter((a) => inLens(a.brand_id))
  const teamHere = team.filter((j) => inLens(j.brand_id))
  const due = pipe.filter((p) => inLens(p.brand_id) && p.kind !== 'tender' && p.next_step && (daysUntil(p.next_due) ?? 99) <= 7).slice(0, 4)
  const liveOpps = opps.filter((o) => (o.status === 'open' || o.status === 'watching') && (o.fit ?? 0) >= 3)
  const fresh = liveOpps.filter(isNew).length
  const urgent = liveOpps.filter(isUrgent).length
  const waiting = approvals.length + teamHere.length
  const things = (now ? 1 : 0) + next.length

  const complete = async (t: LifeTask) => { setTasks((l) => (l ?? []).filter((x) => x.id !== t.id)); await doneTask(t.id); bump() }
  const promote = async (t: LifeTask) => { await makeNow(t.id); bump() }
  const name = profile.display_name || 'there'

  return (
    <div className="v2-col v2-today" data-phase={phase}>
      <h1 className="v2-greet">
        {hello()} <b>{name}</b>, {things === 0 ? 'your day is clear' : `you have ${things} ${things === 1 ? 'thing' : 'things'}`}{waiting ? ` and ${waiting} ${waiting === 1 ? 'approval' : 'approvals'}` : ''} today
      </h1>

      <div className="v2-day">
        <section className="v2-north">
          {profile.mission
            ? <p className="v2-mission">{profile.mission}</p>
            : <p className="v2-mission v2-mission-empty"><Link to="/v2/plan">Write your mission.</Link> It is the line everything else answers to.</p>}
          {profile.weekly_focus && <p className="v2-focus"><span>This week</span>{profile.weekly_focus}</p>}
        </section>

        <section className="v2-now" aria-label="Now">
          {tasks === null ? <div className="v2-skeleton" style={{ height: 96 }} /> : now ? (
            <>
              <div className="v2-now-main">
                <button className="v2-tick" aria-label={`Mark done: ${now.title}`} onClick={() => void complete(now)}><Check size={16} weight="bold" /></button>
                <div>
                  <h2>{now.title}</h2>
                  <span className="v2-meta"><i style={{ background: colorOf(now.brand_id) }} />{nameOf(now.brand_id)}{now.due ? `, due ${shortDate(now.due)}` : ''}</span>
                </div>
              </div>
              {next.length > 0 && (
                <ul className="v2-next">
                  {next.map((t) => (
                    <li key={t.id}>
                      <button className="v2-tick" data-small="1" aria-label={`Mark done: ${t.title}`} onClick={() => void complete(t)}><Check size={12} weight="bold" /></button>
                      <span>{t.title}</span>
                      <button className="v2-link" onClick={() => void promote(t)}>Do first</button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="v2-now-empty">
              <h2>Nothing on your list.</h2>
              <button className="v2-chip" onClick={() => prefill('Plan my day: ')}>Plan my day</button>
            </div>
          )}
        </section>

        <Section label={todayEvents.length ? `Today, ${todayEvents.length} in the calendar` : 'Today'} aside={<Link className="v2-link" to="/v2/calendar">Calendar <ArrowRight size={13} /></Link>}>
          {todayEvents.length ? (
            <ol className="v2-timeline">
              {todayEvents.map((e) => {
                const past = new Date(e.ends_at ?? e.starts_at).getTime() < Date.now()
                return (
                  <li key={e.id} data-past={past ? '1' : undefined} style={{ ['--c' as never]: colorOf(e.brand_id) }}>
                    <time>{e.all_day ? 'All day' : timeOf(e.starts_at)}</time>
                    <b>{e.title}</b>
                    {e.location && <span>{e.location}</span>}
                  </li>
                )
              })}
            </ol>
          ) : <p className="v2-quiet">Nothing booked. {profile.calendar_ics ? '' : <Link to="/v2/calendar">Connect your Outlook calendar</Link>}</p>}
        </Section>

        {(approvals.length > 0 || teamHere.length > 0) && (
          <Section label="Needs you" id="needs-you">
            <div className="v2-stack">
              {approvals.map((a) => <ApprovalCard key={a.id} a={a} onDecide={decide} />)}
              {teamHere.length > 0 && (
                <Link className="v2-teamline" to="/os?with=slt">
                  <span>{teamHere.length === 1 ? `From the team, ready for your approval: ${cleanTask(teamHere[0].task)}` : `${teamHere.length} pieces from the team are ready for your approval`}</span>
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </Section>
        )}

        <div className="v2-pair">
          <Section label="Next steps this week" aside={<Link className="v2-link" to="/v2/pipeline">Pipeline <ArrowRight size={13} /></Link>}>
            {due.length ? (
              <ul className="v2-rows">
                {due.map((p) => (
                  <li key={p.id}>
                    <Circle size={9} weight="fill" color={colorOf(p.brand_id)} aria-hidden />
                    <span><b>{p.next_step}</b><small>{p.org || p.title}{p.next_due ? `, ${shortDate(p.next_due)}` : ''}</small></span>
                  </li>
                ))}
              </ul>
            ) : <p className="v2-quiet">No follow-ups due. {lens === 'all' ? 'The pipeline is quiet this week.' : ''}</p>}
          </Section>
          <Section label="Opportunity radar" aside={<Link className="v2-link" to="/v2/radar">Open <ArrowRight size={13} /></Link>}>
            {brief?.priorities.length ? (
              <>
                <p className="v2-big-number">{liveOpps.length}<span>live{fresh ? `, ${fresh} new` : ''}{urgent ? `, ${urgent} closing this week` : ''}</span></p>
                <ol className="v2-rows v2-today-pri">
                  {brief.priorities.slice(0, 2).map((p, i) => <li key={i}><span><b>{p.text}</b></span></li>)}
                </ol>
              </>
            ) : <p className="v2-quiet">{liveOpps.length ? `${liveOpps.length} live opportunities.` : 'Nothing above the bar yet.'} The engine scans at 6.30 and 13.30.</p>}
          </Section>
        </div>
      </div>
    </div>
  )
}

const cleanTask = (t: string) => t.replace(/^(ROUTE|DESK|MEETING|IMAGES):\s*/, '').split('\n')[0].slice(0, 80)

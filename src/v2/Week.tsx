import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowsClockwise, Check, Plus, X } from '@phosphor-icons/react'
import { useLife } from './V2App'
import { listPlans, live, planAction, savePlan, type ContentPlan, type PlanItem } from './life'

/* The week's content plan. Friday is planning day: the digest proposes next
   week's posts, Journal pieces and newsletters for each company, from the
   research and what is buzzing, weighed against each brand's strategy. Here
   the founder keeps, drops and edits items, adds notes, asks for a rework,
   and approves. Monday is action mode: each day's digest posts follow the
   plan, and the Journal and newsletter items become dated tasks. */

const COMPANIES = ['Hue & Heal', 'Remedae', 'Moss Island']
const CHANNEL: Record<PlanItem['channel'], string> = { instagram: 'Instagram', journal: 'Journal', newsletter: 'Newsletter' }
const dayName = (d: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`))
const addDays = (d: string, n: number) => new Date(new Date(`${d}T12:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10)

export default function Week() {
  const { brands } = useLife()
  const [plans, setPlans] = useState<ContentPlan[] | null>(null)
  const [pick, setPick] = useState(0)
  const [items, setItems] = useState<PlanItem[]>([])
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState<'rework' | 'approve' | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    const p = await listPlans()
    setPlans(p)
  }, [])
  useEffect(() => { void load() }, [load])
  const plan = plans?.[pick] ?? null
  useEffect(() => { setItems(plan?.items ?? []); setNotes(plan?.input ?? '') }, [plan?.id, plan?.updated_at])

  const colour = (co: string) => brands.find((b) => b.name === co)?.accent_color || 'var(--accent)'
  const days = useMemo(() => (plan ? [0, 1, 2, 3, 4].map((n) => addDays(plan.week_start, n)) : []), [plan])
  const change = (id: string, patch: Partial<PlanItem>) => {
    const next = items.map((it) => (it.id === id ? { ...it, ...patch } : it))
    setItems(next)
    if (plan) void savePlan(plan.id, { items: next })
  }
  const add = (day: string, company: string) => {
    const it: PlanItem = { id: Math.random().toString(36).slice(2, 10), day, company, channel: 'instagram', format: 'single', topic: '', angle: '', why_now: '', pillar: '', sources: [], keep: true }
    const next = [...items, it]
    setItems(next)
    if (plan) void savePlan(plan.id, { items: next })
  }
  const rework = async () => {
    if (!plan) return
    await savePlan(plan.id, { input: notes })
    setBusy('rework'); setNote('Reworking the plan with your notes. This takes about a minute.')
    const r = await planAction(plan.id, 'rework', notes)
    setBusy(null)
    setNote(r.error ?? 'Reworked. Have a look, then approve.')
    await load()
  }
  const approve = async () => {
    if (!plan) return
    await savePlan(plan.id, { items, input: notes })
    setBusy('approve')
    const r = await planAction(plan.id, 'approve')
    setBusy(null)
    setNote(r.error ?? r.note ?? 'Approved.')
    await load()
  }

  if (plans === null) return <div className="v2-col"><div className="v2-skeleton" style={{ height: 420 }} /></div>
  if (!plan) {
    return (
      <div className="v2-col v2-wide">
        <h1 className="v2-h-page">Week</h1>
        <p className="v2-radar-sub">Friday is planning day. Friday's digest proposes next week's posts, Journal pieces and newsletters for each company; you shape and approve them here, and from Monday each day's posts follow the plan.</p>
        <p className="v2-quiet">{live ? 'No plan yet. The first one arrives with Friday\'s digest.' : 'Sample mode: plans appear here once Copilot is connected.'}</p>
      </div>
    )
  }

  const kept = items.filter((x) => x.keep !== false).length
  return (
    <div className="v2-col v2-wide v2-week">
      <div className="v2-page-head">
        <h1 className="v2-h-page">Week of {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${plan.week_start}T12:00:00Z`))}</h1>
        <div className="v2-radar-status">
          <span className="v2-quiet">{plan.status === 'approved' ? (plan.auto_approved ? 'Running as proposed' : 'Approved') : 'Proposed, waiting for you'}</span>
          {plans.length > 1 && (
            <div className="v2-chips">{plans.map((p, i) => <button key={p.id} className="v2-chip" data-primary={i === pick ? '1' : undefined} onClick={() => setPick(i)}>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${p.week_start}T12:00:00Z`))}</button>)}</div>
          )}
        </div>
      </div>
      {plan.summary && <p className="v2-radar-sub">{plan.summary}</p>}
      {note && <p className="v2-quiet" role="status">{note}</p>}

      <div className="v2-week-days">
        {days.map((day) => (
          <section key={day} className="v2-week-day">
            <h2 className="v2-label">{dayName(day)}</h2>
            {COMPANIES.map((co) => {
              const list = items.filter((it) => it.day === day && it.company === co)
              return (
                <div key={co} className="v2-week-co">
                  <span className="v2-meta"><i style={{ background: colour(co) }} />{co}</span>
                  {list.map((it) => (
                    <article key={it.id} className="v2-glass v2-week-item" data-drop={it.keep === false ? '1' : undefined}>
                      <div className="v2-week-item-top">
                        <span className="v2-fine">{CHANNEL[it.channel]}{it.format ? `, ${it.format}` : ''}{it.pillar ? ` · ${it.pillar}` : ''}</span>
                        <button className="v2-x" aria-label={it.keep === false ? `Keep ${it.topic}` : `Drop ${it.topic}`} title={it.keep === false ? 'Keep it' : 'Drop it'} onClick={() => change(it.id, { keep: it.keep === false })}>{it.keep === false ? <Plus size={11} /> : <X size={11} />}</button>
                      </div>
                      <input name={`topic-${it.id}`} aria-label="Topic" autoComplete="off" value={it.topic} placeholder="The piece in one line" onChange={(e) => setItems(items.map((x) => (x.id === it.id ? { ...x, topic: e.target.value } : x)))} onBlur={() => plan && void savePlan(plan.id, { items })} />
                      <textarea name={`angle-${it.id}`} aria-label="Angle" rows={2} value={it.angle} placeholder="The angle" onChange={(e) => setItems(items.map((x) => (x.id === it.id ? { ...x, angle: e.target.value } : x)))} onBlur={() => plan && void savePlan(plan.id, { items })} />
                      {it.why_now && <p className="v2-fine">Why now: {it.why_now}</p>}
                      {!!it.sources.length && <p className="v2-fine">{it.sources.map((s, i) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer">{i ? ', ' : ''}{s.title || 'Source'}</a>)}</p>}
                    </article>
                  ))}
                  <button className="v2-link" onClick={() => add(day, co)}><Plus size={12} />Add</button>
                </div>
              )
            })}
          </section>
        ))}
      </div>

      <section className="v2-glass v2-digest-panel v2-week-notes">
        <h2 className="v2-label">Your notes for the week</h2>
        <textarea name="plan-notes" rows={4} value={notes} placeholder="What do you want more or less of? For example: more on the Glasgow bathhouse story, lead Moss Island with Bonfire Night, no Remedae women's health this week." onChange={(e) => setNotes(e.target.value)} onBlur={() => void savePlan(plan.id, { input: notes })} />
        <div className="v2-chips">
          <button className="v2-chip" disabled={!!busy} onClick={() => void rework()}><ArrowsClockwise size={15} className={busy === 'rework' ? 'v2-spin' : undefined} />{busy === 'rework' ? 'Reworking' : 'Rework with my notes'}</button>
          <button className="v2-chip" data-primary="1" disabled={!!busy || !kept} onClick={() => void approve()}><Check size={15} weight="bold" />{plan.status === 'approved' ? 'Save the changes' : `Approve ${kept} ${kept === 1 ? 'item' : 'items'}`}</button>
        </div>
        <p className="v2-fine">A rework uses the API (about 10p). Not approved by Monday morning, the plan runs as proposed.</p>
      </section>
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, ArrowSquareOut, ArrowsClockwise, CaretDown, ChatCircleText, Plus, X } from '@phosphor-icons/react'
import { useLife } from './V2App'
import { Editable } from './Plan'
import { isNew, isUpdated, isUrgent, latestRuns, listOpportunities, radarDecide, runRadar, shortDate, daysUntil, timeOf, live, type Opportunity, type RadarLane, type RadarRun, type RadarLens } from './life'

/* The Opportunity Radar: the daily interface of the Commercial Engine. At most
   three priorities, the verdict, then the four pipelines. Every card leads to
   an action; pursue, watch and pass (with a reason) teach the engine. */

const LANES: { key: RadarLane; label: string; section: string }[] = [
  { key: 'studio', label: 'Studio revenue', section: 'Tenders, RFPs and briefs' },
  { key: 'contracts', label: 'Founder contracts', section: 'Contracts and freelance' },
  { key: 'venture', label: 'Venture funding', section: 'Grants and product funding' },
  { key: 'outbound', label: 'Outbound', section: 'Outreach targets' },
]
type Tab = 'all' | RadarLane | 'watching' | 'lens'
const ACTION_LABEL: Record<string, string> = { pursue_now: 'Pursue now', outreach_now: 'Outreach now', partner: 'Partner', product_funding: 'Product funding', watch: 'Watch', pass: 'Pass' }
const ACTION_RANK: Record<string, number> = { pursue_now: 0, outreach_now: 0, partner: 1, product_funding: 1, watch: 2, pass: 3 }
const PASS_REASONS = ['Wrong sector', 'Too generic', 'Too small', 'Can\'t deliver it', 'Not now']
const CRITERIA: [keyof Opportunity['fit_detail'], string][] = [['sector', 'Sector'], ['scope', 'Design scope'], ['ambition', 'Ambition'], ['capability', 'Capability fit'], ['access', 'Access']]

const rank = (a: Opportunity, b: Opportunity) =>
  (b.fit ?? 0) - (a.fit ?? 0) || (ACTION_RANK[a.action ?? 'pass'] - ACTION_RANK[b.action ?? 'pass']) || Number(isUrgent(b)) - Number(isUrgent(a)) || b.first_seen.localeCompare(a.first_seen)
const live3 = (o: Opportunity) => (o.status === 'open' || o.status === 'watching') && (o.fit ?? 0) >= 3

export default function Radar() {
  const { version, bump } = useLife()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') ?? 'all') as Tab
  const [opps, setOpps] = useState<Opportunity[] | null>(null)
  const [runs, setRuns] = useState<{ latest: RadarRun | null; briefed: RadarRun | null }>({ latest: null, briefed: null })
  const [note, setNote] = useState<string | null>(null)

  const load = useCallback(() => Promise.all([listOpportunities(), latestRuns()]).then(([o, r]) => { setOpps(o); setRuns(r) }), [])
  useEffect(() => { void load() }, [load, version])
  const scanning = runs.latest?.status === 'running'
  useEffect(() => {
    if (!scanning) return
    const t = window.setInterval(() => void load(), 12000)
    return () => window.clearInterval(t)
  }, [scanning, load])

  const setTab = (t: Tab) => { params.set('tab', t); setParams(params, { replace: true }) }
  const scan = async () => {
    setNote('Starting the engine…')
    const r = await runRadar()
    setNote(r.error ?? r.note ?? 'Scanning the four pipelines. This takes a few minutes; you can leave the page.')
    void load()
  }
  const decide = async (o: Opportunity, decision: 'pursue' | 'watch' | 'pass' | 'reopen', why = '') => {
    const status = decision === 'pursue' ? 'tracked' : decision === 'watch' ? 'watching' : decision === 'pass' ? 'passed' : 'open'
    setOpps((l) => (l ?? []).map((x) => (x.id === o.id ? { ...x, status, decision_note: why || x.decision_note } : x)))
    const r = await radarDecide(o.id, decision, why)
    if (r.error) { setNote(r.error); void load(); return }
    setNote(decision === 'pursue' ? `In your pipeline: ${o.org || o.title}` : decision === 'pass' ? 'Passed. The engine will learn from it.' : decision === 'watch' ? 'Watching.' : 'Back on the radar.')
    if (decision === 'pursue') bump()
  }

  const all = opps ?? []
  const liveOpps = all.filter(live3).sort(rank)
  const top = liveOpps.filter((o) => o.status === 'open' && (o.fit ?? 0) >= 4 && o.action !== 'watch').slice(0, 4)
  const topIds = new Set(top.map((o) => o.id))
  const byId = useMemo(() => new Map(all.map((o) => [o.id, o])), [all])
  const brief = runs.briefed?.brief
  const counts = Object.fromEntries(LANES.map((l) => [l.key, liveOpps.filter((o) => o.lane === l.key && o.status === 'open').length])) as Record<RadarLane, number>
  const watching = all.filter((o) => o.status === 'watching').sort(rank)
  const fresh = liveOpps.filter(isNew).length
  const urgent = liveOpps.filter(isUrgent).length
  const jump = (id: string | null) => {
    if (!id) return
    if (tab !== 'all') setTab('all')
    window.setTimeout(() => { const el = document.getElementById(`opp-${id}`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.setAttribute('data-flash', '1'); window.setTimeout(() => el?.removeAttribute('data-flash'), 1600) }, 60)
  }

  return (
    <div className="v2-col v2-wide v2-radar-page">
      <div className="v2-page-head">
        <h1 className="v2-h-page">Radar</h1>
        <div className="v2-radar-status">
          <RunLine latest={runs.latest} />
          <button className="v2-chip" onClick={() => void scan()} disabled={scanning}><ArrowsClockwise size={15} className={scanning ? 'v2-spin' : undefined} />{scanning ? 'Scanning' : 'Scan now'}</button>
        </div>
      </div>
      <p className="v2-radar-sub">
        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        {opps && <> · {liveOpps.length} live across four pipelines{fresh ? ` · ${fresh} new` : ''}{urgent ? ` · ${urgent} closing within a week` : ''}</>}
      </p>
      {note && <p className="v2-quiet" role="status">{note}</p>}

      {tab === 'all' && (
        brief ? (
          <section className="v2-brief" aria-label="Today's priorities">
            <ol className="v2-priorities">
              {brief.priorities.map((p, i) => (
                <li key={i}>
                  <span className="v2-pri-n" aria-hidden>{i + 1}</span>
                  {p.opportunity_id && byId.has(p.opportunity_id)
                    ? <button className="v2-pri-text" onClick={() => jump(p.opportunity_id)}>{p.text}</button>
                    : <p className="v2-pri-text">{p.text}</p>}
                </li>
              ))}
            </ol>
            {brief.verdict.length > 0 && (
              <div className="v2-verdict">
                {brief.verdict.map((v) => (
                  <button key={v.label} className="v2-verdict-tile" disabled={!v.opportunity_id} onClick={() => jump(v.opportunity_id)}>
                    <small>{v.label}</small><span>{v.text}</span>
                  </button>
                ))}
              </div>
            )}
            {brief.insight && <p className="v2-insight">{brief.insight}</p>}
          </section>
        ) : opps && !scanning && (
          <div className="v2-empty"><p>The engine writes a brief after each scan, at 6.30 and 13.30.</p><button className="v2-chip" data-primary="1" onClick={() => void scan()}>Run the first scan</button></div>
        )
      )}

      <div className="v2-tabs" role="tablist" aria-label="Pipelines">
        {([['all', 'Everything'], ...LANES.map((l) => [l.key, l.label]), ['watching', 'Watching'], ['lens', 'Lens']] as [Tab, string][]).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} data-on={tab === k ? '1' : undefined} onClick={() => setTab(k)}>
            {label}
            {k in counts && counts[k as RadarLane] > 0 && <span className="v2-count" data-soft="1">{counts[k as RadarLane]}</span>}
            {k === 'watching' && watching.length > 0 && <span className="v2-count" data-soft="1">{watching.length}</span>}
          </button>
        ))}
      </div>

      {opps === null ? <div className="v2-stack">{[0, 1, 2].map((i) => <div key={i} className="v2-skeleton" style={{ height: 180 }} />)}</div>
        : tab === 'lens' ? <LensEditor />
        : tab === 'watching' ? (
          <div className="v2-opps">{watching.length ? watching.map((o) => <OppCard key={o.id} o={o} decide={decide} />) : <p className="v2-quiet">Nothing on watch. Tap Watch on any card to keep an eye on it.</p>}</div>
        ) : tab === 'all' ? (
          <>
            {top.length > 0 && (
              <section className="v2-section">
                <div className="v2-section-head"><h2 className="v2-label">Top matches</h2></div>
                <div className="v2-opps">{top.map((o) => <OppCard key={o.id} o={o} decide={decide} big />)}</div>
              </section>
            )}
            {LANES.map((l) => <LaneSection key={l.key} lane={l.key} title={l.section} all={all} skip={topIds} decide={decide} />)}
            <Closed all={all} />
          </>
        ) : (
          <>
            <LaneSection lane={tab} title={LANES.find((l) => l.key === tab)!.section} all={all} skip={new Set()} decide={decide} />
            <Closed all={all.filter((o) => o.lane === tab)} />
          </>
        )}
    </div>
  )
}

function RunLine({ latest }: { latest: RadarRun | null }) {
  if (!latest) return <span className="v2-quiet">Not scanned yet</span>
  if (latest.status === 'running') {
    const done = (latest.lanes ?? []).filter((j) => j.lane !== 'brief' && (j.status === 'done' || j.status === 'failed')).length
    const briefing = (latest.lanes ?? []).some((j) => j.lane === 'brief')
    return <span className="v2-quiet" role="status">{briefing ? 'Writing the brief' : `Searching: ${done} of 4 pipelines done`}</span>
  }
  const when = latest.finished_at ?? latest.started_at
  const today = new Date(when).toDateString() === new Date().toDateString()
  return (
    <span className="v2-quiet" title={latest.error ?? undefined}>
      {latest.status === 'failed' ? 'Last scan failed' : 'Scanned'} {today ? timeOf(when) : shortDate(when)}
      {latest.usage?.usd ? ` · $${latest.usage.usd.toFixed(2)}` : ''}
    </span>
  )
}

type Decide = (o: Opportunity, d: 'pursue' | 'watch' | 'pass' | 'reopen', why?: string) => Promise<void>

function LaneSection({ lane, title, all, skip, decide }: { lane: RadarLane; title: string; all: Opportunity[]; skip: Set<string>; decide: Decide }) {
  const [showLow, setShowLow] = useState(false)
  const mine = all.filter((o) => o.lane === lane)
  const shown = mine.filter((o) => o.status === 'open' && (o.fit ?? 0) >= 3 && !skip.has(o.id)).sort(rank)
  const low = mine.filter((o) => o.status === 'open' && o.fit !== null && o.fit <= 2).sort(rank)
  const unscored = mine.filter((o) => o.status === 'open' && o.fit === null).length
  const tracked = mine.filter((o) => o.status === 'tracked').length
  return (
    <section className="v2-section">
      <div className="v2-section-head">
        <h2 className="v2-label">{title}</h2>
        {tracked > 0 && <Link className="v2-link" to="/v2/pipeline">{tracked} in your pipeline <ArrowRight size={13} /></Link>}
      </div>
      <div className="v2-opps">
        {shown.map((o) => <OppCard key={o.id} o={o} decide={decide} />)}
        {!shown.length && <p className="v2-quiet v2-lane-empty">{lane === 'venture' ? 'No funding that fits the products today. The engine will not reshape a product to chase a grant.' : skip.size && mine.some((o) => skip.has(o.id)) ? 'The best of this pipeline is in Top matches.' : 'Nothing above the bar right now.'}</p>}
      </div>
      {(low.length > 0 || unscored > 0) && (
        <div className="v2-below">
          {low.length > 0 && <button className="v2-link" aria-expanded={showLow} onClick={() => setShowLow((v) => !v)}><CaretDown size={12} style={{ transform: showLow ? 'rotate(180deg)' : undefined }} />{low.length} below the bar</button>}
          {unscored > 0 && <span className="v2-fine">{unscored} {unscored === 1 ? 'notice is' : 'notices are'} waiting to be scored at the next scan</span>}
        </div>
      )}
      {showLow && <div className="v2-opps">{low.map((o) => <OppCard key={o.id} o={o} decide={decide} />)}</div>}
    </section>
  )
}

function Closed({ all }: { all: Opportunity[] }) {
  const gone = all.filter((o) => o.status === 'closed' || o.status === 'expired')
  if (!gone.length) return null
  return (
    <section className="v2-section">
      <div className="v2-section-head"><h2 className="v2-label">Removed from the radar</h2></div>
      <ul className="v2-closed">
        {gone.map((o) => <li key={o.id} id={`opp-${o.id}`}><b>{o.title}</b><span>{o.org ? `${o.org}. ` : ''}{o.closed_reason}</span></li>)}
      </ul>
    </section>
  )
}

function FitMeter({ fit }: { fit: number | null }) {
  if (fit === null) return <span className="v2-fit" data-none="1">Not scored</span>
  return (
    <span className="v2-fit" role="img" aria-label={`Fit ${fit} out of 5`} data-fit={fit}>
      {[1, 2, 3, 4, 5].map((n) => <i key={n} data-on={n <= fit ? '1' : undefined} />)}
      <b>{fit}/5</b>
    </span>
  )
}

function OppCard({ o, decide, big }: { o: Opportunity; decide: Decide; big?: boolean }) {
  const { send, prefill } = useLife()
  const [passing, setPassing] = useState(false)
  const [reason, setReason] = useState('')
  const [why, setWhy] = useState(false)
  const left = daysUntil(o.deadline)
  const outreachFirst = o.action === 'outreach_now'
  const facts = [
    o.money,
    o.deadline ? `Closes ${shortDate(o.deadline)}${left !== null && left >= 0 ? `, ${left === 0 ? 'today' : left === 1 ? 'tomorrow' : `in ${left} days`}` : ''}` : '',
    o.signal_date ? `Signal ${shortDate(o.signal_date)}` : '',
    o.location, o.product ? `For ${o.product}` : '',
  ].filter(Boolean)
  const outreach = () => send(`Draft an outreach email to ${o.org || 'them'} about "${o.title}" from the radar. Use the angle.`)
  const pass = (note: string) => { setPassing(false); void decide(o, 'pass', note) }

  return (
    <article className="v2-opp" id={`opp-${o.id}`} data-big={big ? '1' : undefined} data-status={o.status}>
      <div className="v2-opp-top">
        <FitMeter fit={o.fit} />
        {o.action && <span className="v2-act" data-act={o.action}>{ACTION_LABEL[o.action]}</span>}
        {isNew(o) && <span className="v2-flag">New</span>}
        {isUpdated(o) && <span className="v2-flag" data-kind="updated">Updated</span>}
        {isUrgent(o) && <span className="v2-flag" data-kind="urgent">Urgent</span>}
        {o.status === 'watching' && <span className="v2-flag" data-kind="quiet">Watching</span>}
      </div>
      <h3>{o.title}</h3>
      <p className="v2-opp-org">{o.org}{o.category && o.category !== 'other' ? <span> · {o.category === 'rfp' ? 'RFP' : o.category}</span> : null}</p>
      {facts.length > 0 && <p className="v2-opp-facts">{facts.map((f, i) => <span key={i}>{f}</span>)}</p>}
      {o.deadline_note && <p className="v2-fine">{o.deadline_note}</p>}
      {isUpdated(o) && <p className="v2-opp-change">{o.change_note}</p>}
      {o.why && <p className="v2-opp-why">{o.why}</p>}
      {o.angle && <p className="v2-opp-angle"><span>Angle</span>{o.angle}</p>}
      {!o.why && o.summary && <p className="v2-opp-why">{o.summary}</p>}
      {why && o.fit !== null && (
        <dl className="v2-criteria">
          {CRITERIA.map(([k, label]) => (
            <div key={k}><dt>{label}</dt><dd><span style={{ width: `${((o.fit_detail?.[k] ?? 0) / 5) * 100}%` }} /></dd><dd className="v2-criteria-n">{o.fit_detail?.[k] ?? ''}</dd></div>
          ))}
        </dl>
      )}

      {passing ? (
        <div className="v2-pass">
          <span className="v2-label">Why pass? It teaches the engine.</span>
          <div className="v2-chips">
            {PASS_REASONS.map((r) => <button key={r} className="v2-chip" onClick={() => pass(r)}>{r}</button>)}
            <form onSubmit={(e) => { e.preventDefault(); pass(reason.trim()) }} className="v2-pass-own">
              <input className="v2-chip-input" name="pass-reason" autoComplete="off" value={reason} placeholder="Or say why…" onChange={(e) => setReason(e.target.value)} aria-label="Reason for passing" />
            </form>
            <button className="v2-x" aria-label="Cancel" onClick={() => setPassing(false)}><X size={12} /></button>
          </div>
        </div>
      ) : (
        <div className="v2-chips v2-opp-actions">
          {o.status === 'tracked' ? <Link className="v2-chip" to="/v2/pipeline">In your pipeline <ArrowRight size={14} /></Link> : o.status === 'passed' ? (
            <button className="v2-chip" onClick={() => void decide(o, 'reopen')}>Put it back</button>
          ) : (
            <>
              {outreachFirst
                ? <button className="v2-chip" data-primary="1" onClick={outreach}>Draft outreach</button>
                : <button className="v2-chip" data-primary="1" onClick={() => void decide(o, 'pursue')}><Plus size={14} weight="bold" />Pursue</button>}
              {outreachFirst && <button className="v2-chip" onClick={() => void decide(o, 'pursue')}><Plus size={14} weight="bold" />Pursue</button>}
              {o.status !== 'watching' && <button className="v2-chip" onClick={() => void decide(o, 'watch')}>Watch</button>}
              <button className="v2-chip" onClick={() => setPassing(true)}>Pass</button>
            </>
          )}
          <span className="v2-opp-links">
            <button className="v2-link" onClick={() => prefill(`About "${o.title}" (${o.org}): `)}><ChatCircleText size={14} />Ask</button>
            {o.fit !== null && <button className="v2-link" aria-expanded={why} onClick={() => setWhy((v) => !v)}>Why {o.fit}/5</button>}
            {o.url && <a className="v2-link" href={o.url} target="_blank" rel="noreferrer"><ArrowSquareOut size={14} />{o.source_name || 'Source'}</a>}
          </span>
        </div>
      )}
    </article>
  )
}

/* The lens: how the engine understands Hue & Heal. */
function LensEditor() {
  const { profile, setProfile } = useLife()
  const lens = profile.radar_lens ?? {}
  const save = (patch: Partial<RadarLens>) => setProfile({ radar_lens: { ...lens, ...patch } })
  const ventures = lens.ventures ?? []
  return (
    <div className="v2-lens-edit">
      <p className="v2-quiet v2-lens-intro">This is how the engine reads Hue & Heal. It searches with these words twice a day and scores everything against them. Your pursue, watch and pass decisions sharpen it further.</p>
      <div className="v2-lens-grid">
        <Editable label="What Hue & Heal is" value={lens.identity ?? ''} placeholder="The studio in two or three sentences." onSave={(v) => save({ identity: v })} />
        <Editable label="Look hardest for" value={lens.look_for ?? ''} placeholder="The work that should score highest." onSave={(v) => save({ look_for: v })} />
        <Editable label="Buyers to favour" value={lens.buyers ?? ''} placeholder="Who should outrank conventional procurement." onSave={(v) => save({ buyers: v })} />
        <Editable label="Score down" value={lens.down_rank ?? ''} placeholder="What should rarely surface." onSave={(v) => save({ down_rank: v })} />
        <Editable label="Geography" value={lens.geography ?? ''} placeholder="Where you can realistically work." onSave={(v) => save({ geography: v })} />
        <Editable label="Founder contracts" value={lens.contracts ?? ''} placeholder="Roles, rates and sectors for your own contract work." onSave={(v) => save({ contracts: v })} />
      </div>
      <h2 className="v2-label v2-lens-h">Your products, for venture funding</h2>
      <div className="v2-lens-grid">
        {ventures.map((v, i) => (
          <Editable key={v.product} label={v.product} value={v.direction} placeholder="Where the product is going, and what kind of funding fits it."
            onSave={(d) => save({ ventures: ventures.map((x, j) => (j === i ? { ...x, direction: d } : x)) })} />
        ))}
        <Editable label="The rule" value={lens.venture_rule ?? ''} placeholder="When funding is worth it." onSave={(v) => save({ venture_rule: v })} />
      </div>
      <h2 className="v2-label v2-lens-h">UK Contracts Finder phrases</h2>
      <p className="v2-fine">The government feed blocks cloud servers, so your Mac checks it for these exact phrases at 6.00 and 13.00. The engine scores whatever it finds at the next scan.</p>
      <Keywords value={profile.tender_keywords} onChange={(k) => setProfile({ tender_keywords: k })} />
      {!live && <p className="v2-fine">Sample mode: edits here are not saved.</p>}
    </div>
  )
}

function Keywords({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('')
  const add = () => { const n = draft.trim().toLowerCase(); if (!n || value.includes(n)) { setDraft(''); return } onChange([...value, n]); setDraft('') }
  return (
    <div className="v2-chips">
      {value.map((k) => (
        <span key={k} className="v2-chip" data-static="1">{k}<button className="v2-x" aria-label={`Remove ${k}`} onClick={() => onChange(value.filter((x) => x !== k))}><X size={11} /></button></span>
      ))}
      <input className="v2-chip-input" name="tender-phrase" autoComplete="off" value={draft} placeholder="Add a phrase…" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} onBlur={add} aria-label="Add a Contracts Finder phrase" />
    </div>
  )
}

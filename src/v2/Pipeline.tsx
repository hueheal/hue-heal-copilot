import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowSquareOut, ArrowsClockwise, X } from '@phosphor-icons/react'
import { useLife } from './V2App'
import { AddLine } from './Plan'
import { addPipeline, listPipeline, money, scanTenders, shortDate, updatePipeline, daysUntil, type PipelineItem } from './life'

/* Pipeline: every lead, deal, partnership and tender in one place. Work
   moves left to right by stage; tenders arrive from the radar and wait
   for a yes (track) or a no (dismiss). */

const KINDS = [['all', 'Everything'], ['lead', 'Leads'], ['deal', 'Deals'], ['partnership', 'Partnerships'], ['tender', 'Tenders']] as const
const STAGES = [['new', 'New'], ['contacted', 'In touch'], ['meeting', 'Meeting'], ['proposal', 'Proposal'], ['won', 'Won']] as const
const ALL_STAGES = ['new', 'contacted', 'tracking', 'meeting', 'proposal', 'won', 'lost']
const stageLabel = (s: string) => ({ new: 'New', contacted: 'In touch', tracking: 'Tracking', meeting: 'Meeting', proposal: 'Proposal', won: 'Won', lost: 'Lost' } as Record<string, string>)[s] ?? s

export default function Pipeline() {
  const { inLens, colorOf, nameOf, lens, version, bump, profile, setProfile } = useLife()
  const [params, setParams] = useSearchParams()
  const kind = (params.get('lens') ?? 'all') as (typeof KINDS)[number][0]
  const [items, setItems] = useState<PipelineItem[] | null>(null)
  const [scan, setScan] = useState<string | null>(null)
  useEffect(() => { void listPipeline().then(setItems) }, [version])

  const shown = useMemo(() => (items ?? []).filter((p) => inLens(p.brand_id) && (kind === 'all' ? p.kind !== 'tender' || p.stage !== 'new' : p.kind === kind)), [items, inLens, kind])
  const radar = (items ?? []).filter((p) => inLens(p.brand_id) && p.kind === 'tender' && p.stage === 'new')
  const move = async (p: PipelineItem, stage: string) => {
    setItems((l) => (l ?? []).map((x) => (x.id === p.id ? { ...x, stage } : x)))
    await updatePipeline(p.id, { stage })
  }
  const dismiss = async (p: PipelineItem) => { setItems((l) => (l ?? []).filter((x) => x.id !== p.id)); await updatePipeline(p.id, { stage: 'dismissed' }) }
  const runScan = async () => {
    setScan('Scanning Contracts Finder…')
    const r = await scanTenders()
    setScan(r.error ?? r.note ?? (r.added ? `${r.added} new ${r.added === 1 ? 'notice' : 'notices'} on the radar.` : 'Nothing new since the last scan.'))
    if (r.added) bump()
  }
  const add = async (title: string) => {
    const k = kind === 'all' || kind === 'tender' ? 'lead' : kind
    const created = await addPipeline({ title, kind: k, brand_id: lens === 'all' ? null : lens })
    if (created) setItems((l) => [created, ...(l ?? [])])
  }
  const open = shown.filter((p) => p.stage !== 'won' && p.stage !== 'lost')
  const openValue = open.reduce((n, p) => n + Number(p.value_pence ?? 0), 0)

  return (
    <div className="v2-col v2-wide v2-pipeline">
      <div className="v2-page-head">
        <h1 className="v2-h-page">Pipeline</h1>
        {openValue > 0 && kind !== 'tender' && <p className="v2-quiet">{money(openValue)} open across {open.length} {open.length === 1 ? 'item' : 'items'}</p>}
      </div>
      <div className="v2-tabs" role="tablist">
        {KINDS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={kind === k} data-on={kind === k ? '1' : undefined} onClick={() => { params.set('lens', k); setParams(params, { replace: true }) }}>
            {label}{k === 'tender' && radar.length > 0 && <span className="v2-count">{radar.length}</span>}
          </button>
        ))}
      </div>

      {kind === 'tender' ? (
        <div className="v2-radar">
          <aside className="v2-radar-side">
            <h2 className="v2-label">What the radar listens for</h2>
            <Keywords value={profile.tender_keywords} onChange={(k) => setProfile({ tender_keywords: k })} />
            <button className="v2-chip" onClick={() => void runScan()}><ArrowsClockwise size={15} />Scan now</button>
            {scan && <p className="v2-quiet" role="status">{scan}</p>}
            <p className="v2-fine">Open UK public-sector notices from Contracts Finder. A notice must contain one of your phrases word for word.</p>
          </aside>
          <div className="v2-stack">
            {radar.length === 0 && <div className="v2-empty"><p>No new notices. Scan now, or add phrases that describe the work you want.</p></div>}
            {radar.map((p) => (
              <article key={p.id} className="v2-tender">
                <div>
                  <h3>{p.title}</h3>
                  <p className="v2-meta">{p.org}{p.value_pence ? `, ${money(p.value_pence)}` : ''}{p.deadline ? `, closes ${shortDate(p.deadline)}` : ''}</p>
                  <p className="v2-tender-notes">{p.notes}</p>
                </div>
                <div className="v2-chips">
                  <button className="v2-chip" data-primary="1" onClick={() => void move(p, 'tracking')}>Track</button>
                  <button className="v2-chip" onClick={() => void dismiss(p)}>Dismiss</button>
                  {p.url && <a className="v2-chip" href={p.url} target="_blank" rel="noreferrer"><ArrowSquareOut size={15} />Notice</a>}
                </div>
              </article>
            ))}
            {(items ?? []).filter((p) => inLens(p.brand_id) && p.kind === 'tender' && p.stage !== 'new').length > 0 && (
              <p className="v2-quiet">Tracked tenders sit with the rest of your pipeline under Everything.</p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="v2-board">
            {STAGES.map(([stage, label]) => {
              const col = shown.filter((p) => (stage === 'contacted' ? p.stage === 'contacted' || p.stage === 'tracking' : p.stage === stage))
              return (
                <section key={stage} className="v2-column" aria-label={label}>
                  <header><h2>{label}</h2><span>{col.length || ''}</span></header>
                  {items === null ? <div className="v2-skeleton" style={{ height: 80 }} /> : col.map((p) => {
                    const late = (daysUntil(p.next_due) ?? 1) < 0
                    return (
                      <article key={p.id} className="v2-deal" style={{ ['--c' as never]: colorOf(p.brand_id) }}>
                        <h3>{p.title}</h3>
                        <p className="v2-meta">{[p.org, money(p.value_pence), p.kind === 'tender' ? 'tender' : ''].filter(Boolean).join(', ')}</p>
                        {p.next_step && <p className="v2-deal-next" data-late={late ? '1' : undefined}>{p.next_step}{p.next_due ? `, ${shortDate(p.next_due)}` : ''}</p>}
                        <div className="v2-deal-foot">
                          <span className="v2-meta"><i style={{ background: colorOf(p.brand_id) }} />{nameOf(p.brand_id)}</span>
                          <select value={p.stage} aria-label={`Stage for ${p.title}`} onChange={(e) => void move(p, e.target.value)}>
                            {ALL_STAGES.map((s) => <option key={s} value={s}>{stageLabel(s)}</option>)}
                          </select>
                        </div>
                      </article>
                    )
                  })}
                </section>
              )
            })}
          </div>
          <div className="v2-board-add">
            <AddLine placeholder={`Add a ${kind === 'all' ? 'lead' : kind}, or tell Copilot the details below`} onAdd={(t) => void add(t)} />
          </div>
        </>
      )}
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
      <input className="v2-chip-input" name="tender-phrase" autoComplete="off" value={draft} placeholder="Add a phrase…" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} onBlur={add} aria-label="Add a tender phrase" />
    </div>
  )
}

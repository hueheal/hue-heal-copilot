import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { ArrowRight } from '@phosphor-icons/react'
import { useLife } from './V2App'
import { AddLine } from './Plan'
import { addPipeline, listPipeline, money, shortDate, updatePipeline, daysUntil, type PipelineItem } from './life'

/* Pipeline: every lead, deal, partnership and tender in one place. Work
   moves left to right by stage. New opportunities are found and scored on
   the Radar; pursuing one there files it here with a first next step. */

const KINDS = [['all', 'Everything'], ['lead', 'Leads'], ['deal', 'Deals'], ['partnership', 'Partnerships'], ['tender', 'Tenders']] as const
const STAGES = [['new', 'New'], ['contacted', 'In touch'], ['meeting', 'Meeting'], ['proposal', 'Proposal'], ['won', 'Won']] as const
const ALL_STAGES = ['new', 'contacted', 'tracking', 'meeting', 'proposal', 'won', 'lost']
const stageLabel = (s: string) => ({ new: 'New', contacted: 'In touch', tracking: 'Tracking', meeting: 'Meeting', proposal: 'Proposal', won: 'Won', lost: 'Lost' } as Record<string, string>)[s] ?? s

export default function Pipeline() {
  const { inLens, colorOf, nameOf, lens, version } = useLife()
  const [params, setParams] = useSearchParams()
  const kind = (params.get('lens') ?? 'all') as (typeof KINDS)[number][0]
  const [items, setItems] = useState<PipelineItem[] | null>(null)
  useEffect(() => { void listPipeline().then(setItems) }, [version])

  const shown = useMemo(() => (items ?? []).filter((p) => inLens(p.brand_id) && (kind === 'all' || p.kind === kind)), [items, inLens, kind])
  const move = async (p: PipelineItem, stage: string) => {
    setItems((l) => (l ?? []).map((x) => (x.id === p.id ? { ...x, stage } : x)))
    await updatePipeline(p.id, { stage })
  }
  const add = async (title: string) => {
    const k = kind === 'all' ? 'lead' : kind
    const created = await addPipeline({ title, kind: k, brand_id: lens === 'all' ? null : lens })
    if (created) setItems((l) => [created, ...(l ?? [])])
  }
  const open = shown.filter((p) => p.stage !== 'won' && p.stage !== 'lost')
  const openValue = open.reduce((n, p) => n + Number(p.value_pence ?? 0), 0)

  return (
    <div className="v2-col v2-wide v2-pipeline">
      <div className="v2-page-head">
        <h1 className="v2-h-page">Pipeline</h1>
        {openValue > 0 && <p className="v2-quiet">{money(openValue)} open across {open.length} {open.length === 1 ? 'item' : 'items'}</p>}
      </div>
      <div className="v2-tabs" role="tablist">
        {KINDS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={kind === k} data-on={kind === k ? '1' : undefined} onClick={() => { params.set('lens', k); setParams(params, { replace: true }) }}>
            {label}
          </button>
        ))}
      </div>

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
            <Link className="v2-link" to="/v2/radar">Find new opportunities on the Radar <ArrowRight size={13} /></Link>
          </div>
      </>
    </div>
  )
}

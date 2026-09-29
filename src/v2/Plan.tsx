import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check, Plus, X } from '@phosphor-icons/react'
import { useLife } from './V2App'
import { addMilestone, listMilestones, shortDate, updateMilestone, type Horizon, type Milestone } from './life'

/* Plan: the north star written in the founder's own words, then the roadmap
   in four horizons. Everything edits in place. */

const HORIZONS: { key: Horizon; label: string; hint: string }[] = [
  { key: 'week', label: 'This week', hint: 'What must move before Sunday' },
  { key: 'quarter', label: 'This quarter', hint: 'The few things that make the quarter' },
  { key: 'year', label: 'This year', hint: 'Where this year lands' },
  { key: 'someday', label: 'Someday', hint: 'Kept, not forgotten' },
]

export default function Plan() {
  const { profile, setProfile, inLens, colorOf, nameOf, lens, brands, version, bump } = useLife()
  const [ms, setMs] = useState<Milestone[] | null>(null)
  useEffect(() => { void listMilestones().then(setMs) }, [version])

  const shown = (ms ?? []).filter((m) => inLens(m.brand_id))
  const toggle = async (m: Milestone) => {
    const status = m.status === 'done' ? 'active' : 'done'
    setMs((l) => (l ?? []).map((x) => (x.id === m.id ? { ...x, status } : x)))
    await updateMilestone(m.id, { status })
  }
  const drop = async (m: Milestone) => { setMs((l) => (l ?? []).filter((x) => x.id !== m.id)); await updateMilestone(m.id, { status: 'dropped' }) }
  const add = async (horizon: Horizon, title: string) => {
    const created = await addMilestone({ title, horizon, brand_id: lens === 'all' ? null : lens })
    if (created) setMs((l) => [...(l ?? []), created]); bump()
  }

  return (
    <div className="v2-col v2-wide v2-plan">
      <h1 className="v2-h-page">Plan</h1>

      <section className="v2-star">
        <Editable label="Mission" value={profile.mission} placeholder="The change you are here to make, in one or two sentences." onSave={(v) => setProfile({ mission: v })} big />
        <Editable label="Purpose" value={profile.purpose} placeholder="Why it matters to you." onSave={(v) => setProfile({ purpose: v })} />
        <Editable label="This week's focus" value={profile.weekly_focus} placeholder="The one outcome that would make this week a good one." onSave={(v) => setProfile({ weekly_focus: v })} />
        <FocusAreas />
      </section>

      <div className="v2-horizons">
        {HORIZONS.map((h) => {
          const items = shown.filter((m) => m.horizon === h.key)
          return (
            <section key={h.key} className="v2-horizon" aria-label={h.label}>
              <header><h2>{h.label}</h2><span>{h.hint}</span></header>
              {ms === null ? <div className="v2-skeleton" style={{ height: 60 }} /> : (
                <ul>
                  {items.map((m) => (
                    <li key={m.id} data-done={m.status === 'done' ? '1' : undefined}>
                      <button className="v2-tick" data-small="1" data-on={m.status === 'done' ? '1' : undefined} aria-label={m.status === 'done' ? 'Mark not done' : 'Mark done'} onClick={() => void toggle(m)}><Check size={12} weight="bold" /></button>
                      <span>
                        <b>{m.title}</b>
                        <small><i style={{ background: colorOf(m.brand_id) }} />{nameOf(m.brand_id)}{m.due ? `, ${shortDate(m.due)}` : ''}</small>
                      </span>
                      <button className="v2-x" aria-label={`Drop ${m.title}`} onClick={() => void drop(m)}><X size={12} /></button>
                    </li>
                  ))}
                </ul>
              )}
              <AddLine placeholder={lens === 'all' ? 'Add to your life' : `Add to ${brands.find((b) => b.id === lens)?.name ?? 'this business'}`} onAdd={(t) => void add(h.key, t)} />
            </section>
          )
        })}
      </div>
    </div>
  )
}

export function Editable({ label, value, placeholder, onSave, big }: { label: string; value: string; placeholder: string; onSave: (v: string) => void; big?: boolean }) {
  const [v, setV] = useState(value)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => setV(value), [value])
  /* Grow with the words, on load and while typing. */
  useLayoutEffect(() => { const el = ref.current; if (!el) return; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }, [v])
  return (
    <label className="v2-editable" data-big={big ? '1' : undefined}>
      <span className="v2-label">{label}</span>
      <textarea ref={ref} value={v} rows={1} placeholder={placeholder} onChange={(e) => setV(e.target.value)}
        onBlur={() => { if (v.trim() !== value) onSave(v.trim()) }} />
    </label>
  )
}

function FocusAreas() {
  const { profile, setProfile } = useLife()
  const [draft, setDraft] = useState('')
  const areas = profile.focus_areas ?? []
  const add = () => { const n = draft.trim(); if (!n) return; setProfile({ focus_areas: [...areas, { name: n }] }); setDraft('') }
  return (
    <div className="v2-editable">
      <span className="v2-label">Focus areas</span>
      <div className="v2-chips">
        {areas.map((a) => (
          <span key={a.name} className="v2-chip" data-static="1">{a.name}
            <button className="v2-x" aria-label={`Remove ${a.name}`} onClick={() => setProfile({ focus_areas: areas.filter((x) => x.name !== a.name) })}><X size={11} /></button>
          </span>
        ))}
        <input className="v2-chip-input" name="focus-area" autoComplete="off" value={draft} placeholder="Add an area…" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} onBlur={add} aria-label="Add a focus area" />
      </div>
    </div>
  )
}

export function AddLine({ placeholder, onAdd }: { placeholder: string; onAdd: (t: string) => void }) {
  const [t, setT] = useState('')
  const submit = () => { const v = t.trim(); if (!v) return; onAdd(v); setT('') }
  return (
    <form className="v2-addline" onSubmit={(e) => { e.preventDefault(); submit() }}>
      <Plus size={14} aria-hidden />
      <input name="add" autoComplete="off" value={t} placeholder={`${placeholder}…`} onChange={(e) => setT(e.target.value)} aria-label={placeholder} />
    </form>
  )
}

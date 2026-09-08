import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBrand } from '../lib/brandContext'
import { listPriorities, addPriority, updatePriority, reorderPriorities, removePriority, type Priority } from '../lib/priorities'
import { DEPARTMENTS, deptOf } from '../lib/org'

/* ============================================================
   Your priorities, in order. The first is the one thing; the
   rest wait their turn. Done and parked fold away. Every seat
   reads this list before it decides anything.
   ============================================================ */

export default function Priorities({ compact = false }: { compact?: boolean }) {
  const { current } = useBrand()
  const nav = useNavigate()
  const [items, setItems] = useState<Priority[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [dept, setDept] = useState<string>('')
  const [showRest, setShowRest] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => { setItems(null); listPriorities().then(setItems).catch(() => setItems([])) }, [current?.id])

  const active = (items ?? []).filter((p) => p.status === 'active')
  const rest = (items ?? []).filter((p) => p.status !== 'active')

  async function add() {
    if (!title.trim()) return
    const p = await addPriority({ title, detail, dept: dept || null }, active.length)
    if (p) setItems((l) => [...(l ?? []), p])
    setTitle(''); setDetail(''); setDept(''); setAdding(false)
  }
  async function move(p: Priority, dir: -1 | 1) {
    const ids = active.map((x) => x.id)
    const i = ids.indexOf(p.id); const j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    await reorderPriorities(ids)
    setItems((l) => (l ?? []).map((x) => ({ ...x, position: ids.includes(x.id) ? ids.indexOf(x.id) : x.position })).sort((a, b) => a.position - b.position))
  }
  async function setStatus(p: Priority, status: Priority['status']) {
    let note: string | null = p.note
    if (status === 'parked') {
      const why = window.prompt('Parked because? One line. The org sees it.')
      if (why === null) return
      note = why.trim() || null
    }
    await updatePriority(p.id, { status, note })
    setItems((l) => (l ?? []).map((x) => (x.id === p.id ? { ...x, status, note, decided_at: status === 'active' ? null : new Date().toISOString() } : x)))
  }
  async function saveEdit(p: Priority, patch: Partial<Priority>) {
    await updatePriority(p.id, patch)
    setItems((l) => (l ?? []).map((x) => (x.id === p.id ? { ...x, ...patch } : x)))
  }

  if (items === null) return null

  return (
    <div className="ck-prio">
      <div className="ck-board-title" style={{ marginBottom: 6 }}>
        <b>Your priorities</b>
        <span>{active.length ? `${active.length} in play` : 'none set'}</span>
        <button className="ck-pill" style={{ marginLeft: 'auto' }} onClick={() => setAdding((v) => !v)}>{adding ? 'Cancel' : '+ Add'}</button>
      </div>

      {adding && (
        <div className="ck-composer" style={{ marginTop: 0, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input className="ck-search" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The priority, in one line" autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void add() } }} />
          <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={2} placeholder="What done looks like (optional)" style={{ minHeight: 44 }} />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, color: 'var(--ck-faint)' }}>Owned by</span>
            <button className="ck-pill" data-on={dept === '' ? '1' : '0'} onClick={() => setDept('')}>Me</button>
            {DEPARTMENTS.map((d) => <button key={d.key} className="ck-pill" data-on={dept === d.key ? '1' : '0'} onClick={() => setDept(d.key)}>{d.name}</button>)}
            <button className="ck-go" disabled={!title.trim()} onClick={() => void add()}>Add</button>
          </div>
        </div>
      )}

      {active.length === 0 && !adding && (
        <div className="ck-note">Nothing set. Add the one thing that matters most; every seat will work to it.</div>
      )}

      <ol className="ck-prio-list">
        {(compact ? active.slice(0, 3) : active).map((p, i) => {
          const d = deptOf(p.dept)
          const isEditing = editing === p.id
          return (
            <li key={p.id} className="ck-prio-item" data-first={i === 0 ? '1' : '0'} style={{ ['--ck-dept' as never]: d?.accent }}>
              <span className="ck-prio-n">{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                {isEditing ? (
                  <input className="ck-search" defaultValue={p.title} autoFocus style={{ width: '100%' }}
                    onBlur={(e) => { void saveEdit(p, { title: e.target.value.trim() || p.title }); setEditing(null) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(null) }} />
                ) : (
                  <span className="ck-prio-title" onDoubleClick={() => setEditing(p.id)}>{p.title}</span>
                )}
                {(p.detail || d) && !compact && (
                  <span className="ck-prio-meta">
                    {d && <button className="ck-pill" style={{ padding: '1px 7px', fontSize: 11 }} onClick={() => nav(`/team/${d.key}`)}>{d.name}</button>}
                    {p.detail && <span>{p.detail}</span>}
                  </span>
                )}
                {compact && d && <span className="ck-prio-meta"><span style={{ color: 'var(--ck-dept, var(--ck-faint))' }}>{d.name}</span></span>}
              </span>
              <span className="ck-prio-actions">
                {!compact && <>
                  <button className="ck-pill" title="Move up" disabled={i === 0} onClick={() => void move(p, -1)}>↑</button>
                  <button className="ck-pill" title="Move down" disabled={i === active.length - 1} onClick={() => void move(p, 1)}>↓</button>
                </>}
                <button className="ck-pill" onClick={() => void setStatus(p, 'done')}>Done</button>
                <button className="ck-pill" onClick={() => void setStatus(p, 'parked')}>Park</button>
              </span>
            </li>
          )
        })}
      </ol>
      {compact && active.length > 3 && <button className="ck-pill" style={{ marginTop: 6 }} onClick={() => nav('/team')}>All {active.length} priorities</button>}

      {!compact && rest.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button className="ck-pill" onClick={() => setShowRest((v) => !v)}>{showRest ? 'Hide' : `Done and parked (${rest.length})`}</button>
          {showRest && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
              {rest.map((p) => (
                <div key={p.id} className="ck-prio-item" data-state={p.status}>
                  <span className="ck-prio-n" style={{ opacity: 0.5 }}>{p.status === 'done' ? '✓' : '‖'}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="ck-prio-title" style={{ color: 'var(--ck-muted)' }}>{p.title}</span>
                    {p.note && <span className="ck-prio-meta">{p.note}</span>}
                  </span>
                  <span className="ck-prio-actions">
                    <button className="ck-pill" onClick={() => void setStatus(p, 'active')}>Back in</button>
                    <button className="ck-pill" onClick={() => { void removePriority(p.id); setItems((l) => (l ?? []).filter((x) => x.id !== p.id)) }}>Remove</button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

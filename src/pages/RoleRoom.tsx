import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useBrand } from '../lib/brandContext'
import { listRoles, updateRole, retireRole, listRuns, listNotes, ackNote, ownsOf, defersOf, type Role, type RoleRun, type RoleNote } from '../lib/roles'
import { deptOf, seatFor } from '../lib/org'
import { agoLabel } from '../components/chrome/AssetCard'
import DeliverableView, { kindBadge } from '../components/DeliverableView'
import ConfirmButton from '../components/ConfirmButton'

/* ============================================================
   One seat's desk: who they are, what they have produced, and
   what colleagues have written to them. You brief a department
   from its room; this is where you read a member's own work.
   ============================================================ */

export default function RoleRoom() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { current: brand } = useBrand()
  const [role, setRole] = useState<Role | null>(null)
  const [roster, setRoster] = useState<Role[]>([])
  const [inbox, setInbox] = useState<RoleNote[]>([])
  const [runs, setRuns] = useState<RoleRun[]>([])
  const [viewRun, setViewRun] = useState<RoleRun | null>(null)

  useEffect(() => {
    (async () => {
      const all = await listRoles()
      const r = all.find((x) => x.id === id) ?? null
      setRole(r); setRoster(all)
      if (r) {
        const [rs, notes] = await Promise.all([listRuns(r.id), listNotes(r.id, 'in')])
        setRuns(rs); setInbox(notes.filter((n) => n.status === 'open'))
        setViewRun(rs.find((x) => x.id === params.get('run')) ?? rs[0] ?? null)
      }
    })()
    /* eslint-disable-next-line */
  }, [id, brand?.id])

  if (!role) return <div className="ck-page"><div className="ck-page-inner"><div className="ck-skeleton" style={{ height: 120 }} /></div></div>

  const dept = deptOf(role.dept)
  const seat = seatFor(role, brand?.name)

  return (
    <div className="ck-page" style={{ ['--ck-dept' as never]: dept?.accent }}>
      <div className="ck-page-inner" style={{ maxWidth: 1040 }}>
        <div className="ck-eyebrow">
          <button className="ck-pill" style={{ border: 'none', padding: '0 6px 0 0' }} onClick={() => nav(dept ? `/team/${dept.key}` : '/team')}>← {dept?.name ?? 'Team'}</button> {brand?.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6 }}>
          {dept && <span className="ck-dept-mark">{dept.mark}</span>}
          <div style={{ minWidth: 0 }}>
            <h1 className="ck-h1" style={{ margin: 0 }}>{role.name}</h1>
            <div style={{ fontSize: 12.5, color: 'var(--ck-faint)' }}>{role.title}{dept ? ` · ${role.seat === 'lead' ? 'leads' : 'in'} ${dept.name}` : ''}</div>
          </div>
        </div>
        <div style={{ color: 'var(--ck-muted)', fontSize: 13.5, maxWidth: '64ch', lineHeight: 1.55, marginTop: 12 }}>{role.charter}</div>
        <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--ck-faint)', maxWidth: '64ch', lineHeight: 1.55 }}>
          <span style={{ color: 'var(--ck-muted)' }}>Owns</span> {ownsOf(role, brand?.name)}.
          {defersOf(role, brand?.name) && <> <span style={{ color: 'var(--ck-muted)' }}>Hands over</span> {defersOf(role, brand?.name)}.</>}
          {seat?.learnsFrom && <> <span style={{ color: 'var(--ck-muted)' }}>Learns from</span> {seat.learnsFrom}.</>}
        </div>
        {role.seat === 'member' && dept && (
          <div className="ck-note" style={{ marginTop: 12 }}>You do not brief {role.name} directly: brief the {dept.name} lead and they bring {role.name} in when the work needs it.</div>
        )}

        <div className="ck-rolegrid">
          <div>
            {viewRun ? <DeliverableView run={viewRun} roster={roster} /> : (
              <div className="ck-empty"><div style={{ fontSize: 15, fontWeight: 500 }}>Nothing on the desk yet</div><p>{role.seat === 'member' ? 'Their work appears here once their lead briefs them.' : 'Brief them from the department room.'}</p></div>
            )}
          </div>
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {inbox.length > 0 && (
              <div>
                <h3 className="ck-h2">From colleagues</h3>
                {inbox.map((n) => {
                  const from = roster.find((r) => r.id === n.from_role_id)
                  return (
                    <div key={n.id} className="ck-handoff">
                      <div style={{ fontSize: 11.5, color: 'var(--ck-faint)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{from?.name ?? 'A colleague'} · {agoLabel(n.created_at)}</div>
                      <div style={{ fontSize: 13, fontWeight: 500, margin: '3px 0' }}>{n.subject}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--ck-muted)', lineHeight: 1.5 }}>{n.body}</div>
                      <button className="ck-pill" style={{ marginTop: 8 }} onClick={() => { void ackNote(n.id); setInbox((l) => l.filter((x) => x.id !== n.id)) }}>Dismiss</button>
                    </div>
                  )
                })}
              </div>
            )}
            <div>
              <h3 className="ck-h2">Desk</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {runs.map((r) => (
                  <button key={r.id} className="ck-item" data-active={viewRun?.id === r.id ? '1' : '0'} onClick={() => setViewRun(r)} style={{ padding: '7px 9px' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.output.title}</span>
                    <span className="ck-kbd" style={{ display: 'inline' }}>{r.kind && r.kind !== 'task' ? kindBadge(r.kind).toLowerCase() : agoLabel(r.created_at)}</span>
                  </button>
                ))}
                {runs.length === 0 && <div className="ck-note">Empty desk.</div>}
              </div>
            </div>
            <div>
              <h3 className="ck-h2">Standing instructions</h3>
              <textarea className="ck-search" style={{ minHeight: 64, resize: 'vertical', fontSize: 12.5, width: '100%' }} defaultValue={role.instructions}
                placeholder="Anything this seat should always know or always do."
                onBlur={(e) => { void updateRole(role.id, { instructions: e.target.value }); setRole({ ...role, instructions: e.target.value }) }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="ck-pill" onClick={() => { void updateRole(role.id, { enabled: !role.enabled }); setRole({ ...role, enabled: !role.enabled }) }}>
                  {role.enabled ? 'Pause seat' : 'Resume seat'}
                </button>
                <ConfirmButton onConfirm={async () => { await retireRole(role.id); nav(dept ? `/team/${dept.key}` : '/team') }} confirmLabel="Retire this seat?"
                  style={{ background: 'none', border: '1px solid var(--ck-line)', borderRadius: 999, padding: '5px 12px', fontSize: 12.5, color: 'var(--ck-muted)', cursor: 'pointer', fontFamily: 'var(--ck-font)' }}>
                  Retire
                </ConfirmButton>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

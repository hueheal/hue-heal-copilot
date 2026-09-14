import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBrand } from '../lib/brandContext'
import { listRoles, sendMeeting, listMeetings, briefingJobs, listRunsFor, type Role, type RoleJob, type Briefing } from '../lib/roles'
import { deptOf } from '../lib/org'
import { officeImage } from '../lib/office'
import { agoLabel } from '../components/chrome/AssetCard'
import DeliverableView from '../components/DeliverableView'

/* ============================================================
   The meeting room: an open house. Call any set of seats, one
   agenda; each answers from its remit and the Chief of staff
   writes the minutes when the last voice lands.
   ============================================================ */

export default function MeetingRoom() {
  const { current } = useBrand()
  const nav = useNavigate()
  const [roster, setRoster] = useState<Role[] | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [agenda, setAgenda] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [meetings, setMeetings] = useState<Briefing[]>([])
  const [openMeeting, setOpenMeeting] = useState<Briefing | null>(null)
  const [jobs, setJobs] = useState<RoleJob[]>([])
  const [runs, setRuns] = useState<Map<string, Parameters<typeof DeliverableView>[0]['run']>>(new Map())
  const [reading, setReading] = useState<string | null>(null)
  const [imgBroken, setImgBroken] = useState(false)

  useEffect(() => {
    setRoster(null); setOpenMeeting(null); setJobs([])
    Promise.all([listRoles(), listMeetings()]).then(([rs, ms]) => { setRoster(rs); setMeetings(ms) }).catch(() => setRoster([]))
  }, [current?.id])

  const seats = roster ?? []
  const leads = seats.filter((r) => r.seat === 'lead' && r.enabled)
  const chief = seats.find((r) => r.key === 'chief')

  async function loadMeeting(m: Briefing) {
    setOpenMeeting(m); setReading(null)
    const js = await briefingJobs(m.id)
    setJobs(js)
    const rs = await listRunsFor([...new Set(js.map((j) => j.role_id))])
    setRuns(new Map(rs.map((r) => [r.id, r])))
  }

  const activeCount = jobs.filter((j) => j.status === 'queued' || j.status === 'running').length
  useEffect(() => {
    if (!openMeeting || activeCount === 0) return
    const t = setInterval(() => { void loadMeeting(openMeeting) }, 5000)
    return () => clearInterval(t)
    /* eslint-disable-next-line */
  }, [openMeeting?.id, activeCount])

  async function call() {
    if (busy || !agenda.trim() || picked.size === 0) return
    setBusy(true); setNote(null)
    const attendees = seats.filter((r) => picked.has(r.id))
    const r = await sendMeeting(agenda, attendees)
    setBusy(false)
    if (r.error) { setNote(r.error); return }
    setAgenda(''); setPicked(new Set())
    if (r.briefing) { setMeetings((l) => [r.briefing!, ...l]); void loadMeeting(r.briefing) }
  }

  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const minutesJob = useMemo(() => (chief ? jobs.find((j) => j.role_id === chief.id && j.task.startsWith('DESK:')) : undefined), [jobs, chief])
  const voiceJobs = jobs.filter((j) => j.id !== minutesJob?.id)
  const readingRun = reading ? runs.get(reading) : null

  if (roster === null) return <div className="ck-page"><div className="ck-page-inner"><div className="ck-skeleton" style={{ height: 200, borderRadius: 20 }} /></div></div>

  return (
    <div className="ck-page" style={{ ['--ck-dept' as never]: '#B5632F' }}>
      <div className="ck-page-inner" style={{ maxWidth: 880 }}>
        <div className="ck-eyebrow"><button className="ck-pill" style={{ border: 'none', padding: '0 6px 0 0' }} onClick={() => nav('/team')}>← Team</button> {current?.name}</div>

        <div className="ck-scene" style={{ marginTop: 10 }}>
          {!imgBroken ? <img src={officeImage('meeting')} alt="" style={{ maxHeight: '30vh' }} onError={() => setImgBroken(true)} />
            : <div style={{ height: 120, background: 'linear-gradient(145deg, color-mix(in srgb, #B5632F 16%, var(--ck-surface-2)), var(--ck-surface-2))' }} />}
          <div className="ck-scene-veil">
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Meeting room</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Everyone you call, one agenda, minutes by {chief?.name ?? 'your chief'}.</div>
            </div>
          </div>
        </div>

        {/* Call a meeting */}
        <div className="ck-composer" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, color: 'var(--ck-faint)' }}>In the room</span>
            <button className="ck-pill" onClick={() => setPicked(new Set(leads.map((r) => r.id)))}>All leads</button>
            {picked.size > 0 && <button className="ck-pill" onClick={() => setPicked(new Set())}>Clear</button>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {seats.filter((r) => r.enabled).map((r) => {
              const d = deptOf(r.dept)
              return (
                <button key={r.id} className="ck-pill" data-on={picked.has(r.id) ? '1' : '0'} style={{ ['--ck-dept' as never]: d?.accent }} onClick={() => toggle(r.id)}>
                  {r.name}{r.seat === 'member' ? '' : ' ·'} {r.seat === 'member' ? '' : d?.name}
                </button>
              )
            })}
          </div>
          <textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={2}
            placeholder="The agenda, in a sentence or two. Everyone in the room answers from their own remit."
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void call() } }} />
          <div className="ck-composer-row">
            <span style={{ fontSize: 11.5, color: 'var(--ck-faint)' }}>{picked.size ? `${picked.size} in the room` : 'Pick who attends'}</span>
            <button className="ck-go" disabled={busy || !agenda.trim() || picked.size === 0} onClick={() => void call()}>{busy ? 'Calling…' : 'Call the meeting'}</button>
          </div>
        </div>
        {note && <div className="ck-note" role="status">{note}</div>}

        {/* The open meeting */}
        {openMeeting && (
          <div style={{ marginTop: 24 }}>
            <div className="ck-board-title"><b>Meeting</b> {agoLabel(openMeeting.created_at)}</div>
            <div style={{ fontSize: 13, color: 'var(--ck-muted)', lineHeight: 1.55, whiteSpace: 'pre-wrap', borderLeft: '2px solid var(--ck-line-strong)', padding: '2px 0 2px 12px', marginBottom: 12 }}>{openMeeting.text}</div>
            {minutesJob && (
              <div className="ck-job" data-state={minutesJob.status === 'done' ? 'done' : minutesJob.status === 'failed' ? 'failed' : 'working'} style={{ marginBottom: 10, borderColor: 'color-mix(in srgb, var(--ck-accent) 40%, var(--ck-line))' }}>
                <span className="ck-dept-mark" data-size="s">FO</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="ck-job-task">Minutes</span>
                  <span className="ck-job-meta">{minutesJob.status === 'done' ? 'Decisions, actions, what waits on you' : minutesJob.status === 'failed' ? 'Could not be written' : 'Being written from the room…'}</span>
                </span>
                {minutesJob.status === 'done' && minutesJob.run_id && runs.get(minutesJob.run_id) && (
                  <button className="ck-pill" data-on="1" onClick={() => setReading(reading === minutesJob.run_id ? null : minutesJob.run_id)}>{reading === minutesJob.run_id ? 'Close' : 'Read'}</button>
                )}
              </div>
            )}
            <div className="ck-jobs" style={{ margin: 0 }}>
              {voiceJobs.map((j) => {
                const who = seats.find((r) => r.id === j.role_id)
                const d = deptOf(j.dept)
                const r = j.run_id ? runs.get(j.run_id) : undefined
                const st = j.status === 'done' ? 'done' : j.status === 'failed' ? 'failed' : 'working'
                return (
                  <div key={j.id} className="ck-job" data-state={st} style={{ ['--ck-dept' as never]: d?.accent }}>
                    <span className="ck-dept-mark" data-size="s">{d?.mark ?? '··'}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="ck-job-task">{who?.name ?? 'A seat'}</span>
                      <span className="ck-job-meta">{st === 'working' ? 'Speaking…' : st === 'failed' ? `Could not answer${j.error ? `: ${j.error.slice(0, 80)}` : ''}` : (r?.output.summary ?? 'Answered').slice(0, 110)}</span>
                    </span>
                    {r && <button className="ck-pill" onClick={() => setReading(reading === j.run_id ? null : j.run_id)}>{reading === j.run_id ? 'Close' : 'Read'}</button>}
                  </div>
                )
              })}
            </div>
            {readingRun && <div style={{ marginTop: 14 }}><DeliverableView run={readingRun} roster={seats} /></div>}
          </div>
        )}

        {/* Past meetings */}
        {meetings.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div className="ck-board-title"><b>Past meetings</b></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {meetings.map((m) => (
                <button key={m.id} className="ck-item" data-active={openMeeting?.id === m.id ? '1' : '0'} style={{ padding: '8px 10px' }} onClick={() => void loadMeeting(m)}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.text.split('\n')[0]}</span>
                  <span className="ck-kbd" style={{ display: 'inline' }}>{agoLabel(m.created_at)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

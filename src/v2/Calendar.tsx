import { useEffect, useMemo, useState } from 'react'
import { ArrowsClockwise } from '@phosphor-icons/react'
import { useLife } from './V2App'
import { listEvents, syncCalendar, timeOf, type LifeEvent } from './life'

/* Calendar: the next fourteen days as a quiet agenda. Outlook (or Google)
   is read through its published calendar link; anything Copilot books for
   you lives here too. */

const DAYS = 14

function dayLabel(d: Date): string {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - today.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
}

export default function Calendar() {
  const { profile, setProfile, inLens, colorOf, version, bump, prefill } = useLife()
  const [events, setEvents] = useState<LifeEvent[] | null>(null)
  const [feed, setFeed] = useState(profile.calendar_ics)
  const [status, setStatus] = useState<string | null>(null)
  useEffect(() => setFeed(profile.calendar_ics), [profile.calendar_ics])

  useEffect(() => {
    const from = new Date(); from.setHours(0, 0, 0, 0)
    const to = new Date(from.getTime() + DAYS * 86400000)
    void listEvents(from.toISOString(), to.toISOString()).then(setEvents)
  }, [version])

  const sync = async () => {
    setStatus('Reading your calendar…')
    const r = await syncCalendar()
    setStatus(r.error ?? r.note ?? `${r.imported ?? 0} events for the next two months.`)
    bump()
  }
  const connect = async () => {
    const url = feed.trim()
    if (!/^(https?|webcal):\/\//i.test(url)) { setStatus('That does not look like a calendar link. It should start with https:// or webcal://.'); return }
    setProfile({ calendar_ics: url })
    window.setTimeout(() => void sync(), 300)
  }

  const days = useMemo(() => {
    const out: { date: Date; items: LifeEvent[] }[] = []
    const start = new Date(); start.setHours(0, 0, 0, 0)
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(start.getTime() + i * 86400000)
      const items = (events ?? []).filter((e) => inLens(e.brand_id) && new Date(e.starts_at).toDateString() === d.toDateString())
      out.push({ date: d, items })
    }
    return out
  }, [events, inLens])

  return (
    <div className="v2-col v2-calendar">
      <div className="v2-page-head">
        <h1 className="v2-h-page">Calendar</h1>
        {profile.calendar_ics && <button className="v2-chip" onClick={() => void sync()}><ArrowsClockwise size={15} />Sync</button>}
      </div>

      {!profile.calendar_ics && (
        <section className="v2-connect">
          <h2>Connect your Outlook calendar</h2>
          <ol>
            <li>In Outlook on the web, open Settings, then Calendar, then Shared calendars.</li>
            <li>Under Publish a calendar, choose your calendar and “Can view all details”, then Publish.</li>
            <li>Copy the ICS link and paste it here.</li>
          </ol>
          <form onSubmit={(e) => { e.preventDefault(); void connect() }}>
            <input type="url" name="calendar-feed" autoComplete="off" spellCheck={false} inputMode="url" value={feed} onChange={(e) => setFeed(e.target.value)} placeholder="https://outlook.office365.com/owa/calendar/…/calendar.ics" aria-label="Calendar link" />
            <button className="v2-chip" data-primary="1" type="submit">Connect</button>
          </form>
          <p className="v2-fine">Read only: Copilot sees your events but cannot change Outlook. Anyone with the link can view it, so keep it private.</p>
        </section>
      )}
      {status && <p className="v2-quiet" role="status">{status}</p>}

      <div className="v2-agenda">
        {events === null ? <div className="v2-skeleton" style={{ height: 240 }} /> : days.filter((d, i) => d.items.length || i < 2).map((d) => (
          <section key={d.date.toISOString()} className="v2-agenda-day">
            <h2>{dayLabel(d.date)}</h2>
            {d.items.length ? (
              <ul>
                {d.items.map((e) => (
                  <li key={e.id} style={{ ['--c' as never]: colorOf(e.brand_id) }}>
                    <time>{e.all_day ? 'All day' : `${timeOf(e.starts_at)}${e.ends_at ? ` to ${timeOf(e.ends_at)}` : ''}`}</time>
                    <span><b>{e.title}</b>{e.location && <small>{e.location}</small>}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="v2-quiet">Free.</p>}
          </section>
        ))}
      </div>
      <button className="v2-chip" onClick={() => prefill('Put in my calendar: ')}>Add something</button>
    </div>
  )
}

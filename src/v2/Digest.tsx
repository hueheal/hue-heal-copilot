import { useCallback, useEffect, useState } from 'react'
import { ArrowsClockwise, PaperPlaneTilt, X } from '@phosphor-icons/react'
import { useLife } from './V2App'
import { digestPreview, digestResend, digestRun, listDigests, live, type DigestLens, type DigestRow } from './life'
import RULES from '../../supabase/functions/_shared/digest-rules.json'

/* The Founder's Digest: the daily email from Hue & Heal to its founder. This
   page shows the latest one as it arrived, the past fortnight, and what the
   digest covers: when it comes, where it goes, her interests and the
   coaching track. The Mac writes it on the Claude plan; the cloud is the
   backup when the Mac is asleep. */

const CURRICULUM = RULES.curriculum as { title: string; brief: string }[]
const STAGE: Record<string, string> = {
  mac: 'Waiting for your Mac', news: 'Researching the news', write: 'Writing', filed: 'Saving the posts and steps',
  images: 'Making the post images', send: 'Ready, sends at send time', sent: 'Sent', failed: 'Did not finish',
}
const longDate = (d: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`))
const timeOf = (iso: string) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(new Date(iso))
const cost = (usd?: number) => (usd ? `£${(usd * 0.79).toFixed(2)}` : 'no API cost')

export default function Digest() {
  const { profile, setProfile } = useLife()
  const lens: DigestLens = profile.digest_lens ?? {}
  const [rows, setRows] = useState<DigestRow[] | null>(null)
  const [picked, setPicked] = useState<string | undefined>()
  const [preview, setPreview] = useState<{ html?: string; subject?: string; date?: string; error?: string } | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const r = await listDigests()
    setRows(r)
    setPreview(await digestPreview(picked))
  }, [picked])
  useEffect(() => { void load() }, [load])

  const save = (patch: Partial<DigestLens>) => setProfile({ digest_lens: { ...lens, ...patch } })
  const today = rows?.[0]
  const run = async () => {
    if (!window.confirm('Write a fresh digest now in the cloud and email it as soon as it is ready? This uses the API (about 50p).')) return
    setBusy(true); const r = await digestRun(); setBusy(false)
    setNote(r.error ?? r.note ?? null)
    window.setTimeout(() => void load(), 4000)
  }
  const resend = async () => {
    setBusy(true); const r = await digestResend(preview?.date); setBusy(false)
    setNote(r.error ?? r.note ?? null)
  }

  return (
    <div className="v2-col v2-wide v2-digest">
      <div className="v2-page-head">
        <h1 className="v2-h-page">Digest</h1>
        <div className="v2-radar-status">
          {today && <span className="v2-quiet">{today.stage === 'sent' && today.sent_at ? `${longDate(today.digest_date).split(' ')[0]}'s arrived ${timeOf(today.sent_at)}` : STAGE[today.stage] ?? today.stage}</span>}
          <button className="v2-chip" disabled={busy || !preview?.html} onClick={() => void resend()}><PaperPlaneTilt size={15} />Send again</button>
          <button className="v2-chip" disabled={busy} onClick={() => void run()}><ArrowsClockwise size={15} className={busy ? 'v2-spin' : undefined} />Write a fresh one</button>
        </div>
      </div>
      <p className="v2-radar-sub">Every morning at {lens.send_at ?? '07:30'}: today's three, the industry news, one ready post for each channel, a coaching lesson and dated next steps for each company.</p>
      {note && <p className="v2-quiet" role="status">{note}</p>}

      <div className="v2-digest-grid">
        <section className="v2-digest-mail">
          {preview?.html
            ? <iframe title={preview.subject ?? 'The digest'} srcDoc={preview.html} className="v2-digest-frame" sandbox="allow-popups allow-popups-to-escape-sandbox" />
            : <div className="v2-glass v2-digest-empty"><p className="v2-quiet">{preview === null ? 'Loading the latest digest…' : preview.error ?? 'No digest yet.'}</p></div>}
        </section>

        <aside className="v2-digest-side">
          <section className="v2-glass v2-digest-panel">
            <h2 className="v2-label">Delivery</h2>
            <label className="v2-port-field"><span>Arrives at</span>
              <input type="time" name="send-at" value={lens.send_at ?? '07:30'} step={900} onChange={(e) => save({ send_at: e.target.value, prep_at: shift(e.target.value, -60) })} />
            </label>
            <label className="v2-port-field"><span>Sent to</span>
              <input type="email" name="digest-to" autoComplete="off" spellCheck={false} value={lens.to ?? ''} placeholder="Your Copilot sign-in email" onChange={(e) => save({ to: e.target.value.trim() || null })} />
            </label>
            <Toggle label="Write it on my Mac (free on the Claude plan)" hint="If the Mac is asleep, the cloud writes it at send time instead, for about 50p." on={lens.mac !== false} set={(v) => save({ mac: v })} />
            <Toggle label="Allow reels" hint="Off: posts are single images or carousels. On: one post a day may be a short reel script with a cover." on={!!lens.allow_video} set={(v) => save({ allow_video: v })} />
            <Toggle label="Send the digest" hint="Off pauses it until you turn it back on." on={lens.enabled !== false} set={(v) => save({ enabled: v })} />
          </section>

          <section className="v2-glass v2-digest-panel">
            <h2 className="v2-label">What you want to learn about</h2>
            <p className="v2-fine">The news and the coaching lean towards these. You can also tell Copilot in chat: "add biophilic design to my digest".</p>
            <Interests value={lens.interests ?? []} onChange={(v) => save({ interests: v })} />
          </section>

          <section className="v2-glass v2-digest-panel">
            <h2 className="v2-label">Founder coaching</h2>
            <p className="v2-quiet">Next: lesson {((lens.coaching_next ?? 0) % CURRICULUM.length) + 1} of {CURRICULUM.length}, {CURRICULUM[(lens.coaching_next ?? 0) % CURRICULUM.length].title}</p>
            <ol className="v2-digest-track">
              {CURRICULUM.map((c, i) => (
                <li key={c.title} data-done={i < (lens.coaching_next ?? 0) ? '1' : undefined} data-next={i === (lens.coaching_next ?? 0) ? '1' : undefined}>
                  <button className="v2-link" title={c.brief} onClick={() => save({ coaching_next: i })}>{c.title}</button>
                </li>
              ))}
            </ol>
            <p className="v2-fine">Tap a lesson to make it the next one.</p>
          </section>

          {!!rows?.length && (
            <section className="v2-glass v2-digest-panel">
              <h2 className="v2-label">Past digests</h2>
              <ul className="v2-digest-past">
                {rows.map((r) => (
                  <li key={r.id}>
                    <button className="v2-link" data-on={(preview?.date ?? rows[0].digest_date) === r.digest_date ? '1' : undefined} onClick={() => setPicked(r.digest_date)}>
                      <span>{longDate(r.digest_date)}</span>
                      <small>{r.headline ?? STAGE[r.stage]}</small>
                    </button>
                    <span className="v2-fine">{r.source === 'mac' ? 'Mac' : 'Cloud'}, {cost(r.usage?.usd)}{r.stage === 'failed' && r.error ? `. ${r.error}` : ''}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!live && <p className="v2-fine">Sample mode: edits here are not saved.</p>}
        </aside>
      </div>
    </div>
  )
}

function shift(t: string, mins: number): string {
  const [h, m] = t.split(':').map(Number)
  const x = (((h * 60 + m + mins) % 1440) + 1440) % 1440
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`
}

function Toggle({ label, hint, on, set }: { label: string; hint: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="v2-digest-toggle">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} />
      <span><b>{label}</b><small>{hint}</small></span>
    </label>
  )
}

function Interests({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('')
  const add = () => { const n = draft.trim(); if (!n || value.some((x) => x.toLowerCase() === n.toLowerCase())) { setDraft(''); return } onChange([...value, n]); setDraft('') }
  return (
    <div className="v2-chips">
      {value.map((k) => (
        <span key={k} className="v2-chip" data-static="1">{k}<button className="v2-x" aria-label={`Remove ${k}`} onClick={() => onChange(value.filter((x) => x !== k))}><X size={11} /></button></span>
      ))}
      <input className="v2-chip-input" name="digest-interest" autoComplete="off" value={draft} placeholder="Add a topic…" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} onBlur={add} aria-label="Add a topic to the digest" />
    </div>
  )
}

// ============================================================================
// life-sync: the life OS's outside world, two operations, all as the user.
// (Opportunities are found by radar-engine; UK Contracts Finder refuses cloud
// servers, so its notices come from scripts/tender-radar.mjs on the Mac.)
//   { op: 'calendar' }            import the published ICS feed (Outlook or
//                                 Google) into life_events for the next 60 days.
//   { op: 'test', actionId, edits? }
//                                 send a copy of a drafted email to the founder
//                                 only, marked as a test; the draft stays pending.
//   { op: 'decide', actionId, approve, edits? }
//                                 the founder's yes or no on a pending action;
//                                 edits (to, subject, body) are their changes.
//                                 An approved email is sent through Resend
//                                 from the business's personal sender.
// Secrets: RESEND_API_KEY (studio), RESEND_API_KEY_REMEDAE (see _shared/resend.ts).
// ============================================================================
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'
import { resendKeyFor } from '../_shared/resend.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const FALLBACK_FROM = 'Maria <maria@hueandheal.com>'
const TZ = 'Europe/London'

type Json = Record<string, unknown>

/* ---- Calendar (ICS) ---- */
function londonToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number): Date {
  // Treat the wall-clock time as Europe/London, whatever the server's zone.
  const guess = Date.UTC(y, mo - 1, d, h, mi, s)
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(guess))
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asLondon = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'))
  return new Date(guess - (asLondon - guess))
}
function parseIcsDate(v: string, params: string): { date: Date; allDay: boolean } | null {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/)
  if (!m) return null
  const [, y, mo, d, h, mi, s, z] = m
  if (!h || /VALUE=DATE(?!-)/.test(params)) return { date: londonToUtc(+y, +mo, +d, 0, 0, 0), allDay: true }
  if (z) return { date: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)), allDay: false }
  return { date: londonToUtc(+y, +mo, +d, +h, +mi, +s), allDay: false }
}
const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

function expand(start: Date, rrule: string, until: Date): Date[] {
  const r = Object.fromEntries(rrule.split(';').map((kv) => kv.split('=') as [string, string]))
  const freq = r.FREQ
  const interval = Math.max(1, Number(r.INTERVAL ?? 1))
  const count = r.COUNT ? Number(r.COUNT) : Infinity
  const end = r.UNTIL ? parseIcsDate(r.UNTIL, '')?.date ?? until : until
  const stop = end < until ? end : until
  const out: Date[] = []
  if (freq === 'DAILY') {
    for (let t = new Date(start), n = 0; t <= stop && n < count && out.length < 400; t = new Date(t.getTime() + interval * 86400000), n++) out.push(t)
  } else if (freq === 'WEEKLY') {
    const by = (r.BYDAY ? r.BYDAY.split(',') : [DAYS[start.getUTCDay()]]).map((x: string) => DAYS.indexOf(x.slice(-2)))
    const weekStart = new Date(start.getTime() - start.getUTCDay() * 86400000)
    let n = 0
    for (let w = 0; out.length < 400; w += interval) {
      const base = weekStart.getTime() + w * 7 * 86400000
      if (base > stop.getTime()) break
      for (const day of by.sort()) {
        const t = new Date(base + day * 86400000)
        if (t < start || t > stop || n >= count) continue
        out.push(t); n++
      }
      if (n >= count) break
    }
  } else if (freq === 'MONTHLY' || freq === 'YEARLY') {
    for (let k = 0, n = 0; n < count && out.length < 60; k += interval, n++) {
      const t = new Date(start)
      if (freq === 'MONTHLY') t.setUTCMonth(t.getUTCMonth() + k); else t.setUTCFullYear(t.getUTCFullYear() + k)
      if (t > stop) break
      out.push(t)
    }
  } else out.push(start)
  return out
}

async function calendar(db: SupabaseClient, uid: string) {
  const { data: prof } = await db.from('life_profile').select('calendar_ics').maybeSingle()
  let url = String(prof?.calendar_ics ?? '').trim()
  if (!url) return { imported: 0, note: 'Connect a calendar feed in Calendar first.' }
  url = url.replace(/^webcal:\/\//i, 'https://')
  const res = await fetch(url).catch(() => null)
  if (!res?.ok) return { imported: 0, error: `The calendar feed did not answer (${res?.status ?? 'no response'}).` }
  const raw = (await res.text()).replace(/\r?\n[ \t]/g, '')
  const now = new Date()
  const from = new Date(now.getTime() - 86400000)
  const until = new Date(now.getTime() + 60 * 86400000)
  const rows: Json[] = []
  for (const block of raw.split('BEGIN:VEVENT').slice(1)) {
    const body = block.split('END:VEVENT')[0]
    const field = (name: string) => {
      const m = body.match(new RegExp(`^${name}((?:;[^:\\r\\n]*)?):(.*)$`, 'm'))
      return m ? { params: m[1] ?? '', value: m[2].trim() } : null
    }
    if (/^STATUS:CANCELLED/m.test(body)) continue
    const uid2 = field('UID')?.value ?? ''
    const ds = field('DTSTART'); if (!ds) continue
    const start = parseIcsDate(ds.value, ds.params); if (!start) continue
    const de = field('DTEND')
    const end = de ? parseIcsDate(de.value, de.params)?.date ?? null : null
    const dur = end ? end.getTime() - start.date.getTime() : 0
    const title = (field('SUMMARY')?.value ?? 'Busy').replace(/\\([,;\\])/g, '$1').replace(/\\n/gi, ' ').slice(0, 300)
    const location = (field('LOCATION')?.value ?? '').replace(/\\([,;\\])/g, '$1').slice(0, 200)
    const rr = field('RRULE')?.value
    const starts = rr ? expand(start.date, rr, until) : [start.date]
    for (const s of starts) {
      if (s < from || s > until) continue
      rows.push({ owner: uid, source: 'ics', ext_id: `${uid2}|${s.toISOString()}`, title, location, all_day: start.allDay, starts_at: s.toISOString(), ends_at: dur ? new Date(s.getTime() + dur).toISOString() : null })
    }
  }
  // Mirror the feed: drop imported events in the window, then write it fresh.
  await db.from('life_events').delete().eq('source', 'ics').gte('starts_at', from.toISOString())
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from('life_events').upsert(rows.slice(i, i + 200), { onConflict: 'owner,source,ext_id' })
    if (error) return { imported: i, error: error.message }
  }
  return { imported: rows.length }
}

/* ---- Sending ---- */
async function sendEmail(p: { to: string; subject: string; body: string; from?: string }): Promise<{ id?: string; error?: string }> {
  const from = p.from || FALLBACK_FROM
  const { key, missing } = resendKeyFor(from)
  if (!key) return { error: missing }
  const replyTo = from.match(/<([^>]+)>/)?.[1] ?? from
  const html = `<div style="font-family:-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.6;color:#1e1b18">${p.body.split(/\n{2,}/).map((para) => `<p style="margin:0 0 14px">${para.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`).join('')}</div>`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [p.to], subject: p.subject, text: p.body, html, reply_to: replyTo }),
  })
  const out = await res.json().catch(() => ({})) as { id?: string; message?: string }
  return res.ok && out.id ? { id: out.id } : { error: out.message ?? `Resend ${res.status}` }
}
const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/
type Edits = { to?: string; subject?: string; body?: string }
function applyEdits(p: { to: string; subject: string; body: string; from?: string }, edits?: Edits) {
  const out = { ...p }
  if (!edits) return out
  if (typeof edits.to === 'string') out.to = edits.to.trim()
  if (typeof edits.subject === 'string' && edits.subject.trim()) out.subject = edits.subject.trim().slice(0, 300)
  if (typeof edits.body === 'string' && edits.body.trim()) out.body = edits.body.slice(0, 20000)
  return out
}

/* A test goes to the founder alone, exactly as the recipient would see it,
   with the intended recipient noted at the top. The draft stays pending. */
async function testSend(db: SupabaseClient, actionId: string, me: string, edits?: Edits) {
  if (!EMAIL_RE.test(me)) return { error: 'Your account has no email address to send a test to.' }
  const { data: a } = await db.from('life_actions').select('kind, status, payload').eq('id', actionId).maybeSingle()
  if (!a || a.kind !== 'email') return { error: 'Not found.' }
  if (a.status !== 'pending') return { error: 'That email has already been decided.' }
  const p = applyEdits(a.payload as { to: string; subject: string; body: string; from?: string }, edits)
  const r = await sendEmail({ ...p, to: me, subject: `[Test] ${p.subject}`, body: `Test copy. This would go to: ${p.to || '(no recipient yet)'}\n\n${p.body}` })
  return r.error ? { error: r.error } : { sentTo: me }
}

/* ---- Approvals ---- */
async function decide(db: SupabaseClient, actionId: string, approve: boolean, edits?: Edits) {
  const { data: a } = await db.from('life_actions').select('*').eq('id', actionId).maybeSingle()
  if (!a) return { error: 'Not found.' }
  if (a.status !== 'pending') return { status: a.status }
  const stamp = new Date().toISOString()
  if (!approve) { await db.from('life_actions').update({ status: 'declined', decided_at: stamp }).eq('id', actionId); return { status: 'declined' } }
  if (a.kind === 'email') {
    // The founder's own changes on the card win, and are kept on the record.
    const p = applyEdits(a.payload as { to: string; subject: string; body: string; from?: string }, edits)
    if (edits) await db.from('life_actions').update({ payload: p }).eq('id', actionId)
    if (!EMAIL_RE.test(p.to ?? '')) return { error: 'Add a valid address for who it goes to.' }
    const r = await sendEmail(p)
    await db.from('life_actions').update({ status: r.id ? 'sent' : 'failed', decided_at: stamp, result: r.id ? `Sent (${r.id})` : r.error }).eq('id', actionId)
    return r.id ? { status: 'sent' } : { status: 'failed', error: r.error }
  }
  // Bookings cannot be made directly yet: approving turns it into the next task.
  const p = a.payload as { what?: string; when?: string; where?: string }
  await db.from('life_tasks').insert({ title: `Book: ${p.what ?? a.summary}${p.when ? `, ${p.when}` : ''}${p.where ? `, ${p.where}` : ''}`, brand_id: a.brand_id, source: 'chat', is_now: false })
  await db.from('life_actions').update({ status: 'approved', decided_at: stamp, result: 'Added to your tasks' }).eq('id', actionId)
  return { status: 'approved' }
}

/* The user id from the JWT. The database checks the token's signature on
   every query, so a forged token fails at the first read below. */
function emailOf(jwt: string): string {
  try { return String(JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).email ?? '') } catch { return '' }
}
function subOf(jwt: string): string | null {
  try {
    const p = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof p.sub === 'string' && Number(p.exp) * 1000 > Date.now() ? p.sub : null
  } catch { return null }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
  const db = createClient(SUPABASE_URL, ANON, { global: { headers: { authorization: auth } } })
  const uid = subOf(auth.slice(7))
  if (!uid) return json({ error: 'Your session has expired. Sign in again.' }, 401)
  const { error: authErr } = await db.from('life_profile').select('owner').limit(1)
  if (authErr) return json({ error: 'Your session has expired. Sign in again.' }, 401)
  const body = await req.json().catch(() => ({})) as { op?: string; actionId?: string; approve?: boolean; edits?: Edits }
  try {
    if (body.op === 'calendar') return json(await calendar(db, uid))
    if (body.op === 'test' && body.actionId) return json(await testSend(db, body.actionId, emailOf(auth.slice(7)), body.edits))
    if (body.op === 'decide' && body.actionId) return json(await decide(db, body.actionId, !!body.approve, body.edits))
    return json({ error: 'Unknown op' }, 400)
  } catch (e) {
    console.error('life-sync', body.op, (e as Error).message)
    return json({ error: 'Something went wrong. Try again.' }, 500)
  }
})

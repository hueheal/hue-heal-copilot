// ============================================================================
// life-sync: the life OS's outside world, three operations, all as the user.
//   { op: 'tenders' }             scan UK Contracts Finder for the founder's
//                                 tender keywords; new notices land in the
//                                 pipeline as kind 'tender', stage 'new'.
//   { op: 'calendar' }            import the published ICS feed (Outlook or
//                                 Google) into life_events for the next 60 days.
//   { op: 'decide', actionId, approve }
//                                 the founder's yes or no on a pending action.
//                                 An approved email is sent through Resend
//                                 from the business's personal sender.
// Secrets: RESEND_API_KEY (already set for newsletters).
// ============================================================================
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FALLBACK_FROM = 'Maria <maria@hueandheal.com>'
const TZ = 'Europe/London'

type Json = Record<string, unknown>

/* ---- Tender radar ---- */
async function tenders(db: SupabaseClient, uid: string) {
  const { data: prof } = await db.from('life_profile').select('tender_keywords').maybeSingle()
  const phrases = ((prof?.tender_keywords as string[] | undefined) ?? []).map((s) => s.trim()).filter(Boolean)
  if (!phrases.length) return { added: 0, scanned: 0, note: 'Add tender keywords in Plan first.' }
  const rows: Json[] = []
  const seen = new Set<string>()
  for (const phrase of phrases.slice(0, 10)) {
    const res = await fetch('https://www.contractsfinder.service.gov.uk/api/rest/2/search_notices/json', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ searchCriteria: { keyword: phrase, statuses: ['Open'], types: ['Contract', 'Tender', 'EarlyEngagement'] }, size: 40 }),
    }).catch(() => null)
    if (!res?.ok) continue
    const d = await res.json().catch(() => ({})) as { noticeList?: { item: Json }[] }
    const needle = phrase.toLowerCase()
    for (const n of d.noticeList ?? []) {
      const i = n.item
      const id = String(i.id)
      const hay = `${i.title ?? ''} ${i.description ?? ''}`.toLowerCase()
      if (seen.has(id) || !hay.includes(needle)) continue
      seen.add(id)
      const value = Math.max(Number(i.valueLow ?? 0), Number(i.valueHigh ?? 0))
      rows.push({
        owner: uid, kind: 'tender', source: 'tender_radar', source_ref: id, stage: 'new',
        title: String(i.title ?? 'Untitled notice').slice(0, 300), org: String(i.organisationName ?? '').slice(0, 200),
        value_pence: value ? Math.round(value * 100) : null, deadline: i.deadlineDate ?? null,
        url: `https://www.contractsfinder.service.gov.uk/Notice/${id}`,
        notes: `Matched “${phrase}”. ${String(i.description ?? '').replace(/\s+/g, ' ').slice(0, 700)}`,
      })
    }
  }
  if (!rows.length) return { added: 0, scanned: phrases.length }
  // Existing notices keep their stage: only genuinely new ones are inserted.
  const { data, error } = await db.from('life_pipeline').upsert(rows, { onConflict: 'owner,source,source_ref', ignoreDuplicates: true }).select('id')
  if (error) return { added: 0, scanned: phrases.length, error: error.message }
  return { added: (data ?? []).length, scanned: phrases.length }
}

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

/* ---- Approvals ---- */
async function decide(db: SupabaseClient, actionId: string, approve: boolean) {
  const { data: a } = await db.from('life_actions').select('*').eq('id', actionId).maybeSingle()
  if (!a) return { error: 'Not found.' }
  if (a.status !== 'pending') return { status: a.status }
  const stamp = new Date().toISOString()
  if (!approve) { await db.from('life_actions').update({ status: 'declined', decided_at: stamp }).eq('id', actionId); return { status: 'declined' } }
  if (a.kind === 'email') {
    if (!RESEND_API_KEY) return { error: 'Email is not configured on the server (RESEND_API_KEY).' }
    const p = a.payload as { to: string; subject: string; body: string; from?: string }
    const from = p.from || FALLBACK_FROM
    const replyTo = from.match(/<([^>]+)>/)?.[1] ?? from
    const html = `<div style="font-family:-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.6;color:#1e1b18">${p.body.split(/\n{2,}/).map((para) => `<p style="margin:0 0 14px">${para.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`).join('')}</div>`
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [p.to], subject: p.subject, text: p.body, html, reply_to: replyTo }),
    })
    const out = await res.json().catch(() => ({})) as { id?: string; message?: string }
    const ok = res.ok && !!out.id
    await db.from('life_actions').update({ status: ok ? 'sent' : 'failed', decided_at: stamp, result: ok ? `Sent (${out.id})` : (out.message ?? `Resend ${res.status}`) }).eq('id', actionId)
    return ok ? { status: 'sent' } : { status: 'failed', error: out.message ?? `Resend ${res.status}` }
  }
  // Bookings cannot be made directly yet: approving turns it into the next task.
  const p = a.payload as { what?: string; when?: string; where?: string }
  await db.from('life_tasks').insert({ title: `Book: ${p.what ?? a.summary}${p.when ? `, ${p.when}` : ''}${p.where ? `, ${p.where}` : ''}`, brand_id: a.brand_id, source: 'chat', is_now: false })
  await db.from('life_actions').update({ status: 'approved', decided_at: stamp, result: 'Added to your tasks' }).eq('id', actionId)
  return { status: 'approved' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
  const db = createClient(SUPABASE_URL, ANON, { global: { headers: { authorization: auth } } })
  const { data: userData } = await db.auth.getUser()
  const uid = userData.user?.id
  if (!uid) return json({ error: 'Unauthorized' }, 401)
  const body = await req.json().catch(() => ({})) as { op?: string; actionId?: string; approve?: boolean }
  try {
    if (body.op === 'tenders') return json(await tenders(db, uid))
    if (body.op === 'calendar') return json(await calendar(db, uid))
    if (body.op === 'decide' && body.actionId) return json(await decide(db, body.actionId, !!body.approve))
    return json({ error: 'Unknown op' }, 400)
  } catch (e) {
    console.error('life-sync', body.op, (e as Error).message)
    return json({ error: 'Something went wrong. Try again.' }, 500)
  }
})

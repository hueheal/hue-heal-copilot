// ============================================================================
// Hue & Heal — Studio Co-pilot :: send-newsletter
// Sends a composed newsletter via Resend — a test to one address, or a batch to
// the subscriber list. The app builds the on-brand HTML; this stays a thin sender.
// Secrets: RESEND_API_KEY, optional RESEND_FROM (e.g. "Hue & Heal <hello@hueandheal.com>").
// Deploy:  npx supabase functions deploy send-newsletter --project-ref <ref>
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Hue & Heal <onboarding@resend.dev>'

interface Body {
  subject: string
  html: string
  recipients: string[]
}

async function sendBatch(items: { from: string; to: string[]; subject: string; html: string }[]) {
  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(items),
  })
  const text = await res.text()
  return { ok: res.ok, status: res.status, text }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!RESEND_API_KEY) return json({ error: 'RESEND_API_KEY is not set on the function.' }, 500)

  let body: Body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  const recipients = (body.recipients ?? []).map((r) => r.trim()).filter(Boolean)
  if (!recipients.length) return json({ error: 'No recipients' }, 400)
  if (!body.subject || !body.html) return json({ error: 'subject and html are required' }, 400)

  // One message per recipient (privacy: no shared To). Chunk to 100 per batch call.
  let sent = 0
  const errors: string[] = []
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100)
    const items = chunk.map((to) => ({ from: RESEND_FROM, to: [to], subject: body.subject, html: body.html }))
    try {
      const r = await sendBatch(items)
      if (r.ok) sent += chunk.length
      else errors.push(`${r.status}: ${r.text.slice(0, 200)}`)
    } catch (e) {
      errors.push(String(e))
    }
  }

  if (sent === 0) return json({ error: errors[0] ?? 'Send failed', errors }, 502)
  return json({ sent, total: recipients.length, errors })
})

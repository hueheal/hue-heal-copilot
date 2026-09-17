// ============================================================================
// Hue & Heal :: founder-note
// Post one message, verbatim, to the founder's paired Telegram chat. Used for
// overnight run reports that must arrive exactly as written, with no persona
// rewriting them. Self-contained on purpose: no shared imports, so it can be
// deployed on its own.
//
// Auth: an x-founder-note-key header matching the 'founder-note' row in
// app_tokens, or the service-role key as a bearer. Rotate by updating that
// row. It can only ever send to a chat already paired in org_channels.
// Deploy:  npx supabase functions deploy founder-note --project-ref <ref>
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const LIMIT = 3800

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-founder-note-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

/** Split on line boundaries so a long report stays readable on a phone. */
function chunk(text: string, limit = LIMIT): string[] {
  if (text.length <= limit) return [text]
  const out: string[] = []
  let buf = ''
  for (const para of text.split('\n')) {
    const piece = para.length > limit ? para.slice(0, limit) : para
    if ((buf + '\n' + piece).length > limit) { if (buf) out.push(buf); buf = piece }
    else buf = buf ? `${buf}\n${piece}` : piece
  }
  if (buf) out.push(buf)
  return out
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!TOKEN) return json({ error: 'Telegram is not configured' }, 503)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const presented = req.headers.get('x-founder-note-key') ?? ''
  const bearer = req.headers.get('authorization') ?? ''
  let allowed = Boolean(SERVICE_ROLE) && bearer === `Bearer ${SERVICE_ROLE}`
  if (!allowed && presented) {
    const { data } = await admin.from('app_tokens').select('token').eq('name', 'founder-note').maybeSingle()
    allowed = Boolean(data?.token) && presented === data!.token
  }
  if (!allowed) return json({ error: 'Unauthorized' }, 401)

  let body: { text?: string; chat_id?: string }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }
  const text = (body.text ?? '').trim()
  if (!text) return json({ error: 'text is required' }, 400)

  let chatId = body.chat_id
  if (!chatId) {
    const { data } = await admin.from('org_channels').select('chat_id').eq('provider', 'telegram').eq('push', true).limit(1)
    chatId = data?.[0]?.chat_id
  }
  if (!chatId) return json({ error: 'No paired chat' }, 404)

  for (const part of chunk(text)) {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: part, parse_mode: 'HTML', disable_web_page_preview: true }),
    })
  }
  return json({ ok: true, chat_id: chatId })
})

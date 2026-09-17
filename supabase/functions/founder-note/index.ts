// ============================================================================
// Hue & Heal :: founder-note
// Post one plain message, verbatim, to the founder's paired Telegram chat.
// Used for overnight run reports that must arrive exactly as written, with no
// persona rewriting them. Caller must present the service-role key.
// Deploy:  npx supabase functions deploy founder-note --project-ref <ref>
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'
import { sendMessage, hasTelegram } from '../_shared/telegram.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const auth = req.headers.get('authorization') ?? ''
  if (!SERVICE_ROLE || auth !== `Bearer ${SERVICE_ROLE}`) return json({ error: 'Unauthorized' }, 401)

  let body: { text?: string; chat_id?: string }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }
  const text = (body.text ?? '').trim()
  if (!text) return json({ error: 'text is required' }, 400)
  if (!hasTelegram()) return json({ error: 'Telegram is not configured' }, 503)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  let chatId = body.chat_id
  if (!chatId) {
    const { data } = await admin.from('org_channels').select('chat_id').eq('provider', 'telegram').eq('push', true).limit(1)
    chatId = data?.[0]?.chat_id
  }
  if (!chatId) return json({ error: 'No paired chat' }, 404)

  await sendMessage(chatId, text)
  return json({ ok: true, chat_id: chatId })
})

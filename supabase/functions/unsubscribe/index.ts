// ============================================================================
// Hue & Heal — Studio Co-pilot :: unsubscribe (public)
// One-click unsubscribe. The {{unsubscribe}} link in each newsletter carries a
// per-subscriber token; this flips that subscriber to 'unsubscribed'. Called
// from the public /unsubscribe page (with the anon key), writes via service role.
// Deploy:  npx supabase functions deploy unsubscribe --project-ref <ref>
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

interface Body { token: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  let body: Body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }
  const token = (body.token ?? '').trim()
  if (!token) return json({ error: 'Missing token' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { data, error } = await admin
    .from('subscribers')
    .update({ status: 'unsubscribed' })
    .eq('unsub_token', token)
    .select('email')
    .maybeSingle()
  if (error) return json({ error: String(error) }, 500)
  if (!data) return json({ error: 'This link is invalid or has expired.' }, 404)
  return json({ ok: true, email: data.email })
})

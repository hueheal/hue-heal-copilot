// ============================================================================
// Hue & Heal :: import-client-doc (one-off utility, CRON_SECRET-guarded)
// Inserts a prepared client document into a client's room. Used to import
// externally authored documents (e.g. a Word SOW) as branded copilot docs.
// Deploy:  npx supabase functions deploy import-client-doc --no-verify-jwt
// Remove after use: npx supabase functions delete import-client-doc
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

interface Body {
  clientMatch: string
  doc: { kind: string; phase: string; format: string; title: string; dek: string; blocks: unknown[] }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const secret = req.headers.get('x-cron-secret') ?? ''
  if (!CRON_SECRET || secret !== CRON_SECRET) return json({ error: 'Forbidden' }, 403)

  let body: Body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }
  if (!body?.clientMatch || !body?.doc) return json({ error: 'clientMatch and doc required' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { data: clients } = await admin.from('clients').select('id, name, owner, brand_id').ilike('name', `%${body.clientMatch}%`)
  const client = (clients ?? [])[0] as { id: string; name: string; owner: string; brand_id?: string | null } | undefined
  if (!client) return json({ error: `No client matching "${body.clientMatch}"` }, 404)

  const { data, error } = await admin.from('client_docs').insert({
    owner: client.owner,
    brand_id: client.brand_id ?? null,
    client_id: client.id,
    kind: body.doc.kind,
    phase: body.doc.phase,
    format: body.doc.format,
    title: body.doc.title,
    dek: body.doc.dek,
    blocks: body.doc.blocks,
  }).select('id').single()
  if (error) return json({ error: error.message }, 500)
  return json({ ok: true, client: client.name, docId: (data as { id: string }).id })
})

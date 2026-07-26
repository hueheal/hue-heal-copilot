// ============================================================================
// Hue & Heal — Studio Co-pilot :: subscribe (public)
// Adds a self-serve subscriber to a brand's list. Called from the public
// /subscribe page (with the anon key). Writes with the service role so an
// unauthenticated visitor can join, scoped to the brand + optional group.
// Deploy:  npx supabase functions deploy subscribe --project-ref <ref>
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

interface Body { brandId: string; email: string; name?: string; group?: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  let body: Body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }
  const email = (body.email ?? '').trim().toLowerCase()
  const brandId = (body.brandId ?? '').trim()
  const name = (body.name ?? '').trim()
  const group = (body.group ?? '').trim()
  if (!brandId) return json({ error: 'Missing brand' }, 400)
  if (!/.+@.+\..+/.test(email)) return json({ error: 'Enter a valid email address' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  // Confirm the brand exists (avoids writing orphan rows from a bad link).
  const { data: brand } = await admin.from('brand_profiles').select('id, created_by').eq('id', brandId).maybeSingle()
  if (!brand) return json({ error: 'Unknown brand' }, 404)

  // subscribers.owner is NOT NULL, but a public subscriber has no auth user —
  // attribute the row to the brand's owner so the constraint + RLS are satisfied.
  let owner: string | null = (brand as { created_by?: string | null }).created_by ?? null
  if (!owner) {
    const { data: mem } = await admin.from('brand_members').select('user_id').eq('brand_id', brandId).not('user_id', 'is', null).limit(1).maybeSingle()
    owner = (mem as { user_id?: string } | null)?.user_id ?? null
  }

  const { data: existing } = await admin
    .from('subscribers')
    .select('id, groups, status')
    .eq('brand_id', brandId)
    .ilike('email', email)
    .maybeSingle()

  try {
    if (existing) {
      const groups = new Set<string>([...(existing.groups ?? [])])
      if (group) groups.add(group)
      await admin.from('subscribers').update({ status: 'subscribed', groups: [...groups] }).eq('id', existing.id)
    } else {
      await admin.from('subscribers').insert({
        brand_id: brandId, owner, email, name, status: 'subscribed', groups: group ? [group] : [],
      })
    }
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
  return json({ ok: true })
})

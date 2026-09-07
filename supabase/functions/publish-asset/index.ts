// ============================================================================
// Hue & Heal :: publish-asset
// On approval, files an image made for a brand's site into that site's own
// library. Remedae: POST /api/studio/assets with the shared publish key, the
// file named to the imagery guide and a sidecar beside it. Studio-bound
// images never come here.
// Secrets: REMEDAE_PUBLISH_KEY (existing), optional REMEDAE_ASSETS_URL.
// Deploy: npx supabase functions deploy publish-asset --no-verify-jwt --project-ref <ref>
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const REMEDAE_URL = Deno.env.get('REMEDAE_ASSETS_URL') ?? 'https://remedae.app/api/studio/assets'
const REMEDAE_KEY = Deno.env.get('REMEDAE_PUBLISH_KEY') ?? ''

interface Asset {
  id: string; owner: string; brand_id: string; category: string; surface: string; purpose: string; prompt: string
  parts: Record<string, string> | null; url: string; storage_path: string; destination: string; status: string; provider: string; request_id: string | null; created_at: string
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const auth = req.headers.get('authorization') ?? ''
  const body = await req.json().catch(() => ({})) as { assetId?: string }
  if (!auth.startsWith('Bearer ') || !body.assetId) return json({ error: 'Unauthorized' }, 401)
  const asUser = createClient(SUPABASE_URL, ANON, { global: { headers: { authorization: auth } } })
  const { data: userData } = await asUser.auth.getUser()
  const user = userData.user
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { data } = await admin.from('image_assets').select('*').eq('id', body.assetId).maybeSingle()
  const a = data as Asset | null
  if (!a || a.owner !== user.id) return json({ error: 'Not your asset' }, 403)
  if (a.destination !== 'remedae') return json({ ok: true, note: 'This image lives in the studio; nothing to file.' })
  if (!REMEDAE_KEY) return json({ error: 'REMEDAE_PUBLISH_KEY is not set on the function.' }, 500)

  // {category}-{subject}-{variant}.{ext}, variant counted per subject.
  const [cat, mod] = (a.category || 'brand').split('/')
  const category = ['tradition', 'condition', 'lifestyle', 'brand', 'ingredient'].includes(cat) ? cat : 'brand'
  const subject = slug([mod, a.purpose].filter(Boolean).join(' ')).split('-').slice(0, 4).join('-') || 'image'
  const { count } = await admin.from('image_assets').select('id', { count: 'exact', head: true })
    .eq('brand_id', a.brand_id).eq('destination', 'remedae').not('library_path', 'is', null).like('library_path', `${category}/${category}-${subject}-%`)
  const variant = String((count ?? 0) + 1).padStart(2, '0')
  const ext = a.storage_path.split('.').pop() || 'jpg'
  const filename = `${category}-${subject}-${variant}.${ext === 'jpeg' ? 'jpg' : ext}`

  const sidecar = {
    prompt: a.parts ?? { composed: a.prompt },
    tool: a.provider, model: 'higgsfield-ai/soul/standard', seed: null, requestId: a.request_id,
    date: a.created_at, approver: user.email ?? user.id, approvedAt: new Date().toISOString(),
    surface: a.surface, purpose: a.purpose, studioAssetId: a.id,
  }
  const res = await fetch(REMEDAE_URL, {
    method: 'POST', headers: { authorization: `Bearer ${REMEDAE_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ category, filename, sourceUrl: a.url, sidecar }),
  })
  const out = await res.json().catch(() => ({})) as { ok?: boolean; url?: string; path?: string; error?: string }
  if (!res.ok || !out.ok) return json({ error: out.error ?? `remedae.app ${res.status}` }, 502)
  await admin.from('image_assets').update({ library_url: out.url, library_path: out.path, published_at: new Date().toISOString() }).eq('id', a.id)
  return json({ ok: true, url: out.url, path: out.path })
})

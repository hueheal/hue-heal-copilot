// ============================================================================
// Hue & Heal :: instagram-oauth
// "Connect Instagram" for a brand world, using the Instagram API with
// Instagram Login (no Facebook Page needed). The browser sends the user to
// instagram.com/oauth/authorize; Instagram redirects back to the copilot with
// a ?code=; the copilot posts that code here. This function swaps it for a
// short-lived token, upgrades it to a 60-day long-lived token, looks up the
// account, and stores everything on brand_profiles.instagram for the brand.
// The app secret never leaves the server.
//   POST { action: 'config' }                       -> { appId }
//   POST { code, redirectUri, brandId }             -> { username, userId, expiresAt }
//   POST { action: 'refresh', brandId }             -> { expiresAt } (extends a long-lived token)
// Secrets: INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET (from the Meta app's
// "API setup with Instagram login" page), plus the standard Supabase ones.
// Deploy:  npx supabase functions deploy instagram-oauth --project-ref <ref>
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APP_ID = Deno.env.get('INSTAGRAM_APP_ID') ?? ''
const APP_SECRET = Deno.env.get('INSTAGRAM_APP_SECRET') ?? ''
const V = Deno.env.get('GRAPH_VERSION') ?? 'v21.0'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

interface Body { action?: 'config' | 'refresh'; code?: string; redirectUri?: string; brandId?: string }

async function igJson(res: Response): Promise<Record<string, unknown>> {
  const data = await res.json().catch(() => ({})) as Record<string, unknown>
  if (!res.ok || (data as { error?: unknown }).error || (data as { error_message?: unknown }).error_message) {
    const err = data as { error?: { message?: string }; error_message?: string; error_type?: string }
    throw new Error(err.error?.message ?? err.error_message ?? `Instagram ${res.status}`)
  }
  return data
}

/** Caller must be able to see the brand (RLS = membership) before we touch it. */
async function brandFor(authHeader: string, brandId: string) {
  const asCaller = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } })
  const { data } = await asCaller.from('brand_profiles').select('id, name, instagram').eq('id', brandId).maybeSingle()
  return data as { id: string; name: string; instagram?: Record<string, unknown> } | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  let body: Body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

  if (body.action === 'config') {
    if (!APP_ID) return json({ error: 'INSTAGRAM_APP_ID is not set on the server yet' }, 400)
    return json({ appId: APP_ID })
  }
  if (!APP_ID || !APP_SECRET) return json({ error: 'Instagram app credentials are not set on the server yet (INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET)' }, 400)
  if (!(SUPABASE_URL && ANON && SERVICE_ROLE)) return json({ error: 'Server is missing Supabase configuration' }, 500)
  if (!body.brandId) return json({ error: 'brandId is required' }, 400)

  const brand = await brandFor(req.headers.get('authorization') ?? '', body.brandId)
  if (!brand) return json({ error: 'You do not have access to this workspace' }, 403)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  try {
    if (body.action === 'refresh') {
      const current = (brand.instagram?.access_token as string | undefined) ?? ''
      if (!current) return json({ error: 'Nothing to refresh: connect Instagram first' }, 400)
      const r = await igJson(await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(current)}`))
      const expiresAt = new Date(Date.now() + Number(r.expires_in ?? 0) * 1000).toISOString()
      const instagram = { ...(brand.instagram ?? {}), access_token: String(r.access_token), expires_at: expiresAt, connected_at: new Date().toISOString() }
      const { error } = await admin.from('brand_profiles').update({ instagram }).eq('id', brand.id)
      if (error) throw new Error(error.message)
      return json({ ok: true, expiresAt })
    }

    if (!body.code || !body.redirectUri) return json({ error: 'code and redirectUri are required' }, 400)

    // 1. Authorization code -> short-lived token (1 hour).
    const form = new URLSearchParams({
      client_id: APP_ID, client_secret: APP_SECRET, grant_type: 'authorization_code',
      redirect_uri: body.redirectUri, code: body.code,
    })
    const short = await igJson(await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body: form }))
    const shortToken = String(short.access_token ?? '')
    if (!shortToken) throw new Error('Instagram did not return a token')

    // 2. Short-lived -> long-lived (60 days, refreshable).
    const long = await igJson(await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(APP_SECRET)}&access_token=${encodeURIComponent(shortToken)}`))
    const token = String(long.access_token ?? shortToken)
    const expiresAt = new Date(Date.now() + Number(long.expires_in ?? 3600) * 1000).toISOString()

    // 3. Who is this? user_id is the professional account ID used on publish paths.
    const me = await igJson(await fetch(`https://graph.instagram.com/${V}/me?fields=user_id,username,name,account_type&access_token=${encodeURIComponent(token)}`))
    const userId = String(me.user_id ?? short.user_id ?? me.id ?? '')
    const username = String(me.username ?? '')
    if (!userId) throw new Error('Could not read the Instagram account ID from the token')

    // The short-lived exchange reports which scopes were actually granted;
    // Meta silently drops any the app did not have enabled at approval time.
    const permissions = Array.isArray(short.permissions) ? (short.permissions as unknown[]).map(String)
      : typeof short.permissions === 'string' ? String(short.permissions).split(',').map((x) => x.trim()).filter(Boolean) : []
    const instagram = {
      ...(brand.instagram ?? {}),
      user_id: userId, username, access_token: token, expires_at: expiresAt, permissions,
      account_type: String(me.account_type ?? ''), via: 'instagram_login', connected_at: new Date().toISOString(),
    }
    const { error } = await admin.from('brand_profiles').update({ instagram }).eq('id', brand.id)
    if (error) throw new Error(error.message)
    return json({ ok: true, username, userId, expiresAt, accountType: instagram.account_type, permissions })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502)
  }
})

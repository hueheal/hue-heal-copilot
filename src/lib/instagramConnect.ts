import { supabase, isSupabaseConfigured, functionsBase } from './supabase'

/* ============================================================
   "Connect Instagram" for a brand world (Instagram API with
   Instagram Login). The browser goes to instagram.com to approve,
   comes back to /settings?code=…&state=…, and the code is swapped
   for a 60-day token by the instagram-oauth edge function, which
   stores it on the workspace. No Facebook Page involved.
   ============================================================ */

const SCOPES = ['instagram_business_basic', 'instagram_business_content_publish', 'instagram_business_manage_comments']
const STATE_KEY = 'hh:ig-oauth-state'

/** Where Instagram sends the user back. Must be registered verbatim in the
    Meta app's Instagram business login settings (OAuth redirect URIs). */
export function instagramRedirectUri(): string {
  return `${window.location.origin}/settings`
}

async function callFn(body: Record<string, unknown>): Promise<Record<string, unknown> & { error?: string }> {
  if (!(isSupabaseConfigured && supabase && functionsBase)) return { error: 'Not connected' }
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return { error: 'Sign in first' }
  try {
    const res = await fetch(`${functionsBase}/instagram-oauth`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: data?.error ? String(data.error) : `Instagram ${res.status}` }
    return data
  } catch (e) {
    return { error: String(e) }
  }
}

/** Send the browser to Instagram's consent screen for this brand. */
export async function startInstagramConnect(brandId: string): Promise<{ error?: string }> {
  const cfg = await callFn({ action: 'config' })
  if (cfg.error) return { error: cfg.error }
  const nonce = Math.random().toString(36).slice(2)
  const state = `${brandId}.${nonce}`
  sessionStorage.setItem(STATE_KEY, state)
  const url = new URL('https://www.instagram.com/oauth/authorize')
  url.searchParams.set('client_id', String(cfg.appId))
  url.searchParams.set('redirect_uri', instagramRedirectUri())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPES.join(','))
  url.searchParams.set('state', state)
  url.searchParams.set('force_reauth', 'true')
  window.location.assign(url.toString())
  return {}
}

/** If the URL carries Instagram's ?code=&state=, finish the connection.
    Returns null when there is nothing to do. Cleans the URL either way. */
export async function finishInstagramConnect(): Promise<{ brandId: string; username?: string; expiresAt?: string; error?: string } | null> {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state') ?? ''
  const igError = params.get('error_description') ?? params.get('error_reason') ?? params.get('error')
  if (!code && !igError) return null
  const clean = () => window.history.replaceState({}, '', window.location.pathname)
  const expected = sessionStorage.getItem(STATE_KEY) ?? ''
  sessionStorage.removeItem(STATE_KEY)
  const brandId = (state || expected).split('.')[0]
  if (igError) { clean(); return { brandId, error: `Instagram said: ${igError}` } }
  if (!state || state !== expected) { clean(); return { brandId, error: 'The connection did not match this browser session. Try Connect Instagram again.' } }
  // Instagram appends "#_" to the redirect; the code itself may also carry it.
  const res = await callFn({ code: String(code).replace(/#_$/, ''), redirectUri: instagramRedirectUri(), brandId })
  clean()
  if (res.error) return { brandId, error: res.error }
  return { brandId, username: res.username ? String(res.username) : undefined, expiresAt: res.expiresAt ? String(res.expiresAt) : undefined }
}

/** Extend a long-lived token by another 60 days (works once it is 24h old). */
export async function refreshInstagramToken(brandId: string): Promise<{ expiresAt?: string; error?: string }> {
  const res = await callFn({ action: 'refresh', brandId })
  if (res.error) return { error: res.error }
  return { expiresAt: res.expiresAt ? String(res.expiresAt) : undefined }
}

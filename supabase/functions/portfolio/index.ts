// ============================================================================
// portfolio: the connector between the copilot and what Hue & Heal runs (the
// studio site, the ventures, the clients). Each row in `connections` is one
// thing to watch: a live website, its hosting, its code, its email, its data.
//
// POST, cron (x-cron-secret): { op: 'check' }            every connection
// POST, founder (Bearer jwt): { op: 'check', brandId?, clientId?, id? }
//                             { op: 'act', id, action: 'rebuild' }  (Netlify)
// Providers: web (no key), netlify (NETLIFY_TOKEN), vercel (VERCEL_TOKEN),
// github (GITHUB_TOKEN), resend (the sending key), supabase (a product's
// read-only copilot_metrics function plus its key). A missing key is reported
// as needs_key, never an error. Keys are set with scripts/connect-provider.sh.
// ============================================================================
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''

type Json = Record<string, unknown>
interface Conn { id: string; owner: string; brand_id: string | null; client_id: string | null; label: string; kind: string; provider: string; config: Json; secret_name: string }
interface Result { status: 'ok' | 'warn' | 'down' | 'needs_key'; summary: string; detail?: Json; metrics?: Json }

const ago = (iso: string | number | null | undefined) => {
  if (!iso) return ''
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h} h ago`
  return `${Math.round(h / 24)} days ago`
}
const clip = (s: unknown, n = 70) => String(s ?? '').split('\n')[0].replace(/[–—]/g, ', ').slice(0, n)
async function get(url: string, headers: Record<string, string> = {}, ms = 10000): Promise<Response> {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms)
  try { return await fetch(url, { headers, signal: c.signal, redirect: 'follow' }) } finally { clearTimeout(t) }
}
const key = (c: Conn) => (c.secret_name ? Deno.env.get(c.secret_name) ?? '' : '')
const needsKey = (_c: Conn, what: string): Result => ({ status: 'needs_key', summary: `Waiting for the ${what} key` })

/* ---- Providers ---- */
async function web(c: Conn): Promise<Result> {
  const url = String(c.config.url ?? '')
  const t0 = Date.now()
  try {
    const r = await get(url, { 'user-agent': 'HueHealCopilot/2.0 (portfolio check)' })
    const ms = Date.now() - t0
    await r.body?.cancel()
    if (r.status >= 500 || r.status === 404) return { status: 'down', summary: `Not loading (HTTP ${r.status})`, metrics: { http: r.status, ms } }
    if (r.status >= 400) return { status: 'warn', summary: `Answering ${r.status}`, metrics: { http: r.status, ms } }
    return { status: ms > 3000 ? 'warn' : 'ok', summary: ms > 3000 ? `Live but slow, ${(ms / 1000).toFixed(1)} s` : `Live, ${ms} ms`, metrics: { http: r.status, ms }, detail: { final_url: r.url } }
  } catch (e) {
    return { status: 'down', summary: (e as Error).name === 'AbortError' ? 'Not answering (timed out)' : 'Not reachable', metrics: { ms: Date.now() - t0 } }
  }
}

async function netlify(c: Conn): Promise<Result> {
  const tok = key(c); if (!tok) return needsKey(c, 'Netlify')
  const r = await get(`https://api.netlify.com/api/v1/sites/${c.config.site_id}/deploys?per_page=1`, { authorization: `Bearer ${tok}` })
  if (r.status === 401 || r.status === 403) return { status: 'needs_key', summary: 'The Netlify key was refused' }
  const d = ((await r.json().catch(() => [])) as Json[])[0]
  if (!d) return { status: 'warn', summary: 'No deploys yet' }
  const state = String(d.state)
  const when = ago(String(d.published_at ?? d.created_at))
  const from = d.branch ? ` from ${d.branch}` : ''
  const detail = { state, branch: d.branch, context: d.context, title: clip(d.title, 120), deploy_url: d.deploy_ssl_url, admin: d.admin_url ?? null }
  if (state === 'error') return { status: 'down', summary: `Last deploy failed ${when}${from}`, detail, metrics: { deploy: state } }
  if (state !== 'ready') return { status: 'warn', summary: `Deploying now (${state})${from}`, detail, metrics: { deploy: state } }
  return { status: 'ok', summary: `Deployed ${when}${from}`, detail, metrics: { deploy: state } }
}

async function vercel(c: Conn): Promise<Result> {
  const tok = key(c); if (!tok) return needsKey(c, 'Vercel')
  const q = new URLSearchParams({ projectId: String(c.config.project_id), limit: '1', ...(c.config.team_id ? { teamId: String(c.config.team_id) } : {}), target: 'production' })
  const r = await get(`https://api.vercel.com/v6/deployments?${q}`, { authorization: `Bearer ${tok}` })
  if (r.status === 401 || r.status === 403) return { status: 'needs_key', summary: 'The Vercel key was refused' }
  const d = (((await r.json().catch(() => ({}))) as { deployments?: Json[] }).deployments ?? [])[0]
  if (!d) return { status: 'warn', summary: 'No production deploys found' }
  const state = String(d.state ?? d.readyState)
  const meta = (d.meta ?? {}) as Json
  const when = ago(Number(d.ready ?? d.created ?? d.createdAt))
  const detail = { state, commit: clip(meta.githubCommitMessage, 120), branch: meta.githubCommitRef, url: d.url ? `https://${d.url}` : null }
  if (state === 'ERROR' || state === 'CANCELED') return { status: 'down', summary: `Last deploy ${state.toLowerCase()} ${when}`, detail, metrics: { deploy: state } }
  if (state !== 'READY') return { status: 'warn', summary: `Deploying now (${state.toLowerCase()})`, detail, metrics: { deploy: state } }
  return { status: 'ok', summary: `Deployed ${when}${meta.githubCommitMessage ? `: ${clip(meta.githubCommitMessage, 50)}` : ''}`, detail, metrics: { deploy: state } }
}

async function github(c: Conn): Promise<Result> {
  const tok = key(c); if (!tok) return needsKey(c, 'GitHub')
  const h = { authorization: `Bearer ${tok}`, accept: 'application/vnd.github+json', 'user-agent': 'HueHealCopilot' }
  const repo = String(c.config.repo)
  const [cr, pr] = await Promise.all([
    get(`https://api.github.com/repos/${repo}/commits?per_page=1${c.config.branch ? `&sha=${encodeURIComponent(String(c.config.branch))}` : ''}`, h),
    get(`https://api.github.com/repos/${repo}/pulls?state=open&per_page=50`, h),
  ])
  if (cr.status === 401 || cr.status === 403 || cr.status === 404) return { status: 'needs_key', summary: cr.status === 404 ? 'The GitHub key cannot see this repo' : 'The GitHub key was refused' }
  const commit = ((await cr.json().catch(() => [])) as Json[])[0] as Json | undefined
  const pulls = pr.ok ? ((await pr.json().catch(() => [])) as Json[]) : []
  const cm = (commit?.commit ?? {}) as Json
  const when = (cm.committer as Json | undefined)?.date as string | undefined
  const open = pulls.length
  return {
    status: 'ok',
    summary: `${commit ? `Last change ${ago(when)}: ${clip(cm.message, 50)}` : 'No commits'}${open ? `. ${open} open pull ${open === 1 ? 'request' : 'requests'}` : ''}`,
    detail: { message: clip(cm.message, 140), at: when, sha: String(commit?.sha ?? '').slice(0, 7), open_pulls: pulls.slice(0, 5).map((p) => ({ title: clip(p.title, 90), url: p.html_url })) },
    metrics: { open_pulls: open },
  }
}

async function resend(c: Conn): Promise<Result> {
  const tok = key(c); if (!tok) return needsKey(c, 'email')
  const r = await get('https://api.resend.com/domains', { authorization: `Bearer ${tok}` })
  if (r.ok) {
    const d = (((await r.json().catch(() => ({}))) as { data?: Json[] }).data ?? []).find((x) => x.name === c.config.domain)
    if (!d) return { status: 'warn', summary: `${c.config.domain} is not in this Resend account` }
    return d.status === 'verified' ? { status: 'ok', summary: `Sending from ${c.config.domain}, verified` } : { status: 'warn', summary: `${c.config.domain} is ${d.status} in Resend` }
  }
  // A sending-only key cannot list domains; it being set is what we can know.
  return { status: 'ok', summary: `Sending key set for ${c.config.domain}` }
}

/* A product's own numbers, from a read-only copilot_metrics(p_key) function
   in its database that returns { label: number }. */
async function supabaseMetrics(c: Conn, prev: Json | null): Promise<Result> {
  const tok = key(c); if (!tok) return needsKey(c, 'the data')
  const url = String(c.config.url ?? '').replace(/\/+$/, '')
  const anon = String(c.config.anon_key ?? '')
  const r = await fetch(`${url}/rest/v1/rpc/copilot_metrics`, { method: 'POST', headers: { apikey: anon, authorization: `Bearer ${anon}`, 'content-type': 'application/json' }, body: JSON.stringify({ p_key: tok }) }).catch(() => null)
  if (!r?.ok) return { status: 'warn', summary: `Could not read the numbers (${r?.status ?? 'no answer'})` }
  const m = (await r.json().catch(() => ({}))) as Json
  const parts = Object.entries(m).slice(0, 4).map(([k, v]) => {
    const before = prev && typeof prev[k] === 'number' ? Number(prev[k]) : null
    const diff = before !== null ? Number(v) - before : 0
    return `${Number(v).toLocaleString('en-GB')} ${k.replace(/_/g, ' ')}${diff > 0 ? ` (+${diff})` : ''}`
  })
  return { status: 'ok', summary: parts.join(', ') || 'Connected', metrics: m }
}

async function checkOne(admin: SupabaseClient, c: Conn): Promise<Result> {
  let res: Result
  try {
    if (c.provider === 'web') res = await web(c)
    else if (c.provider === 'netlify') res = await netlify(c)
    else if (c.provider === 'vercel') res = await vercel(c)
    else if (c.provider === 'github') res = await github(c)
    else if (c.provider === 'resend') res = await resend(c)
    else if (c.provider === 'supabase') {
      const { data: last } = await admin.from('connection_checks').select('metrics').eq('connection_id', c.id).eq('status', 'ok').lt('checked_at', new Date(Date.now() - 20 * 3600_000).toISOString()).order('checked_at', { ascending: false }).limit(1).maybeSingle()
      res = await supabaseMetrics(c, (last?.metrics ?? null) as Json | null)
    } else res = { status: 'warn', summary: `No checker for ${c.provider} yet` }
  } catch (e) {
    res = { status: 'warn', summary: `Check failed: ${clip((e as Error).message, 80)}` }
  }
  const now = new Date().toISOString()
  await admin.from('connections').update({ status: res.status, summary: res.summary, detail: res.detail ?? {}, checked_at: now, updated_at: now }).eq('id', c.id)
  await admin.from('connection_checks').insert({ connection_id: c.id, owner: c.owner, status: res.status, summary: res.summary, metrics: res.metrics ?? {} })
  return res
}

async function checkAll(admin: SupabaseClient, conns: Conn[]) {
  const out = await Promise.all(conns.map(async (c) => ({ id: c.id, label: c.label, ...(await checkOne(admin, c)) })))
  // Keep three months of history.
  await admin.from('connection_checks').delete().lt('checked_at', new Date(Date.now() - 90 * 86400_000).toISOString())
  return out
}

async function act(c: Conn, action: string): Promise<Json> {
  if (action === 'rebuild' && c.provider === 'netlify') {
    const tok = key(c); if (!tok) return { error: `Add the ${c.secret_name} key first.` }
    const r = await fetch(`https://api.netlify.com/api/v1/sites/${c.config.site_id}/builds`, { method: 'POST', headers: { authorization: `Bearer ${tok}` } })
    return r.ok ? { ok: true, note: 'Rebuilding now. It takes a minute or two.' } : { error: `Netlify answered ${r.status}` }
  }
  return { error: 'That action is not available for this connection.' }
}

function claims(jwt: string): { sub?: string; role?: string; exp?: number } {
  try { return JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) } catch { return {} }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const body = await req.json().catch(() => ({})) as Json
  const cols = 'id, owner, brand_id, client_id, label, kind, provider, config, secret_name'

  if (CRON_SECRET && req.headers.get('x-cron-secret') === CRON_SECRET) {
    const { data } = await admin.from('connections').select(cols)
    return json({ ok: true, checked: (await checkAll(admin, (data ?? []) as Conn[])).length })
  }

  const auth = req.headers.get('authorization') ?? ''
  const c = claims(auth.slice(7))
  if (!auth.startsWith('Bearer ') || !c.sub || c.role !== 'authenticated' || Number(c.exp) * 1000 < Date.now()) return json({ error: 'Sign in again to continue.' }, 401)
  const db = createClient(SUPABASE_URL, ANON, { global: { headers: { authorization: auth } } })

  // Row security decides what this founder may check or act on.
  let q = db.from('connections').select(cols)
  if (body.id) q = q.eq('id', String(body.id))
  if (body.brandId) q = q.eq('brand_id', String(body.brandId))
  if (body.clientId) q = q.eq('client_id', String(body.clientId))
  const { data, error } = await q
  if (error) return json({ error: 'Sign in again to continue.' }, 401)
  const conns = (data ?? []) as Conn[]

  if (body.op === 'act') {
    if (conns.length !== 1) return json({ error: 'Not found.' }, 404)
    return json(await act(conns[0], String(body.action ?? '')))
  }
  if (body.op === 'check') return json({ results: await checkAll(admin, conns) })
  return json({ error: 'Unknown op' }, 400)
})

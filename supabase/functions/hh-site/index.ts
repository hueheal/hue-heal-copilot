// ============================================================================
// hh-site: the copilot's connection to the Hue & Heal website (Astro on
// Netlify, repo hueheal/HueandHeal-Website; see docs/website-connection.md).
//
// Founder (Bearer jwt, must own the Hue & Heal brand):
//   { op: 'publish',   articleId }   mark a journal piece published, rebuild the site
//   { op: 'unpublish', articleId }   back to draft, rebuild the site
//   { op: 'render',  type: 'letter' | 'essay', data }   the site's email design
//   { op: 'email',   type, data, mode: 'test' | 'list', groups?: string[] }
//        test: to the founder only. list: to every subscribed Hue & Heal
//        subscriber in the groups (default: newsletter), one email each with
//        their own unsubscribe link; recorded in newsletters.
// Netlify (outgoing webhook, signed with NETLIFY_FORMS_SECRET):
//   a form submission. Project enquiries become pipeline leads.
//
// Secrets: NETLIFY_BUILD_HOOK_HH, LETTER_RENDER_SECRET, HH_SITE_URL,
//          NETLIFY_FORMS_SECRET, RESEND_API_KEY (via _shared/resend.ts).
// ============================================================================
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'
import { resendKeyFor } from '../_shared/resend.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const BUILD_HOOK = Deno.env.get('NETLIFY_BUILD_HOOK_HH') ?? ''
const RENDER_SECRET = Deno.env.get('LETTER_RENDER_SECRET') ?? ''
const SITE = (Deno.env.get('HH_SITE_URL') ?? 'https://www.hueandheal.com').replace(/\/+$/, '')
const FORMS_SECRET = Deno.env.get('NETLIFY_FORMS_SECRET') ?? ''
const COPILOT = 'https://copilotadmin.hueandheal.com'
const UNSUB = '__HH_UNSUB_TOKEN__'
const DEFAULT_FROM = 'Hue & Heal <hello@hueandheal.com>'

type Json = Record<string, unknown>
const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/
const slugify = (t: string) => t.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90)

async function rebuild(): Promise<boolean> {
  if (!BUILD_HOOK) return false
  const r = await fetch(BUILD_HOOK, { method: 'POST' }).catch(() => null)
  return !!r?.ok
}

/* ---- Journal ---- */
async function setPublished(db: SupabaseClient, brandId: string, articleId: string, publish: boolean) {
  const { data: a } = await db.from('journal_articles').select('id, brand_id, title, dek, slug, status, published_at, hero_image').eq('id', articleId).maybeSingle()
  if (!a || a.brand_id !== brandId) return { error: 'That piece is not in the Hue & Heal journal.' }
  if (publish) {
    if (!String(a.title ?? '').trim()) return { error: 'Give it a title first.' }
    const slug = String(a.slug ?? '').trim() || slugify(a.title)
    const { data: clash } = await db.from('journal_articles').select('id').eq('brand_id', brandId).eq('slug', slug).eq('status', 'published').neq('id', articleId).limit(1)
    if (clash?.length) return { error: `Another published piece already uses /journal/${slug}. Change this one's slug.` }
    const { error } = await db.from('journal_articles').update({ status: 'published', slug, published_at: a.published_at ?? new Date().toISOString() }).eq('id', articleId)
    if (error) return { error: error.message }
    const rebuilt = await rebuild()
    return { status: 'published', url: `${SITE}/journal/${slug}`, rebuilt, missingHero: !a.hero_image }
  }
  const { error } = await db.from('journal_articles').update({ status: 'draft' }).eq('id', articleId)
  if (error) return { error: error.message }
  return { status: 'draft', rebuilt: await rebuild() }
}

/* ---- Email, in the site's design ---- */
async function render(type: string, data: Json): Promise<{ subject?: string; html?: string; text?: string; error?: string }> {
  if (!RENDER_SECRET) return { error: 'The website renderer is not connected (LETTER_RENDER_SECRET).' }
  const res = await fetch(`${SITE}/api/letter-render`, {
    method: 'POST', headers: { authorization: `Bearer ${RENDER_SECRET}`, 'content-type': 'application/json' },
    body: JSON.stringify({ type, data }),
  }).catch((e) => ({ ok: false, status: 0, json: async () => ({ error: (e as Error).message }) }) as unknown as Response)
  const out = await res.json().catch(() => ({})) as Json
  if (!res.ok) return { error: `The website renderer answered ${res.status}: ${String(out.error ?? 'no details')}` }
  return { subject: String(out.subject ?? ''), html: String(out.html ?? ''), text: String(out.text ?? '') }
}

async function email(db: SupabaseClient, admin: SupabaseClient, brand: Json, uid: string, me: string, body: Json) {
  const type = body.type === 'essay' ? 'essay' : 'letter'
  const data = { ...((body.data ?? {}) as Json) }
  const from = String(brand.sender_email || DEFAULT_FROM)
  const { key, missing } = resendKeyFor(from)
  if (!key) return { error: missing }
  const replyTo = from.match(/<([^>]+)>/)?.[1] ?? from

  if (body.mode === 'test') {
    if (!EMAIL_RE.test(me)) return { error: 'Your account has no email address to send a test to.' }
    const r = await render(type, { ...data, unsubscribeUrl: `${COPILOT}/unsubscribe` })
    if (r.error) return r
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [me], reply_to: replyTo, subject: `[Test] ${r.subject}`, html: r.html, text: r.text }),
    })
    const out = await res.json().catch(() => ({})) as Json
    return res.ok ? { sentTo: me, subject: r.subject } : { error: String(out.message ?? `Resend ${res.status}`) }
  }

  if (body.mode !== 'list') return { error: 'Choose test or list.' }
  const groups = Array.isArray(body.groups) && body.groups.length ? (body.groups as string[]).map(String) : ['newsletter']
  const { data: subs, error } = await admin.from('subscribers').select('email, unsub_token, groups')
    .eq('brand_id', brand.id as string).eq('status', 'subscribed').overlaps('groups', groups).limit(5000)
  if (error) return { error: error.message }
  const list = ((subs ?? []) as { email: string; unsub_token: string }[]).filter((s) => EMAIL_RE.test(s.email))
  if (!list.length) return { error: `No subscribers in ${groups.join(', ')} yet.` }

  // Render once with a placeholder, then give each person their own link.
  const r = await render(type, { ...data, unsubscribeUrl: `${COPILOT}/unsubscribe?t=${UNSUB}` })
  if (r.error) return r
  let sent = 0
  const failures: string[] = []
  for (let i = 0; i < list.length; i += 100) {
    const batch = list.slice(i, i + 100).map((s) => {
      const link = `${COPILOT}/unsubscribe?t=${s.unsub_token}`
      return {
        from, to: [s.email], reply_to: replyTo, subject: r.subject,
        html: r.html!.split(UNSUB).join(s.unsub_token), text: r.text!.split(UNSUB).join(s.unsub_token),
        headers: { 'List-Unsubscribe': `<${link}>` },
      }
    })
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify(batch),
    })
    if (res.ok) sent += batch.length
    else failures.push(`batch ${i / 100 + 1}: ${(await res.text()).slice(0, 160)}`)
  }
  await db.from('newsletters').insert({
    owner: uid, brand_id: brand.id, subject: r.subject, preheader: String(data.preheader ?? ''), template: `site-${type}`,
    blocks: [{ type: 'site-email', issue: data }], status: 'sent', sent_at: new Date().toISOString(), recipients_count: sent,
  })
  return failures.length ? { sent, error: failures.join('; ') } : { sent }
}

/* ---- Website forms (Netlify outgoing webhook) ---- */
const b64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0))
async function verifyJws(token: string, raw: string): Promise<boolean> {
  try {
    const [h, p, sig] = token.split('.')
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(FORMS_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    if (!await crypto.subtle.verify('HMAC', k, b64url(sig), new TextEncoder().encode(`${h}.${p}`))) return false
    const claims = JSON.parse(new TextDecoder().decode(b64url(p))) as { iss?: string; sha256?: string }
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)))).map((b) => b.toString(16).padStart(2, '0')).join('')
    return claims.iss === 'netlify' && claims.sha256 === digest
  } catch { return false }
}

async function formSubmission(admin: SupabaseClient, sub: Json) {
  const form = String(sub.form_name ?? '')
  const d = (sub.data ?? {}) as Json
  if (form !== 'project') return { ignored: form }
  const { data: brand } = await admin.from('brand_profiles').select('id, owner, created_by').ilike('name', 'hue%heal%').limit(1).maybeSingle()
  if (!brand) return { error: 'No Hue & Heal brand' }
  const owner = (brand.created_by ?? brand.owner) as string
  const clip = (v: unknown, n: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
  const who = clip(d.name, 120), company = clip(d.company, 160), mail = clip(d.email, 200)
  const notes = Object.entries(d).filter(([k]) => !['email', 'name', 'company', 'company-url', 'form-name', 'ip', 'user_agent', 'referrer'].includes(k))
    .map(([k, v]) => `${k}: ${String(v ?? '').slice(0, 2000)}`).join('\n')
  const { error } = await admin.from('life_pipeline').upsert({
    owner, brand_id: brand.id, kind: 'lead', stage: 'new', source: 'website', source_ref: String(sub.id ?? crypto.randomUUID()),
    title: `Website enquiry: ${company || who || mail || 'new project'}`, org: company, contact_name: who, contact_email: EMAIL_RE.test(mail) ? mail : '',
    next_step: 'Reply to the enquiry', next_due: new Date().toISOString().slice(0, 10), notes: notes.slice(0, 6000),
  }, { onConflict: 'owner,source,source_ref', ignoreDuplicates: true })
  return error ? { error: error.message } : { ok: true }
}

/* The user id from the JWT. The database checks the token's signature on
   every query, so a forged token fails at the first read below. */
function claims(jwt: string): { sub?: string; email?: string; role?: string; exp?: number } {
  try { return JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) } catch { return {} }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

  const sig = req.headers.get('x-webhook-signature')
  if (sig) {
    const raw = await req.text()
    if (!FORMS_SECRET || !await verifyJws(sig, raw)) return json({ error: 'Bad signature' }, 401)
    return json(await formSubmission(admin, JSON.parse(raw)))
  }

  const auth = req.headers.get('authorization') ?? ''
  const c = claims(auth.slice(7))
  if (!auth.startsWith('Bearer ') || !c.sub || c.role !== 'authenticated' || Number(c.exp) * 1000 < Date.now()) return json({ error: 'Sign in again to continue.' }, 401)
  const db = createClient(SUPABASE_URL, ANON, { global: { headers: { authorization: auth } } })
  const { data: brand, error: be } = await db.from('brand_profiles').select('id, name, sender_email').ilike('name', 'hue%heal%').limit(1).maybeSingle()
  if (be) return json({ error: 'Sign in again to continue.' }, 401)
  if (!brand) return json({ error: 'Only the Hue & Heal team can do this.' }, 403)

  const body = await req.json().catch(() => ({})) as Json
  try {
    if (body.op === 'publish' || body.op === 'unpublish') return json(await setPublished(db, brand.id, String(body.articleId ?? ''), body.op === 'publish'))
    if (body.op === 'render') return json(await render(body.type === 'essay' ? 'essay' : 'letter', (body.data ?? {}) as Json))
    if (body.op === 'email') return json(await email(db, admin, brand as Json, c.sub, String(c.email ?? ''), body))
    return json({ error: 'Unknown op' }, 400)
  } catch (e) {
    console.error('hh-site', body.op, (e as Error).message)
    return json({ error: 'Something went wrong. Try again.' }, 500)
  }
})

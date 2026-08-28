// ============================================================================
// Hue & Heal :: telegram-bridge
// Talk to your org from your phone. One bot, many workspaces: a chat is bound
// to exactly one (owner, brand) pair by org_channels, so a message can only
// ever reach the roles of the workspace that chat is linked to, and a reply
// can only ever contain that workspace's material.
//
// Pair:      /start <code>            (code generated in Settings -> Channel)
// Commands:  /roles /inbox /digest /approve <id> /decline <id> /workspace [name]
//            /ask <role> <brief>  ·  @role <brief>  ·  plain text -> lead role
//
// Security: Telegram's own secret-token header is required, and an unknown
// chat is told nothing except how to pair. Never echo data before binding.
// Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, ANTHROPIC_API_KEY,
//          SUPABASE_SERVICE_ROLE_KEY
// Deploy:  npx supabase functions deploy telegram-bridge --no-verify-jwt --project-ref <ref>
// ============================================================================
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendMessage, b, plain, formatDeliverable } from '../_shared/telegram.ts'
import { executeRole, type RoleRow } from '../_shared/roleWork.ts'

const WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

interface Channel { id: string; owner: string; brand_id: string | null; push: boolean }

const short = (id: string) => id.slice(0, 4)
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')

/** Long work (a role run) without holding the webhook open. Only safe when the
    runtime keeps the isolate alive for us: otherwise it is torn down seconds
    after the response and the reply is never sent, so we wait instead. Quick
    work is always awaited before responding. */
async function later(p: Promise<unknown>): Promise<void> {
  const rt = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime
  if (typeof rt?.waitUntil === 'function') { rt.waitUntil(p.catch(() => {})); return }
  await p.catch(() => {})
}

const HELP = [
  b('Your org, on the phone'),
  '',
  plain('Just type to brief the lead role, or:'),
  plain('@cmo plan september   — brief a role by name'),
  plain('/roles      who is on the team and their cadence'),
  plain('/inbox      what is waiting on your call'),
  plain('/approve a1b2   ·  /decline a1b2'),
  plain('/digest     the latest weekly digests'),
  plain('/workspace  which workspace this chat talks to'),
].join('\n')

async function rolesOf(admin: SupabaseClient, ch: Channel): Promise<RoleRow[]> {
  const { data } = await admin.from('roles').select('*')
    .eq('owner', ch.owner).eq('brand_id', ch.brand_id).order('created_at', { ascending: true })
  return (data ?? []) as RoleRow[]
}

/** Workspaces this owner has actually staffed: the only ones a chat can be
    pointed at, and always read through the owner's own roles. */
async function staffedWorkspaces(admin: SupabaseClient, owner: string): Promise<{ id: string; name: string }[]> {
  const { data } = await admin.from('roles').select('brand_id').eq('owner', owner)
  const ids = [...new Set(((data ?? []) as { brand_id: string | null }[]).map((r) => r.brand_id).filter(Boolean))] as string[]
  if (!ids.length) return []
  const { data: brands } = await admin.from('brand_profiles').select('id, name').in('id', ids)
  return (brands ?? []) as { id: string; name: string }[]
}

async function brandName(admin: SupabaseClient, brandId: string | null): Promise<string> {
  if (!brandId) return 'your studio'
  const { data } = await admin.from('brand_profiles').select('name').eq('id', brandId).maybeSingle()
  return (data as { name?: string } | null)?.name ?? 'your studio'
}

/* ---- pairing ----------------------------------------------------------- */
async function pair(admin: SupabaseClient, chatId: string, label: string, code: string): Promise<string> {
  const { data } = await admin.from('org_channels').select('id, owner, brand_id')
    .eq('pair_code', code.trim().toUpperCase()).is('chat_id', null).limit(1)
  const row = (data ?? [])[0] as { id: string; owner: string; brand_id: string | null } | undefined
  if (!row) return plain('That code is not valid or has already been used. Generate a fresh one in Settings, Channel.')
  await admin.from('org_channels').update({
    chat_id: chatId, chat_label: label, pair_code: null, paired_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', row.id)
  const name = await brandName(admin, row.brand_id)
  const roles = await rolesOf(admin, { id: row.id, owner: row.owner, brand_id: row.brand_id, push: true })
  return [
    `${b('Linked to ' + name)}`,
    plain(roles.length ? `You are talking to ${roles.map((r) => r.name).join(', ')}.` : 'No roles hired yet: hire one in the studio and it will answer here.'),
    '',
    HELP,
  ].join('\n')
}

/* ---- command handling -------------------------------------------------- */
async function handle(admin: SupabaseClient, ch: Channel, chatId: string, text: string): Promise<void> {
  const trimmed = text.trim()
  const [head, ...rest] = trimmed.split(/\s+/)
  const cmd = head.toLowerCase().replace(/@.*$/, '') // /roles@mybot -> /roles
  const arg = rest.join(' ')
  const roles = await rolesOf(admin, ch)

  if (cmd === '/help' || cmd === '/start') return sendMessage(chatId, HELP)

  if (cmd === '/workspace') {
    const staffed = await staffedWorkspaces(admin, ch.owner)
    if (!arg) {
      const names = staffed.map((x) => `${x.id === ch.brand_id ? '• ' : '  '}${x.name}`).join('\n')
      return sendMessage(chatId, [b(`This chat talks to ${await brandName(admin, ch.brand_id)}`), names ? plain(names) : '', plain('Switch with /workspace <name>. Each workspace has its own roles and its own material: they never mix.')].filter(Boolean).join('\n'))
    }
    const match = staffed.find((x) => norm(x.name).includes(norm(arg)))
    if (!match) return sendMessage(chatId, plain('No workspace by that name with roles hired.'))
    await admin.from('org_channels').update({ brand_id: match.id, updated_at: new Date().toISOString() }).eq('id', ch.id)
    return sendMessage(chatId, plain(`This chat now talks to ${match.name}. Its roles only see ${match.name}'s work.`))
  }

  if (cmd === '/roles') {
    if (!roles.length) return sendMessage(chatId, plain('No roles hired in this workspace yet.'))
    const lines = await Promise.all(roles.map(async (r) => {
      const { count } = await admin.from('role_items').select('id', { count: 'exact', head: true })
        .eq('role_id', r.id).eq('status', 'open')
      const cad = r.schedule?.cadence && r.schedule.cadence !== 'off' ? r.schedule.cadence : 'on demand'
      return plain(`• ${r.name} (${r.title}) — ${cad}${r.enabled ? '' : ', paused'}${count ? `, ${count} awaiting you` : ''}`)
    }))
    return sendMessage(chatId, [b(await brandName(admin, ch.brand_id)), ...lines, '', plain('Brief one with @name, e.g. @cmo what should we ship this week?')].join('\n'))
  }

  if (cmd === '/inbox') {
    const { data } = await admin.from('role_items').select('id, role_id, kind, title, detail')
      .eq('owner', ch.owner).eq('brand_id', ch.brand_id).eq('status', 'open').order('created_at', { ascending: false }).limit(10)
    const items = (data ?? []) as { id: string; role_id: string; kind: string; title: string; detail: string }[]
    if (!items.length) return sendMessage(chatId, plain('Nothing is waiting on you.'))
    const byId = new Map(roles.map((r) => [r.id, r.name]))
    const lines = items.map((i) => `${b(`[${short(i.id)}]`)} ${plain(`${byId.get(i.role_id) ?? 'A role'} · ${i.kind}`)}\n${b(i.title)}\n${plain(i.detail.slice(0, 240))}`)
    return sendMessage(chatId, [b('Awaiting your call'), '', ...lines, '', plain('/approve a1b2  or  /decline a1b2')].join('\n\n'))
  }

  if (cmd === '/approve' || cmd === '/decline') {
    if (!arg) return sendMessage(chatId, plain(`Say which one: ${cmd} a1b2 (the code from /inbox).`))
    const { data } = await admin.from('role_items').select('id, title')
      .eq('owner', ch.owner).eq('brand_id', ch.brand_id).eq('status', 'open').limit(50)
    const match = ((data ?? []) as { id: string; title: string }[]).find((i) => short(i.id) === arg.trim().toLowerCase())
    if (!match) return sendMessage(chatId, plain('No open item with that code. Check /inbox.'))
    const status = cmd === '/approve' ? 'approved' : 'declined'
    await admin.from('role_items').update({ status, updated_at: new Date().toISOString() }).eq('id', match.id)
    return sendMessage(chatId, plain(`${status === 'approved' ? 'Approved' : 'Declined'}: ${match.title}. Every role sees this decision in its next run.`))
  }

  if (cmd === '/digest') {
    const { data } = await admin.from('role_runs').select('role_id, output, created_at')
      .eq('owner', ch.owner).eq('brand_id', ch.brand_id).eq('kind', 'digest').order('created_at', { ascending: false }).limit(4)
    const runs = (data ?? []) as { role_id: string; output?: { title?: string; summary?: string }; created_at: string }[]
    if (!runs.length) return sendMessage(chatId, plain('No digests yet. Roles with a cadence write one every Friday.'))
    const byId = new Map(roles.map((r) => [r.id, r.name]))
    return sendMessage(chatId, [b('Latest digests'), ...runs.map((r) => `\n${b(byId.get(r.role_id) ?? 'Role')} — ${plain(r.output?.title ?? '')}\n${plain(r.output?.summary ?? '')}`)].join('\n'))
  }

  /* ---- briefing a role ---- */
  if (!roles.length) return sendMessage(chatId, plain('No roles hired in this workspace yet.'))
  let target: RoleRow | undefined
  let brief = trimmed
  const addressed = trimmed.match(/^[@/](?:ask\s+)?([a-zA-Z][\w-]*)\s+([\s\S]+)$/)
  if (addressed) {
    const [, who, body] = addressed
    target = roles.find((r) => norm(r.name) === norm(who) || norm(r.key) === norm(who))
      ?? roles.find((r) => norm(r.name).startsWith(norm(who)) || norm(r.title).includes(norm(who)))
    if (target) brief = body
  }
  if (!target) {
    if (cmd.startsWith('/')) return sendMessage(chatId, [plain('I do not know that command.'), '', HELP].join('\n'))
    target = roles.find((r) => r.key === 'cmo' && r.enabled) ?? roles.find((r) => r.enabled) ?? roles[0]
  }
  if (!brief.trim()) return sendMessage(chatId, plain(`What should ${target.name} work on?`))

  await sendMessage(chatId, plain(`${target.name} is on it…`))
  await later((async () => {
    try {
      const { deliverable } = await executeRole(admin, target!, brief, 'task', { channel: null })
      await sendMessage(chatId, formatDeliverable(target!.name, 'task', deliverable, { full: true }))
    } catch (e) {
      await sendMessage(chatId, plain(`${target!.name} could not finish: ${e instanceof Error ? e.message : String(e)}`))
    }
  })())
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  if (!WEBHOOK_SECRET || req.headers.get('x-telegram-bot-api-secret-token') !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }
  let update: { message?: { chat?: { id?: number }; text?: string; from?: { first_name?: string; username?: string } } }
  try { update = await req.json() } catch { return new Response('ok') }
  const msg = update.message
  const chatId = msg?.chat?.id != null ? String(msg.chat.id) : ''
  const text = (msg?.text ?? '').trim()
  if (!chatId || !text) return new Response('ok')

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { data } = await admin.from('org_channels').select('id, owner, brand_id, push')
    .eq('provider', 'telegram').eq('chat_id', chatId).limit(1)
  const ch = (data ?? [])[0] as Channel | undefined
  const verb = text.split(/\s+/)[0].slice(0, 24) // the command only, never the message
  console.log(`update chat=${chatId} bound=${Boolean(ch)} verb=${verb}`)

  try {
    if (!ch) {
      // Unknown chat: pair, or say nothing about anyone's studio.
      const m = text.match(/^\/start\s+(\S+)/i)
      const label = [msg?.from?.first_name, msg?.from?.username ? `@${msg.from.username}` : ''].filter(Boolean).join(' ')
      const reply = m ? await pair(admin, chatId, label, m[1]) : plain('This chat is not linked to a studio. Open your copilot, go to Settings, Channel, and send me the code it gives you: /start CODE')
      await sendMessage(chatId, reply)
    } else {
      await handle(admin, ch, chatId, text)
    }
    console.log(`replied chat=${chatId} verb=${verb}`)
  } catch (e) {
    // Tell the sender rather than leaving them staring at silence, and always
    // answer Telegram 200 so it does not retry the same message every minute.
    const detail = e instanceof Error ? `${e.message}` : String(e)
    console.error(`failed chat=${chatId} verb=${verb}: ${detail}`)
    await sendMessage(chatId, plain(`Something went wrong: ${detail}`)).catch(() => {})
  }
  return new Response('ok')
})

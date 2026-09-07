// ============================================================================
// Hue & Heal :: telegram-bridge
// Talk to your org from your phone. One bot, many workspaces: a chat is bound
// to exactly one (owner, brand) pair by org_channels, so a message can only
// ever reach the roles of the workspace that chat is linked to, and a reply
// can only ever contain that workspace's material.
//
// Pair:      /start <code>            (code generated in Settings -> Channel)
// Commands:  /team /inbox /digest /approve <id> /decline <id> /workspace [name]
//            @growth <brief>  ·  @<lead name> <brief>  ·  plain text -> Head of Growth
// The founder talks to department leads only; a lead briefs its own team.
//
// Security: Telegram's own secret-token header is required, and an unknown
// chat is told nothing except how to pair. Never echo data before binding.
// Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, ANTHROPIC_API_KEY,
//          SUPABASE_SERVICE_ROLE_KEY
// Deploy:  npx supabase functions deploy telegram-bridge --no-verify-jwt --project-ref <ref>
// ============================================================================
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendMessage, b, plain, formatDeliverable } from '../_shared/telegram.ts'
import { executeDepartment, type RoleRow } from '../_shared/roleWork.ts'
import { costPence } from '../_shared/roleCore.ts'
import { deptOf } from '../_shared/orgShape.ts'

const WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

interface Channel { id: string; owner: string; brand_id: string | null; push: boolean }

const short = (id: string) => id.slice(0, 4)

/** Same words as the studio uses, so the org is briefed identically. */
const briefingTask = (text: string, deptName: string) =>
  `DAILY BRIEFING FROM THE FOUNDER, sent to every department lead at once:\n\n${text.trim()}\n\nYou are the ${deptName} lead. If nothing in this briefing concerns your department, say so in one line and stop: do not manufacture work. Otherwise: name what in it is yours, do it now where it can be done in this deliverable, hand anything that belongs to a colleague to them as a handoff, and say what you need from the founder. Short. Specific. Today.`
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
  plain('Just type to brief the Head of Growth, or:'),
  plain('@growth plan september   — brief a department lead'),
  plain('/brief <text>   brief every lead at once; replies land here'),
  plain('/team       your departments and who leads them'),
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

  if (cmd === '/brief' || cmd === '/briefing') {
    if (!arg.trim()) return sendMessage(chatId, plain('What is the briefing? /brief followed by the message.'))
    const leads = roles.filter((r) => r.seat !== 'member' && r.enabled)
    if (!leads.length) return sendMessage(chatId, plain('No departments hired in this workspace yet.'))
    const { data: br } = await admin.from('role_briefings').insert({ owner: ch.owner, brand_id: ch.brand_id, text: arg.trim(), source: 'telegram' }).select('id').single()
    const briefingId = (br as { id?: string } | null)?.id ?? null
    // Queue one job per lead and let the minute sweep run them: seven leads
    // in one webhook would keep Telegram waiting far too long.
    for (const lead of leads) {
      await admin.from('role_jobs').insert({
        owner: ch.owner, brand_id: ch.brand_id, role_id: lead.id, dept: lead.dept ?? null, briefing_id: briefingId,
        task: briefingTask(arg.trim(), deptOf(lead.dept)?.name ?? 'department'), source: 'telegram', status: 'queued',
      })
    }
    return sendMessage(chatId, plain(`Briefed ${leads.length} lead${leads.length === 1 ? '' : 's'}: ${leads.map((l) => l.name).join(', ')}. Replies will land here over the next few minutes${ch.push ? '' : ' if push is on in Settings, Channel'}, and on the Team page.`))
  }

  if (cmd === '/roles' || cmd === '/team') {
    const leads = roles.filter((r) => r.seat !== 'member')
    if (!leads.length) return sendMessage(chatId, plain('No departments hired in this workspace yet.'))
    const lines = await Promise.all(leads.map(async (r) => {
      const { count } = await admin.from('role_items').select('id', { count: 'exact', head: true })
        .eq('role_id', r.id).eq('status', 'open')
      const cad = r.schedule?.cadence && r.schedule.cadence !== 'off' ? r.schedule.cadence : 'on demand'
      const team = roles.filter((m) => m.seat === 'member' && m.dept === r.dept).length
      return plain(`• ${deptOf(r.dept)?.name ?? r.dept ?? 'Seat'}: ${r.name}${team ? ` +${team}` : ''} — ${cad}${r.enabled ? '' : ', paused'}${count ? `, ${count} awaiting you` : ''}`)
    }))
    return sendMessage(chatId, [b(await brandName(admin, ch.brand_id)), ...lines, '', plain('Brief a department with @key, e.g. @growth what should we ship this week?')].join('\n'))
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

  /* ---- briefing a department lead ---- */
  const leads = roles.filter((r) => r.seat !== 'member')
  if (!leads.length) return sendMessage(chatId, plain('No departments hired in this workspace yet.'))
  let target: RoleRow | undefined
  let brief = trimmed
  const addressed = trimmed.match(/^[@/](?:ask\s+)?([a-zA-Z][\w-]*)\s+([\s\S]+)$/)
  if (addressed) {
    const [, who, body] = addressed
    const w = norm(who)
    target = leads.find((r) => norm(r.dept ?? '') === w || norm(r.key) === w || norm(r.name) === w || norm(deptOf(r.dept)?.name ?? '') === w)
      ?? leads.find((r) => norm(r.name).startsWith(w) || norm(r.title).includes(w) || norm(deptOf(r.dept)?.name ?? '').startsWith(w))
    if (target) brief = body
  }
  if (!target) {
    if (cmd.startsWith('/')) return sendMessage(chatId, [plain('I do not know that command.'), '', HELP].join('\n'))
    target = leads.find((r) => r.dept === 'growth' && r.enabled) ?? leads.find((r) => r.enabled) ?? leads[0]
  }
  if (!brief.trim()) return sendMessage(chatId, plain(`What should ${target.name} work on?`))

  // File the work as a job first, so it appears on the role's board in the
  // studio while it runs, wherever it was assigned from.
  const { data: jobRow } = await admin.from('role_jobs').insert({
    owner: ch.owner, brand_id: ch.brand_id, role_id: target.id, dept: target.dept ?? null, task: brief,
    source: 'telegram', status: 'running', started_at: new Date().toISOString(),
  }).select('id').single()
  const jobId = (jobRow as { id?: string } | null)?.id ?? null

  await sendMessage(chatId, plain(`${target.name} is on it…`))
  await later((async () => {
    try {
      const { deliverable, runId, usage, plan } = await executeDepartment(admin, target!, brief, 'task', { channel: null, jobId })
      if (jobId) await admin.from('role_jobs').update({ status: 'done', run_id: runId, finished_at: new Date().toISOString(), approval: deliverable.external ? 'pending' : 'none', plan, cost_pence: costPence(usage) }).eq('id', jobId)
      const who = plan?.approach === 'team' ? `${target!.name} with ${plan.assignments.map((a) => a.to).join(', ')}` : target!.name
      await sendMessage(chatId, formatDeliverable(who, 'task', deliverable, { full: true }) + (deliverable.external ? `\n\n${b('Waiting for your approval in the studio before anything goes out.')}` : ''))
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e)
      if (jobId) await admin.from('role_jobs').update({ status: 'failed', error: detail.slice(0, 500), finished_at: new Date().toISOString() }).eq('id', jobId)
      await sendMessage(chatId, plain(`${target!.name} could not finish: ${detail}`))
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

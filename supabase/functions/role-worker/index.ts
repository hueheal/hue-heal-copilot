// ============================================================================
// Hue & Heal :: role-worker
// Runs assigned jobs. Two ways in:
//   • the studio, right after it files a job: Authorization: Bearer <user jwt>
//     plus {jobId}. The job is only run if it belongs to that user.
//   • the studio asking a department to learn now: {retro: <lead role id>}.
//   • the every-minute sweep: x-cron-secret, no body. Picks up anything the
//     studio could not kick off (closed laptop, dropped request) and anything
//     a worker abandoned.
// Either way the job row is claimed atomically, so a job never runs twice.
// Deploy: npx supabase functions deploy role-worker --no-verify-jwt --project-ref <ref>
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { executeDepartment, retroDepartment, routeBriefing, deskBriefing, chiefOf, type RoleRow } from '../_shared/roleWork.ts'
import { costPence } from '../_shared/roleCore.ts'
import { hasTelegram, sendMessage } from '../_shared/telegram.ts'

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

interface Job {
  id: string; owner: string; brand_id: string | null; role_id: string
  task: string; source: string; status: string; briefing_id: string | null
}

/** Claim a job: only one caller can move it out of queued. */
async function claim(admin: SupabaseClient, jobId: string): Promise<Job | null> {
  const { data } = await admin.from('role_jobs')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', jobId).eq('status', 'queued')
    .select('id, owner, brand_id, role_id, task, source, status, briefing_id').maybeSingle()
  return (data as Job) ?? null
}

async function chatFor(admin: SupabaseClient, owner: string, brandId: string | null): Promise<string | null> {
  if (!hasTelegram()) return null
  const { data } = await admin.from('org_channels').select('chat_id')
    .eq('owner', owner).eq('brand_id', brandId).eq('push', true).not('chat_id', 'is', null).limit(1)
  return ((data ?? [])[0] as { chat_id?: string } | undefined)?.chat_id ?? null
}

async function work(admin: SupabaseClient, job: Job): Promise<string> {
  try {
    const { data: roleRow } = await admin.from('roles').select('*').eq('id', job.role_id).maybeSingle()
    const role = roleRow as RoleRow | null
    if (!role) throw new Error('That role no longer exists')
    // A long job should find you wherever you are, so the result is pushed to
    // the linked chat as well as landing in the studio.
    const channel = await chatFor(admin, job.owner, job.brand_id)

    /* The chief of staff's two jobs: route a briefing, and write the desk. */
    if (role.key === 'chief' && job.briefing_id && job.task.startsWith('ROUTE:')) {
      const { data: b } = await admin.from('role_briefings').select('id, text, source').eq('id', job.briefing_id).maybeSingle()
      if (!b) throw new Error('That briefing no longer exists')
      const r = await routeBriefing(admin, role, b as { id: string; text: string; source: string }, { jobId: job.id })
      await admin.from('role_jobs').update({ status: 'done', run_id: r.runId, finished_at: new Date().toISOString(), dept: role.dept ?? null }).eq('id', job.id)
      if (channel && (b as { source: string }).source !== 'telegram') await sendMessage(channel, `<b>Chief of staff</b>\n${r.reply}`)
      // Nothing to wait for: the desk is just the reply.
      if (r.jobs === 0) await admin.from('role_jobs').update({ reviewed_at: new Date().toISOString() }).eq('id', job.id)
      return 'routed'
    }
    if (role.key === 'chief' && job.briefing_id && job.task.startsWith('DESK:')) {
      const { runId, usage } = await deskBriefing(admin, role, job.briefing_id, { jobId: job.id, channel })
      await admin.from('role_jobs').update({ status: 'done', run_id: runId, finished_at: new Date().toISOString(), dept: role.dept ?? null, cost_pence: costPence(usage) }).eq('id', job.id)
      return 'desk'
    }

    // A lead may brief its team; a member answers alone. Either way one
    // deliverable comes back, and if acting on it would leave the building
    // it waits for the founder's approval.
    const { deliverable, runId, usage, plan } = await executeDepartment(admin, role, job.task, 'task', { channel: job.briefing_id ? null : channel, jobId: job.id })
    await admin.from('role_jobs').update({
      status: 'done', run_id: runId, finished_at: new Date().toISOString(),
      dept: role.dept ?? null, approval: deliverable.external ? 'pending' : 'none',
      plan, cost_pence: costPence(usage),
    }).eq('id', job.id)
    await maybeQueueDesk(admin, job)
    return 'done'
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    await admin.from('role_jobs').update({
      status: 'failed', error: detail.slice(0, 500), finished_at: new Date().toISOString(),
    }).eq('id', job.id)
    await maybeQueueDesk(admin, job).catch(() => {})
    return `failed: ${detail}`
  }
}

/** Once the last lead has answered a briefing, the chief writes the desk. */
async function maybeQueueDesk(admin: SupabaseClient, job: Job): Promise<void> {
  if (!job.briefing_id) return
  const chief = await chiefOf(admin, job.owner, job.brand_id)
  if (!chief) return
  const { data: open } = await admin.from('role_jobs').select('id').eq('briefing_id', job.briefing_id).in('status', ['queued', 'running']).limit(1)
  if (open?.length) return
  const { data: desk } = await admin.from('role_jobs').select('id').eq('briefing_id', job.briefing_id).eq('role_id', chief.id).like('task', 'DESK:%').limit(1)
  if (desk?.length) return
  await admin.from('role_jobs').insert({
    owner: job.owner, brand_id: job.brand_id, role_id: chief.id, dept: chief.dept ?? null, briefing_id: job.briefing_id,
    task: 'DESK: one thing to do now, from the replies to your briefing.', source: 'desk', status: 'queued',
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const body = await req.json().catch(() => ({})) as { jobId?: string; retro?: string }

  /* ---- the sweep ---- */
  if (CRON_SECRET && req.headers.get('x-cron-secret') === CRON_SECRET) {
    // Jobs the studio kicked off itself are given 45 seconds before the sweep
    // takes them; jobs queued from the phone are swept straight away.
    const cutoff = new Date(Date.now() - 45_000).toISOString()
    const { data } = await admin.from('role_jobs').select('id')
      .eq('status', 'queued').or(`created_at.lt.${cutoff},source.in.(telegram,desk)`).order('created_at').limit(4)
    const results: Record<string, string> = {}
    for (const row of (data ?? []) as { id: string }[]) {
      const job = await claim(admin, row.id)
      if (job) results[job.id] = await work(admin, job)
    }
    // A worker that died mid-job would otherwise spin forever: after ten
    // minutes (a team run can take a few), call it what it is.
    const stale = new Date(Date.now() - 900_000).toISOString()
    await admin.from('role_jobs').update({ status: 'failed', error: 'The run did not finish. Assign it again.', finished_at: new Date().toISOString() })
      .eq('status', 'running').lt('started_at', stale)
    return json({ ok: true, swept: Object.keys(results).length, results })
  }

  /* ---- the studio, kicking off its own job ---- */
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ') || !(body.jobId || body.retro)) return json({ error: 'Unauthorized' }, 401)
  const asUser = createClient(SUPABASE_URL, ANON, { global: { headers: { authorization: auth } } })
  const { data: userData } = await asUser.auth.getUser()
  const uid = userData.user?.id
  if (!uid) return json({ error: 'Unauthorized' }, 401)

  /* ---- the Friday learning, on demand ---- */
  if (body.retro) {
    const { data: leadRow } = await admin.from('roles').select('*').eq('id', body.retro).maybeSingle()
    const lead = leadRow as RoleRow | null
    if (!lead || lead.owner !== uid) return json({ error: 'Not your seat' }, 403)
    try {
      const r = await retroDepartment(admin, lead, { channel: await chatFor(admin, lead.owner, lead.brand_id) })
      return json({ ok: true, lessons: r?.lessons ?? [], note: r ? undefined : 'Nothing to learn from yet: the department has not done any work this week.' })
    } catch (e) { return json({ error: e instanceof Error ? e.message : String(e) }, 500) }
  }

  const { data: owned } = await admin.from('role_jobs').select('id, owner').eq('id', body.jobId).maybeSingle()
  if (!owned || (owned as { owner: string }).owner !== uid) return json({ error: 'Not your job' }, 403)

  const job = await claim(admin, body.jobId)
  if (!job) return json({ ok: true, note: 'already running' })
  const result = await work(admin, job)
  return json({ ok: true, result })
})

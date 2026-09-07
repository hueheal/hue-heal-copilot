// ============================================================================
// Hue & Heal :: role-scheduler
// The cadence engine for the org. Invoked daily (chained from the 7am
// daily-posts cron; also callable with the same x-cron-secret). For every
// enabled lead whose schedule is due today it runs the standing task through
// its department, and on Fridays it also writes the weekly digest and runs
// each department's retro, which rewrites the playbook. Deliverables land in
// role_runs; needs and experiments land in role_items; notes to colleagues
// land in role_notes. If the workspace has a linked Telegram chat, each
// deliverable is pushed there.
// Secrets: CRON_SECRET (same as daily-posts), ANTHROPIC_API_KEY,
// SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN (optional).
// Deploy:  npx supabase functions deploy role-scheduler --no-verify-jwt --project-ref <ref>
// ============================================================================
import { json } from '../_shared/cors.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DIGEST_TASK, costPence } from '../_shared/roleCore.ts'
import { executeDepartment, retroDepartment, brandFor, type RoleRow } from '../_shared/roleWork.ts'
import { buildFacts } from '../_shared/workspaceFacts.ts'
import { hasTelegram } from '../_shared/telegram.ts'
import { deptOf } from '../_shared/orgShape.ts'

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function dueToday(cadence: string | undefined, day: number): boolean {
  if (cadence === 'daily') return true
  if (cadence === 'weekdays') return day >= 1 && day <= 5
  if (cadence === 'weekly') return day === 1 // Mondays
  return false
}

/** The chat this workspace's reports go to, if one is linked and push is on. */
async function pushChannel(admin: SupabaseClient, owner: string, brandId: string | null): Promise<string | null> {
  if (!hasTelegram()) return null
  const { data } = await admin.from('org_channels').select('chat_id')
    .eq('owner', owner).eq('brand_id', brandId).eq('push', true).not('chat_id', 'is', null).limit(1)
  return ((data ?? [])[0] as { chat_id?: string } | undefined)?.chat_id ?? null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) return json({ error: 'Unauthorized' }, 401)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const day = new Date().getUTCDay() // 0 Sun … 6 Sat
  const friday = day === 5

  // Only leads run on a cadence: members work when their lead briefs them.
  const { data: roles } = await admin.from('roles').select('*').eq('enabled', true).neq('seat', 'member')
  // Run in department order so the day compounds: Growth sets direction,
  // Product answers it, and so on. Each one reads the ones before it.
  const rank = (r: RoleRow) => deptOf(r.dept)?.order ?? 99
  const queue = ((roles ?? []) as RoleRow[]).slice().sort((a, b) => rank(a) - rank(b))
  const results: Record<string, string> = {}
  for (const role of queue) {
    const cadence = role.schedule?.cadence
    const runStanding = dueToday(cadence, day)
    try {
      const brand = await brandFor(admin, role.brand_id)
      const channel = await pushChannel(admin, role.owner, role.brand_id)
      if (runStanding || (friday && cadence && cadence !== 'off')) {
        // Read the workspace once; every job for this role shares it.
        const facts = await buildFacts(admin, role.owner, role.brand_id)
        const jobs: { kind: 'scheduled' | 'digest'; task: string }[] = []
        if (runStanding) jobs.push({ kind: 'scheduled', task: role.schedule?.task?.trim() || `Do today's review of your department: what moved since yesterday, what needs attention today, and the single most valuable thing to make or fix. Propose at most two pieces as actions.` })
        if (friday && cadence && cadence !== 'off') jobs.push({ kind: 'digest', task: DIGEST_TASK })
        for (const job of jobs) {
          // Every scheduled run is a job too, so it shows on the board and
          // waits for approval like anything else that leaves the building.
          const { data: jobRow } = await admin.from('role_jobs').insert({
            owner: role.owner, brand_id: role.brand_id, role_id: role.id, dept: role.dept ?? null,
            task: job.task, source: 'schedule', status: 'running', started_at: new Date().toISOString(),
          }).select('id').single()
          const jobId = (jobRow as { id?: string } | null)?.id ?? null
          const { deliverable, runId, usage, plan } = await executeDepartment(admin, role, job.task, job.kind, { brand, facts, channel, jobId })
          if (jobId) await admin.from('role_jobs').update({ status: 'done', run_id: runId, finished_at: new Date().toISOString(), approval: deliverable.external ? 'pending' : 'none', plan, cost_pence: costPence(usage) }).eq('id', jobId)
          results[`${role.name}:${job.kind}`] = 'ok'
        }
      }
      // Friday learning happens for every department that did any work this
      // week, cadence or not: on-demand departments learn too.
      if (friday) {
        const retro = await retroDepartment(admin, role, { channel })
        results[`${role.name}:retro`] = retro ? `${retro.lessons.length} lessons` : 'nothing to learn from'
      }
    } catch (e) {
      results[role.name] = e instanceof Error ? e.message : String(e)
    }
  }
  return json({ ok: true, results })
})

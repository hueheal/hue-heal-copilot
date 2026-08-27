// ============================================================================
// Hue & Heal :: role-scheduler
// The cadence engine for roles. Invoked daily (chained from the 7am
// daily-posts cron; also callable with the same x-cron-secret). For every
// enabled role whose schedule is due today it runs the standing task, and on
// Fridays it also writes the weekly digest. Deliverables land in role_runs;
// tool needs and experiment proposals land in the role_items ledger; notes to
// colleagues land in role_notes and are read into their next run.
// If the workspace has a linked Telegram chat, each deliverable is pushed there.
// Secrets: CRON_SECRET (same as daily-posts), ANTHROPIC_API_KEY,
// SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN (optional).
// Deploy:  npx supabase functions deploy role-scheduler --no-verify-jwt --project-ref <ref>
// ============================================================================
import { json } from '../_shared/cors.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DIGEST_TASK } from '../_shared/roleCore.ts'
import { executeRole, brandFor, type RoleRow } from '../_shared/roleWork.ts'
import { buildFacts } from '../_shared/workspaceFacts.ts'
import { hasTelegram } from '../_shared/telegram.ts'

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
  const digestDay = day === 5 // Fridays

  const { data: roles } = await admin.from('roles').select('*').eq('enabled', true)
  // Run in order of precedence so the day compounds: the CMO sets direction,
  // the editor shapes the stories, social plans against both, the guardian
  // checks the result. Each one reads the ones before it in its org brief.
  const ORDER = ['cmo', 'editor', 'social', 'guardian']
  const queue = ((roles ?? []) as RoleRow[]).slice().sort((a, b) => {
    const rank = (k: string) => { const i = ORDER.indexOf(k); return i === -1 ? ORDER.length : i }
    return rank(a.key) - rank(b.key)
  })
  const results: Record<string, string> = {}
  for (const role of queue) {
    const cadence = role.schedule?.cadence
    const runStanding = dueToday(cadence, day)
    if (!runStanding && !(digestDay && cadence && cadence !== 'off')) continue
    try {
      // Read the workspace once; every job for this role shares it.
      const brand = await brandFor(admin, role.brand_id)
      const facts = await buildFacts(admin, role.owner, role.brand_id)
      const channel = await pushChannel(admin, role.owner, role.brand_id)
      const jobs: { kind: 'scheduled' | 'digest'; task: string }[] = []
      if (runStanding) jobs.push({ kind: 'scheduled', task: role.schedule?.task?.trim() || `Do today's review of your division: what moved since yesterday, what needs attention today, and the single most valuable thing to make or fix. Propose at most two pieces as actions.` })
      if (digestDay && cadence && cadence !== 'off') jobs.push({ kind: 'digest', task: DIGEST_TASK })
      for (const job of jobs) {
        await executeRole(admin, role, job.task, job.kind, { brand, facts, channel })
        results[`${role.name}:${job.kind}`] = 'ok'
      }
    } catch (e) {
      results[role.name] = e instanceof Error ? e.message : String(e)
    }
  }
  return json({ ok: true, results })
})

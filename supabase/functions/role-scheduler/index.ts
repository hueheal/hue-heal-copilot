// ============================================================================
// Hue & Heal :: role-scheduler
// The cadence engine for roles. Invoked daily (chained from the 7am
// daily-posts cron; also callable with the same x-cron-secret). For every
// enabled role whose schedule is due today it runs the standing task, and on
// Fridays it also writes the weekly digest. Deliverables land in role_runs;
// tool needs and experiment proposals land in the role_items ledger.
// Secrets: CRON_SECRET (same as daily-posts), ANTHROPIC_API_KEY,
// SUPABASE_SERVICE_ROLE_KEY.
// Deploy:  npx supabase functions deploy role-scheduler --no-verify-jwt --project-ref <ref>
// ============================================================================
import { json } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { runPersona, DIGEST_TASK, type BrandDef } from '../_shared/roleCore.ts'
import { knowledge, buildFacts } from './facts.ts'

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

interface RoleRow {
  id: string; owner: string; brand_id: string | null; key: string; name: string; title: string
  charter: string; instructions: string; enabled: boolean
  schedule: { cadence?: string; task?: string } | null
}

function dueToday(cadence: string | undefined, day: number): boolean {
  if (cadence === 'daily') return true
  if (cadence === 'weekdays') return day >= 1 && day <= 5
  if (cadence === 'weekly') return day === 1 // Mondays
  return false
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) return json({ error: 'Unauthorized' }, 401)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const day = new Date().getUTCDay() // 0 Sun … 6 Sat
  const digestDay = day === 5 // Fridays

  const { data: roles } = await admin.from('roles').select('*').eq('enabled', true)
  const results: Record<string, string> = {}
  for (const role of (roles ?? []) as RoleRow[]) {
    const cadence = role.schedule?.cadence
    const runStanding = dueToday(cadence, day)
    if (!runStanding && !(digestDay && cadence && cadence !== 'off')) continue
    try {
      const { data: brandRow } = role.brand_id
        ? await admin.from('brand_profiles').select('name, tagline, tone_of_voice, writing_guidelines, knowledge').eq('id', role.brand_id).maybeSingle()
        : { data: null }
      const brand: BrandDef = {
        name: (brandRow as { name?: string } | null)?.name,
        tagline: (brandRow as { tagline?: string } | null)?.tagline ?? undefined,
        voice: (brandRow as { tone_of_voice?: string } | null)?.tone_of_voice ?? undefined,
        guidelines: (brandRow as { writing_guidelines?: string } | null)?.writing_guidelines ?? undefined,
        knowledge: knowledge((brandRow as { knowledge?: Record<string, string> } | null)?.knowledge),
      }
      const facts = await buildFacts(admin, role.owner, role.brand_id)
      const jobs: { kind: string; task: string }[] = []
      if (runStanding) jobs.push({ kind: 'scheduled', task: role.schedule?.task?.trim() || `Do today's review of your division: what moved since yesterday, what needs attention today, and the single most valuable thing to make or fix. Propose at most two pieces as actions.` })
      if (digestDay && cadence && cadence !== 'off') jobs.push({ kind: 'digest', task: DIGEST_TASK })
      for (const job of jobs) {
        const deliverable = await runPersona(role, brand, facts, job.task)
        const { data: run } = await admin.from('role_runs').insert({ owner: role.owner, role_id: role.id, task: job.task, output: deliverable, kind: job.kind }).select('id').single()
        const runId = (run as { id?: string } | null)?.id ?? null
        for (const kind of ['needs', 'experiments'] as const) {
          for (const item of ((deliverable[kind] as { title: string; detail: string }[]) ?? []).slice(0, 3)) {
            const itemKind = kind === 'needs' ? 'need' : 'experiment'
            const { data: existing } = await admin.from('role_items').select('id').eq('role_id', role.id).eq('kind', itemKind).eq('title', item.title).limit(1)
            if (!existing?.length) await admin.from('role_items').insert({ owner: role.owner, role_id: role.id, run_id: runId, kind: itemKind, title: item.title, detail: item.detail })
          }
        }
        results[`${role.name}:${job.kind}`] = 'ok'
      }
    } catch (e) {
      results[role.name] = e instanceof Error ? e.message : String(e)
    }
  }
  return json({ ok: true, results })
})

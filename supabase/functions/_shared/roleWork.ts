// ============================================================================
// One unit of role work, end to end, server side. Used by role-scheduler
// (cadenced runs and the weekly digest) and by telegram-bridge (asking a role
// something from your phone), so a role behaves identically wherever it is
// asked: same org brief, same persistence, same ledger, same handoffs.
// ============================================================================
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { runPersona, type BrandDef } from './roleCore.ts'
import { buildOrgBrief, fileHandoffs, ownsOf } from './orgBrief.ts'
import { buildFacts, knowledge } from './workspaceFacts.ts'
import { sendMessage, formatDeliverable } from './telegram.ts'

export interface RoleRow {
  id: string; owner: string; brand_id: string | null; key: string; name: string; title: string
  charter: string; instructions: string; enabled: boolean
  schedule?: { cadence?: string; task?: string } | null
}

export interface Deliverable {
  title?: string; summary?: string
  sections?: { heading: string; body: string }[]
  actions?: { kind: string; topic: string; note?: string }[]
  needs?: { title: string; detail: string }[]
  experiments?: { title: string; detail: string }[]
  handoffs?: { to?: string; subject?: string; body?: string }[]
}

/** The brand pack for a role's workspace. Always read through brand_id, so a
    role can only ever be dressed in its own workspace's voice. */
export async function brandFor(admin: SupabaseClient, brandId: string | null): Promise<BrandDef> {
  if (!brandId) return {}
  const { data } = await admin.from('brand_profiles')
    .select('name, tagline, tone_of_voice, writing_guidelines, knowledge').eq('id', brandId).maybeSingle()
  const row = data as { name?: string; tagline?: string; tone_of_voice?: string; writing_guidelines?: string; knowledge?: Record<string, string> } | null
  return {
    name: row?.name, tagline: row?.tagline ?? undefined,
    voice: row?.tone_of_voice ?? undefined, guidelines: row?.writing_guidelines ?? undefined,
    knowledge: knowledge(row?.knowledge),
  }
}

export async function executeRole(
  admin: SupabaseClient,
  role: RoleRow,
  task: string,
  kind: 'task' | 'scheduled' | 'digest',
  opts: { brand?: BrandDef; facts?: string; channel?: string | null } = {},
): Promise<{ deliverable: Deliverable; runId: string | null }> {
  const brand = opts.brand ?? (await brandFor(admin, role.brand_id))
  const facts = opts.facts ?? (await buildFacts(admin, role.owner, role.brand_id))
  const org = await buildOrgBrief(admin, role)

  const deliverable = await runPersona(
    { name: role.name, title: role.title, charter: role.charter, instructions: role.instructions, owns: ownsOf(role) },
    brand, facts, task, { brief: org.brief, colleagues: org.colleagues },
  ) as Deliverable

  const { data: run } = await admin.from('role_runs')
    .insert({ owner: role.owner, role_id: role.id, brand_id: role.brand_id, task, output: deliverable, kind })
    .select('id').single()
  const runId = (run as { id?: string } | null)?.id ?? null

  for (const group of ['needs', 'experiments'] as const) {
    const itemKind = group === 'needs' ? 'need' : 'experiment'
    for (const item of (deliverable[group] ?? []).slice(0, 3)) {
      const { data: existing } = await admin.from('role_items').select('id')
        .eq('role_id', role.id).eq('kind', itemKind).eq('title', item.title).limit(1)
      if (!existing?.length) {
        await admin.from('role_items').insert({
          owner: role.owner, role_id: role.id, brand_id: role.brand_id, run_id: runId,
          kind: itemKind, title: item.title, detail: item.detail,
        })
      }
    }
  }

  await fileHandoffs(admin, role, runId, deliverable.handoffs)
  // Whatever was in the inbox has now been answered in this deliverable.
  await admin.from('role_notes').update({ status: 'acknowledged', updated_at: new Date().toISOString() })
    .eq('owner', role.owner).eq('to_role_id', role.id).eq('status', 'open')

  if (opts.channel) await sendMessage(opts.channel, formatDeliverable(role.name, kind, deliverable, { full: kind !== 'scheduled' }))
  return { deliverable, runId }
}

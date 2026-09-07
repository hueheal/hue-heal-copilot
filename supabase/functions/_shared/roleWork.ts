// ============================================================================
// One unit of work, end to end, server side. Used by role-worker (jobs),
// role-scheduler (cadenced runs, digests, the Friday retro) and
// telegram-bridge, so a seat behaves identically wherever it is asked: same
// org brief, same playbook, same persistence, same ledger, same handoffs.
//
// executeRole      one seat, one deliverable.
// executeDepartment a lead decides whether the task needs the team, briefs
//                   members in parallel, then compiles and signs one
//                   deliverable. The founder only ever reads the lead's.
// retroDepartment  the Friday learning: the lead rewrites the playbook.
// ============================================================================
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { runPersona, planTask, runRetro, routeMessage, DESK_TASK, costPence, addUsage, ZERO, type BrandDef, type Usage } from './roleCore.ts'
import { buildOrgBrief, fileHandoffs } from './orgBrief.ts'
import { buildFacts, knowledge } from './workspaceFacts.ts'
import { sendMessage, formatDeliverable } from './telegram.ts'
import { roleDef, deptOf, toolsLine, ownsOf } from './orgShape.ts'
import { loadLibrary, composePrompt, promptParts, imageryLine, surfaceRatio, destinationFor, type ImageRequest } from './imagery.ts'
import { hasHiggsfield, generateImage, download, asAspect } from './higgsfield.ts'

/* `owner` is the signed-in user who does the work, which is not always the
   brand profile's owner: a brand can be shared with members. Every row a seat
   writes carries the seat's owner, never the brand's. */
export interface RoleRow {
  id: string; owner: string; brand_id: string | null; key: string; name: string; title: string
  charter: string; instructions: string; enabled: boolean
  dept?: string | null; seat?: string | null
  schedule?: { cadence?: string; task?: string } | null
}

export interface Deliverable {
  title?: string; summary?: string
  sections?: { heading: string; body: string }[]
  actions?: { kind: string; topic: string; note?: string }[]
  needs?: { title: string; detail: string; tool?: string; cost?: string }[]
  experiments?: { title: string; detail: string }[]
  handoffs?: { to?: string; subject?: string; body?: string }[]
  images?: ImageRequest[]
  external?: boolean
}

export interface DeptState { playbook: string; budget_pence: number; tools: string[] }

/** The brand pack for a seat's workspace. Always read through brand_id, so a
    seat can only ever be dressed in its own workspace's voice. */
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

export async function deptStateFor(admin: SupabaseClient, owner: string, brandId: string | null, dept: string | null | undefined): Promise<DeptState> {
  if (!brandId || !dept) return { playbook: '', budget_pence: 5000, tools: [] }
  const { data } = await admin.from('dept_state').select('playbook, budget_pence, tools')
    .eq('owner', owner).eq('brand_id', brandId).eq('dept', dept).maybeSingle()
  const row = data as { playbook?: string; budget_pence?: number; tools?: string[] } | null
  return { playbook: row?.playbook ?? '', budget_pence: row?.budget_pence ?? 5000, tools: Array.isArray(row?.tools) ? row!.tools! : [] }
}

interface Ctx { brand: BrandDef; facts: string; state: DeptState }
async function context(admin: SupabaseClient, role: RoleRow, opts: Partial<Ctx>): Promise<Ctx> {
  const brand = opts.brand ?? (await brandFor(admin, role.brand_id))
  const facts = opts.facts ?? (await buildFacts(admin, role.owner, role.brand_id))
  const state = opts.state ?? (await deptStateFor(admin, role.owner, role.brand_id, role.dept))
  return { brand, facts, state }
}

export interface RunOpts extends Partial<Ctx> {
  channel?: string | null
  jobId?: string | null
  /** Answer alone even if the department has a team. */
  solo?: boolean
  /** A member's brief from its lead. */
  briefedBy?: string
  /** A lead's compile pass: the team's work. */
  contributions?: string
}

export async function executeRole(
  admin: SupabaseClient,
  role: RoleRow,
  task: string,
  kind: 'task' | 'scheduled' | 'digest',
  opts: RunOpts = {},
): Promise<{ deliverable: Deliverable; runId: string | null; usage: Usage }> {
  const { brand, facts, state } = await context(admin, role, opts)
  const org = await buildOrgBrief(admin, role, brand.name)
  const canImage = state.tools.includes('higgsfield') && hasHiggsfield()
  const imagery = canImage ? imageryLine(await loadLibrary(admin, role.brand_id)) : ''

  const { output, usage } = await runPersona(
    roleDef(role, brand.name), brand, facts, task,
    {
      brief: org.brief, colleagues: org.colleagues,
      playbook: state.playbook, tools: toolsLine(deptOf(role.dept), state.tools), imagery,
      briefedBy: opts.briefedBy, contributions: opts.contributions,
    },
  )
  if (!canImage) delete (output as Deliverable).images
  const deliverable = output as Deliverable

  const { data: run } = await admin.from('role_runs')
    .insert({
      owner: role.owner, role_id: role.id, brand_id: role.brand_id, task, output: deliverable, kind,
      job_id: opts.jobId ?? null, tokens_in: usage.input_tokens, tokens_out: usage.output_tokens, cost_pence: costPence(usage),
    })
    .select('id').single()
  const runId = (run as { id?: string } | null)?.id ?? null

  for (const group of ['needs', 'experiments'] as const) {
    const itemKind = group === 'needs' ? 'need' : 'experiment'
    for (const item of (deliverable[group] ?? []).slice(0, 3)) {
      const { data: existing } = await admin.from('role_items').select('id')
        .eq('role_id', role.id).eq('kind', itemKind).eq('title', item.title).limit(1)
      if (!existing?.length) {
        const need = item as { title: string; detail: string; tool?: string; cost?: string }
        const detail = [need.detail, need.tool ? `Tool: ${need.tool}.` : '', need.cost ? `Cost: ${need.cost}.` : ''].filter(Boolean).join(' ')
        await admin.from('role_items').insert({
          owner: role.owner, role_id: role.id, brand_id: role.brand_id, run_id: runId,
          kind: itemKind, title: item.title, detail,
        })
      }
    }
  }

  await fileHandoffs(admin, role, runId, deliverable.handoffs)
  // Whatever was in the inbox has now been answered in this deliverable.
  await admin.from('role_notes').update({ status: 'acknowledged', updated_at: new Date().toISOString() })
    .eq('owner', role.owner).eq('to_role_id', role.id).eq('status', 'open')

  if (opts.channel) await sendMessage(opts.channel, formatDeliverable(role.name, kind, deliverable, { full: kind !== 'scheduled' }))
  return { deliverable, runId, usage }
}

export interface Plan { approach: 'solo' | 'team'; reason: string; assignments: { to: string; roleId?: string; brief: string; runId?: string | null; ok?: boolean }[] }

/** Members of a lead's department, same workspace only. */
export async function teamOf(admin: SupabaseClient, lead: RoleRow): Promise<RoleRow[]> {
  if (!lead.dept) return []
  const { data } = await admin.from('roles').select('*')
    .eq('owner', lead.owner).eq('brand_id', lead.brand_id).eq('dept', lead.dept).eq('seat', 'member').eq('enabled', true)
  return (data ?? []) as RoleRow[]
}

/** The department path. Cheap when the task is focused (the lead answers
    alone), deeper when it is not (members run in parallel, the lead
    compiles). Either way the founder gets one deliverable, signed by the lead. */
export async function executeDepartment(
  admin: SupabaseClient,
  lead: RoleRow,
  task: string,
  kind: 'task' | 'scheduled' | 'digest',
  opts: RunOpts = {},
): Promise<{ deliverable: Deliverable; runId: string | null; usage: Usage; plan: Plan | null }> {
  const ctx = await context(admin, lead, opts)
  const team = lead.seat === 'member' || kind === 'digest' || opts.solo ? [] : await teamOf(admin, lead)
  if (!team.length) {
    const r = await executeRole(admin, lead, task, kind, { ...opts, ...ctx })
    return { ...r, plan: null }
  }

  const org = await buildOrgBrief(admin, lead, ctx.brand.name)
  const planned = await planTask(
    roleDef(lead, ctx.brand.name), ctx.brand,
    team.map((m) => ({ name: m.name, title: m.title, owns: ownsOf(m, ctx.brand.name) })),
    task, { brief: org.brief, colleagues: org.colleagues, playbook: ctx.state.playbook },
  )
  let usage = planned.usage
  const plan: Plan = { approach: planned.approach, reason: planned.reason, assignments: [] }

  if (planned.approach === 'solo') {
    const r = await executeRole(admin, lead, task, kind, { ...opts, ...ctx })
    return { deliverable: r.deliverable, runId: r.runId, usage: addUsage(usage, r.usage), plan }
  }

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
  const jobs = planned.assignments
    .map((a) => ({ a, member: team.find((m) => norm(m.name) === norm(a.to)) ?? team.find((m) => norm(a.to).includes(norm(m.name)) || norm(m.name).includes(norm(a.to))) }))
    .filter((x): x is { a: { to: string; brief: string }; member: RoleRow } => Boolean(x.member))
    .filter((x, i, arr) => arr.findIndex((y) => y.member.id === x.member.id) === i)
    .slice(0, 4)

  const results = await Promise.allSettled(jobs.map(({ a, member }) =>
    executeRole(admin, member, a.brief, 'task', { ...ctx, jobId: opts.jobId, briefedBy: `${lead.name} briefed you as part of a department task: "${task.slice(0, 300)}". Their brief to you: ${a.brief}` })))

  const contributions: string[] = []
  results.forEach((res, i) => {
    const { a, member } = jobs[i]
    if (res.status === 'fulfilled') {
      usage = addUsage(usage, res.value.usage)
      plan.assignments.push({ to: member.name, roleId: member.id, brief: a.brief, runId: res.value.runId, ok: true })
      const d = res.value.deliverable
      contributions.push([
        `### ${member.name} (${member.title}) on: ${a.brief}`,
        `${d.title ?? ''}: ${d.summary ?? ''}`,
        ...(d.sections ?? []).map((s) => `${s.heading}\n${s.body}`),
        (d.actions ?? []).length ? `Proposed pieces: ${(d.actions ?? []).map((x) => `${x.kind}: ${x.topic}`).join('; ')}` : '',
        (d.needs ?? []).length ? `Needs raised: ${(d.needs ?? []).map((x) => x.title).join('; ')}` : '',
      ].filter(Boolean).join('\n'))
    } else {
      plan.assignments.push({ to: member.name, roleId: member.id, brief: a.brief, ok: false })
      contributions.push(`### ${member.name} could not complete their part (${res.reason instanceof Error ? res.reason.message : String(res.reason)}). Cover it yourself or say it is outstanding.`)
    }
  })

  const r = await executeRole(admin, lead, task, kind, { ...opts, ...ctx, contributions: contributions.join('\n\n') })
  return { deliverable: r.deliverable, runId: r.runId, usage: addUsage(usage, r.usage), plan }
}

/** Sum of what a workspace's department has spent this calendar month. */
export async function spentThisMonth(admin: SupabaseClient, owner: string, brandId: string | null, dept: string): Promise<number> {
  const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0)
  const { data: roleRows } = await admin.from('roles').select('id').eq('owner', owner).eq('brand_id', brandId).eq('dept', dept)
  const ids = ((roleRows ?? []) as { id: string }[]).map((r) => r.id)
  if (!ids.length) return 0
  const { data } = await admin.from('role_runs').select('cost_pence').in('role_id', ids).gte('created_at', start.toISOString())
  return ((data ?? []) as { cost_pence: number }[]).reduce((s, r) => s + Number(r.cost_pence ?? 0), 0)
}

/** Friday: the lead reads the week and rewrites the department playbook. */
export async function retroDepartment(admin: SupabaseClient, lead: RoleRow, opts: { channel?: string | null } = {}): Promise<{ lessons: string[]; usage: Usage } | null> {
  if (!lead.dept || !lead.brand_id) return null
  const brand = await brandFor(admin, lead.brand_id)
  const state = await deptStateFor(admin, lead.owner, lead.brand_id, lead.dept)
  const since = new Date(Date.now() - 7 * 86400000).toISOString()

  const { data: roleRows } = await admin.from('roles').select('id, name').eq('owner', lead.owner).eq('brand_id', lead.brand_id).eq('dept', lead.dept)
  const names = new Map(((roleRows ?? []) as { id: string; name: string }[]).map((r) => [r.id, r.name]))
  const ids = [...names.keys()]
  const { data: runs } = await admin.from('role_runs').select('role_id, task, output, kind, created_at')
    .in('role_id', ids).gte('created_at', since).order('created_at')
  const week = (runs ?? []) as { role_id: string; task: string; output?: Deliverable; kind: string; created_at: string }[]
  if (!week.length) return null

  const { data: jobRows } = await admin.from('role_jobs').select('task, approval, run_id')
    .eq('owner', lead.owner).eq('brand_id', lead.brand_id).eq('dept', lead.dept).gte('created_at', since)
  const { data: itemRows } = await admin.from('role_items').select('kind, title, status').in('role_id', ids).gte('updated_at', since)

  const report = [
    'WORK DONE:',
    ...week.map((r) => `- ${names.get(r.role_id) ?? 'seat'} (${r.kind}): "${r.output?.title ?? 'Untitled'}". ${(r.output?.summary ?? '').slice(0, 400)}`),
    '',
    'FOUNDER DECISIONS ON THIS WEEK\'S DELIVERABLES:',
    ...((jobRows ?? []) as { task: string; approval: string }[]).filter((j) => j.approval === 'approved' || j.approval === 'declined').map((j) => `- ${j.approval.toUpperCase()}: ${j.task.slice(0, 160)}`),
    '',
    'REQUESTS AND EXPERIMENTS:',
    ...((itemRows ?? []) as { kind: string; title: string; status: string }[]).map((i) => `- ${i.kind} "${i.title}": ${i.status}`),
  ].join('\n')

  const org = await buildOrgBrief(admin, lead, brand.name)
  const r = await runRetro(roleDef(lead, brand.name), brand, report, state.playbook, { brief: org.brief, colleagues: org.colleagues })
  await admin.from('dept_state').upsert({
    owner: lead.owner, brand_id: lead.brand_id, dept: lead.dept,
    playbook: r.playbook, playbook_updated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }, { onConflict: 'owner,brand_id,dept' })
  // The retro is itself a run, so it is metered and sits on the desk.
  await admin.from('role_runs').insert({
    owner: lead.owner, role_id: lead.id, brand_id: lead.brand_id, kind: 'retro',
    task: 'Weekly learning: rewrite the department playbook.',
    output: { title: `${deptOf(lead.dept)?.name ?? 'Department'} playbook, week of ${new Date().toISOString().slice(0, 10)}`, summary: r.lessons.join(' '), sections: [{ heading: 'Lessons this week', body: r.lessons.map((l) => `- ${l}`).join('\n') }, { heading: 'Playbook', body: r.playbook }], actions: [], needs: [], experiments: [], handoffs: [], external: false },
    tokens_in: r.usage.input_tokens, tokens_out: r.usage.output_tokens, cost_pence: costPence(r.usage),
  })
  if (opts.channel) await sendMessage(opts.channel, `<b>${lead.name}</b> rewrote the ${deptOf(lead.dept)?.name ?? ''} playbook.\n${r.lessons.map((l) => `• ${l}`).join('\n')}`)
  return { lessons: r.lessons, usage: r.usage }
}

/* ---- The chief of staff ------------------------------------------------ */

/** The founder's single point of contact in a workspace, if hired. */
export async function chiefOf(admin: SupabaseClient, owner: string, brandId: string | null): Promise<RoleRow | null> {
  const { data } = await admin.from('roles').select('*')
    .eq('owner', owner).eq('brand_id', brandId).eq('key', 'chief').eq('enabled', true).limit(1)
  return ((data ?? [])[0] as RoleRow | undefined) ?? null
}

export const briefingTask = (text: string, deptName: string) =>
  `DAILY BRIEFING FROM THE FOUNDER, sent to every department lead at once:\n\n${text.trim()}\n\nYou are the ${deptName} lead. If nothing in this briefing concerns your department, say so in one line and stop: do not manufacture work. Otherwise: name what in it is yours, do it now where it can be done in this deliverable, hand anything that belongs to a colleague to them as a handoff, and say what you need from the founder. Short. Specific. Today.`

/** Route a founder's message through the chief of staff: one small model
    call decides which leads it concerns, files a queued job for each, records
    any decisions in the chief's run, and returns the chief's reply. The
    worker runs the jobs; when the last lands, the desk is written. */
export async function routeBriefing(
  admin: SupabaseClient,
  chief: RoleRow,
  briefing: { id: string; text: string; source: string },
  opts: { jobId?: string | null } = {},
): Promise<{ reply: string; assignments: { to: string; brief: string }[]; decisions: string[]; runId: string | null; jobs: number }> {
  const brand = await brandFor(admin, chief.brand_id)
  const org = await buildOrgBrief(admin, chief, brand.name)
  const { data: leadRows } = await admin.from('roles').select('*')
    .eq('owner', chief.owner).eq('brand_id', chief.brand_id).eq('seat', 'lead').eq('enabled', true).neq('id', chief.id)
  const leads = (leadRows ?? []) as RoleRow[]
  const r = await routeMessage(
    roleDef(chief, brand.name), brand,
    leads.map((l) => ({ name: l.name, title: `${deptOf(l.dept)?.name ?? ''} lead`, owns: ownsOf(l, brand.name) })),
    briefing.text, { brief: org.brief, colleagues: org.colleagues },
  )
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
  const filed: { to: string; brief: string }[] = []
  console.log(`route leads=${leads.map((l) => l.name).join('|')} assignments=${JSON.stringify(r.assignments).slice(0, 600)}`)
  for (const a of r.assignments) {
    const lead = leads.find((l) => norm(l.name) === norm(a.to)) ?? leads.find((l) => norm(a.to).includes(norm(l.name)) || norm(l.name).includes(norm(a.to)) || norm(deptOf(l.dept)?.name ?? '') === norm(a.to))
    if (!lead || filed.some((f) => f.to === lead.name)) continue
    await admin.from('role_jobs').insert({
      owner: chief.owner, brand_id: chief.brand_id, role_id: lead.id, dept: lead.dept ?? null, briefing_id: briefing.id,
      task: `${a.brief}\n\n(Routed to you by the Chief of staff from the founder's message: "${briefing.text.trim().slice(0, 600)}". Do what is yours now, hand over what is not, and say what you need from the founder. Short.)`,
      source: briefing.source === 'telegram' ? 'telegram' : 'desk', status: 'queued',
    })
    filed.push({ to: lead.name, brief: a.brief })
  }
  const output = {
    title: `Routed: ${briefing.text.trim().slice(0, 60)}${briefing.text.trim().length > 60 ? '…' : ''}`,
    summary: r.reply,
    sections: [
      { heading: 'Passed on', body: filed.length ? filed.map((f) => `- ${f.to}: ${f.brief}`).join('\n') : 'Nothing to route: noted for the record.' },
      ...(r.decisions.length ? [{ heading: 'Decisions recorded', body: r.decisions.map((d) => `- ${d}`).join('\n') }] : []),
    ],
    actions: [], needs: [], experiments: [], handoffs: [], external: false,
  }
  const { data: run } = await admin.from('role_runs').insert({
    owner: chief.owner, role_id: chief.id, brand_id: chief.brand_id, task: `ROUTE: ${briefing.text.trim().slice(0, 200)}`, output, kind: 'task',
    job_id: opts.jobId ?? null, tokens_in: r.usage.input_tokens, tokens_out: r.usage.output_tokens, cost_pence: costPence(r.usage),
  }).select('id').single()
  // Decisions the founder just made are settled for everyone: file them as
  // approved items on the chief's ledger so every org brief carries them.
  for (const d of r.decisions.slice(0, 5)) {
    await admin.from('role_items').insert({ owner: chief.owner, role_id: chief.id, brand_id: chief.brand_id, run_id: (run as { id?: string } | null)?.id ?? null, kind: 'decision', title: d.slice(0, 200), detail: `Decided by the founder in a briefing on ${new Date().toISOString().slice(0, 10)}.`, status: 'approved' })
  }
  return { reply: r.reply, assignments: filed, decisions: r.decisions, runId: (run as { id?: string } | null)?.id ?? null, jobs: filed.length }
}

/** When every lead has answered a briefing, the chief compresses the replies
    into one desk: now, next, parked, decisions. */
export async function deskBriefing(admin: SupabaseClient, chief: RoleRow, briefingId: string, opts: { jobId?: string | null; channel?: string | null } = {}): Promise<{ deliverable: Deliverable; runId: string | null; usage: Usage }> {
  const { data: b } = await admin.from('role_briefings').select('text, created_at').eq('id', briefingId).maybeSingle()
  const briefing = b as { text: string; created_at: string } | null
  const { data: jobRows } = await admin.from('role_jobs').select('role_id, status, run_id, error').eq('briefing_id', briefingId).neq('role_id', chief.id)
  const jobs = (jobRows ?? []) as { role_id: string; status: string; run_id: string | null; error: string | null }[]
  const { data: roleRows } = await admin.from('roles').select('id, name, dept').in('id', jobs.map((j) => j.role_id))
  const names = new Map(((roleRows ?? []) as { id: string; name: string; dept: string | null }[]).map((r) => [r.id, r]))
  const runIds = jobs.map((j) => j.run_id).filter(Boolean) as string[]
  const { data: runRows } = runIds.length ? await admin.from('role_runs').select('id, output').in('id', runIds) : { data: [] }
  const outputs = new Map(((runRows ?? []) as { id: string; output: Deliverable }[]).map((r) => [r.id, r.output]))
  const contributions = jobs.map((j) => {
    const who = names.get(j.role_id)
    const label = `### ${who?.name ?? 'A lead'} (${deptOf(who?.dept)?.name ?? ''})`
    if (j.status !== 'done' || !j.run_id) return `${label}\nDid not reply${j.error ? `: ${j.error}` : ''}.`
    const d = outputs.get(j.run_id)
    return [label, `${d?.title ?? ''}: ${d?.summary ?? ''}`, ...(d?.sections ?? []).map((s) => `${s.heading}\n${s.body}`), (d?.handoffs ?? []).length ? `Handoffs: ${(d?.handoffs ?? []).map((h) => `${h.to}: ${h.subject}`).join('; ')}` : ''].filter(Boolean).join('\n')
  }).join('\n\n')
  const r = await executeRole(admin, chief, `${DESK_TASK}\n\nTHE BRIEFING THEY ANSWERED:\n${briefing?.text ?? ''}`, 'task', { jobId: opts.jobId, solo: true, contributions })
  if (opts.channel) await sendMessage(opts.channel, formatDeliverable('Your desk', 'task', r.deliverable, { full: true }))
  return r
}

/* ---- Images ------------------------------------------------------------ */

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'image'

/** Queue the images a deliverable asked for as their own job, so a long
    render never holds the seat's run open. */
export async function queueImages(admin: SupabaseClient, role: RoleRow, runId: string | null, images: ImageRequest[] | undefined, briefingId: string | null): Promise<number> {
  const specs = (images ?? []).filter((i) => i?.subject && i?.surface).slice(0, 3)
  if (!specs.length) return 0
  const state = await deptStateFor(admin, role.owner, role.brand_id, role.dept)
  if (!state.tools.includes('higgsfield') || !hasHiggsfield()) return 0
  await admin.from('role_jobs').insert({
    owner: role.owner, brand_id: role.brand_id, role_id: role.id, dept: role.dept ?? null, briefing_id: null,
    task: `IMAGES: ${specs.map((i) => i.purpose || i.subject).join('; ').slice(0, 220)}`,
    source: 'desk', status: 'queued', plan: { images: specs, runId, briefingId },
  })
  return specs.length
}

/** Render the images in a queued IMAGES job, in parallel, into the review pile. */
export async function renderImages(admin: SupabaseClient, role: RoleRow, job: { id: string; plan?: { images?: ImageRequest[]; runId?: string | null } | null }, opts: { channel?: string | null } = {}): Promise<{ made: number; failed: string[] }> {
  const specs = job.plan?.images ?? []
  const lib = await loadLibrary(admin, role.brand_id)
  if (!lib) throw new Error('This workspace has no imagery library or master prompt yet.')
  const results = await Promise.allSettled(specs.map(async (spec, i) => {
    const prompt = composePrompt(lib, spec)
    const aspect = asAspect(surfaceRatio(lib, spec.surface), '4:5')
    const { url, requestId } = await generateImage(prompt, { aspect, resolution: '2K' })
    const { bytes, contentType } = await download(url)
    const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : contentType.includes('webp') ? 'webp' : 'png'
    const path = `${role.owner}/library/${role.brand_id}/${slug(spec.category ?? 'image')}-${slug(spec.subject ?? spec.purpose ?? '')}-${String(Date.now()).slice(-6)}${i}.${ext}`
    const { error } = await admin.storage.from('social-assets').upload(path, bytes, { contentType, upsert: true })
    if (error) throw new Error(`Upload failed: ${error.message}`)
    const { data: pub } = admin.storage.from('social-assets').getPublicUrl(path)
    await admin.from('image_assets').insert({
      owner: role.owner, brand_id: role.brand_id, dept: role.dept ?? null, role_id: role.id, run_id: job.plan?.runId ?? null, job_id: job.id,
      purpose: spec.purpose ?? '', category: [spec.category, spec.module].filter(Boolean).join('/'), surface: spec.surface ?? '',
      prompt, parts: promptParts(lib, spec), aspect_ratio: aspect, provider: 'higgsfield', request_id: requestId, storage_path: path, url: pub.publicUrl, status: 'pending',
      destination: destinationFor(spec.surface),
    })
    return pub.publicUrl
  }))
  const made = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)))
  if (opts.channel && made) await sendMessage(opts.channel, `<b>${role.name}</b> made ${made} image${made === 1 ? '' : 's'} for your review in the studio.`)
  return { made, failed }
}

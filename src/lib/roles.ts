import { supabase, isSupabaseConfigured, functionsBase } from './supabase'
import { filterByBrand, withBrandInsert } from './brandScope'
import { listAssets } from './assets'
import { listClients } from './studioOps'
import { listSubscribers } from './newsletter'
import { knowledgeDigest } from './knowledge'
import type { BrandProfile } from './brand'

/* ============================================================
   Roles: persona agents a workspace employs. Each role is a
   charter layered over the brand's voice and Knowledge; it works
   from a live snapshot of the workspace and returns a structured
   deliverable whose actions can be spawned straight into the
   studios. Deliverables are kept per role (its desk).
   ============================================================ */

export interface RoleSchedule { cadence?: 'off' | 'daily' | 'weekdays' | 'weekly'; task?: string }
export interface Role {
  id: string
  key: string
  name: string
  title: string
  charter: string
  instructions: string
  enabled: boolean
  schedule: RoleSchedule | null
  brand_id: string | null
  created_at: string
  updated_at: string
}

export interface RolePreset {
  key: string
  name: string
  title: string
  charter: string
  /** The remit: what this seat decides, and what it must hand over instead of
      deciding. This is what stops two roles quietly overruling each other. */
  owns: string
  defers: string
  /** One-click tasks that define the job. */
  playbook: { label: string; task: string }[]
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    key: 'cmo',
    name: 'CMO',
    title: 'Chief Marketing Officer',
    charter:
      'Owns the marketing calendar and the growth narrative. Thinks in campaigns and cadence, not one-off posts: what should this brand say this month, in what order, on which channel, and why. Ruthless about focus: fewer, better pieces that compound. Judges every idea against positioning and the audience it is meant to move.',
    owns: 'the marketing calendar, positioning and campaign priorities',
    defers: 'line edits and headlines (Editor-in-chief), the Instagram plan itself (Social strategist), voice rulings (Brand guardian)',
    playbook: [
      { label: 'Monthly content plan', task: 'Plan the next month of content for this workspace. Work from the real cadence and recent pieces in the snapshot: keep what is working, cut what is not, and fill the gaps. Give a week-by-week plan, and propose the specific pieces as actions.' },
      { label: 'Content audit', task: 'Audit the recent content in the snapshot as a CMO would: what themes repeat, what is missing against the positioning, where the cadence has slipped, and the three changes that would most improve results. Be specific about individual pieces by title.' },
      { label: 'Campaign concept', task: 'Propose one campaign concept for this brand: a single idea that can carry a journal article, a carousel series and a newsletter over two to three weeks. Give the narrative arc and propose each piece as an action.' },
    ],
  },
  {
    key: 'editor',
    name: 'Editor-in-chief',
    title: 'Editorial quality bar',
    charter:
      'Guards the standard of everything written. Cares about openings that earn the second sentence, specificity over abstraction, and the house style. Kind to the writer, merciless to the draft. Never rewrites into blandness: sharpens what is already there.',
    owns: 'editorial quality, headlines and the story slate',
    defers: 'what the month is about (CMO), how a story is cut for Instagram (Social strategist), the voice rules themselves (Brand guardian)',
    playbook: [
      { label: 'Review the latest piece', task: 'Review the most recent piece in the snapshot as editor-in-chief: what works, what fails, and the specific line-level fixes that would lift it. Quote the piece where you critique it.' },
      { label: 'Headline clinic', task: 'Take the recent titles in the snapshot and rework the weak ones: for each, say why the current headline underperforms and give two stronger alternatives in the house voice.' },
      { label: 'Next three stories', task: 'From the themes in the snapshot and the knowledge base, pitch the next three stories this brand should tell: for each, the angle, why now, and the opening line you would want. Propose each as an action.' },
    ],
  },
  {
    key: 'social',
    name: 'Social strategist',
    title: 'Instagram growth',
    charter:
      'Owns Instagram. Thinks in saves, shares and swipe-through, not likes. Knows the template families and picks the hook shape to fit the idea: question, number, reframe, save. Plans in series so the grid tells a story, and always ends a carousel with a reason to keep it.',
    owns: 'Instagram: formats, hooks, the posting plan and the grid',
    defers: 'the month\'s theme and priorities (CMO), the words once written (Editor-in-chief), voice rulings (Brand guardian)',
    playbook: [
      { label: 'Week of posts', task: 'Plan seven days of Instagram for this workspace: a mix of formats mapped to what each is meant to earn (saves, comments, swipes). For each day give the hook and format, and propose each post as an action.' },
      { label: 'Carousel concept', task: 'Design one strong carousel: the hook, the slide-by-slide arc, and the closing cue. Propose it as an action.' },
      { label: 'Grid review', task: 'Review the recent social pieces in the snapshot: which hooks repeat, which formats are missing, what the grid says as a whole, and the three changes to make next week.' },
    ],
  },
  {
    key: 'guardian',
    name: 'Brand guardian',
    title: 'Voice & consistency',
    charter:
      'Protects the voice. Knows the writing guidelines by heart, including the banned words and the signature phrases, and checks that every piece sounds unmistakably like this brand and no one else. Flags drift early, and explains the difference between on-voice and off-voice with examples.',
    owns: 'brand voice and consistency across everything published',
    defers: 'what to publish and when (CMO), story selection (Editor-in-chief), channel tactics (Social strategist)',
    playbook: [
      { label: 'Voice check', task: 'Check the recent pieces in the snapshot against the tone of voice and writing guidelines: quote anything off-voice, explain why it drifts, and rewrite each quoted line the way this brand would say it.' },
      { label: 'Guideline gaps', task: 'From what the recent content actually does, identify where the writing guidelines are silent or unclear, and propose the two or three rules worth adding: with example sentences for each.' },
    ],
  },
]

/* ---- Workspace snapshot: the facts a role reasons from ---- */
export interface WorkspaceFacts {
  summary: string
}

export async function workspaceFacts(): Promise<WorkspaceFacts> {
  const [assetsR, clientsR, subsR] = await Promise.allSettled([listAssets(), listClients(), listSubscribers()])
  const assets = assetsR.status === 'fulfilled' ? assetsR.value : []
  const clients = clientsR.status === 'fulfilled' ? clientsR.value : []
  const subs = subsR.status === 'fulfilled' ? subsR.value.length : 0
  const days = (iso?: string) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null)
  const byKind = (k: string) => assets.filter((a) => a.kind === k)
  const lastOf = (k: string) => days(byKind(k)[0]?.when)
  const lines: string[] = []
  lines.push(`Counts: ${byKind('social').length} social posts, ${byKind('journal').length} journal articles, ${byKind('newsletter').length} newsletters, ${byKind('proposal').length} proposals.`)
  const cad = [
    lastOf('social') !== null ? `last social ${lastOf('social')}d ago` : 'no social yet',
    lastOf('journal') !== null ? `last article ${lastOf('journal')}d ago` : 'no articles yet',
    lastOf('newsletter') !== null ? `last newsletter ${lastOf('newsletter')}d ago` : 'no newsletters yet',
  ]
  lines.push(`Cadence: ${cad.join('; ')}. Subscribers: ${subs}.`)
  if (clients.length) lines.push(`Client pipeline: ${clients.slice(0, 8).map((c) => `${c.name} (${c.stage})`).join(', ')}.`)
  const recent = assets.slice(0, 12).map((a) => `- [${a.kind}${a.status !== 'draft' ? ` · ${a.status}` : ' · draft'}] ${a.title} (${days(a.when)}d ago)`)
  if (recent.length) { lines.push('Recent pieces, newest first:'); lines.push(...recent) }
  return { summary: lines.join('\n') }
}

/* ---- The org: who else is at the table, and what they have decided ----
   Everything here is read through filterByBrand, so a role only ever sees
   colleagues and decisions from its own workspace. Two workspaces staffed by
   the same person never meet. */

export const ownsOf = (role: Pick<Role, 'key' | 'charter'>): string =>
  ROLE_PRESETS.find((p) => p.key === role.key)?.owns ?? (role.charter.split('.')[0] ?? '').slice(0, 120)
export const defersOf = (role: Pick<Role, 'key'>): string =>
  ROLE_PRESETS.find((p) => p.key === role.key)?.defers ?? ''

export interface OrgBrief { brief: string; colleagues: { name: string; title: string; owns?: string }[] }

const agoDays = (iso?: string | null) => (iso ? `${Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)}d ago` : '')
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

export async function orgBrief(role: Role, roles: Role[]): Promise<OrgBrief> {
  const others = roles.filter((r) => r.id !== role.id)
  if (!supabase || !others.length) return { brief: '', colleagues: [] }
  const byId = new Map(roles.map((r) => [r.id, r]))
  const lines: string[] = ['WHERE YOUR COLLEAGUES STAND (their most recent deliverable, treat as live and in force):']

  for (const other of others.slice(0, 8)) {
    const { data } = await supabase.from('role_runs').select('output, kind, created_at')
      .eq('role_id', other.id).order('created_at', { ascending: false }).limit(1)
    const run = (data ?? [])[0] as { output?: RoleDeliverable; kind?: string; created_at?: string } | undefined
    if (!run?.output) { lines.push(`- ${other.name} (${other.title}): no deliverable yet.`); continue }
    lines.push(`- ${other.name} (${other.title}), ${agoDays(run.created_at)}${run.kind === 'digest' ? ', weekly digest' : ''}: "${run.output.title}" — ${cut(run.output.summary ?? '', 400)}`)
  }

  const { data: settled } = await filterByBrand(supabase.from('role_items').select('role_id, kind, title, detail, status'))
    .in('status', ['approved', 'declined']).order('updated_at', { ascending: false }).limit(10)
  const dec = (settled ?? []) as { role_id: string; kind: string; title: string; detail: string; status: string }[]
  if (dec.length) {
    lines.push('', 'CONTROLLER DECISIONS (already settled: work with these, do not reopen them):')
    for (const d of dec) lines.push(`- ${d.status === 'approved' ? 'APPROVED' : 'DECLINED'} ${d.kind} from ${byId.get(d.role_id)?.name ?? 'a colleague'}: ${d.title}. ${cut(d.detail, 200)}`)
  }

  const { data: openItems } = await filterByBrand(supabase.from('role_items').select('role_id, kind, title'))
    .eq('status', 'open').order('created_at', { ascending: false }).limit(10)
  const op = ((openItems ?? []) as { role_id: string; kind: string; title: string }[]).filter((i) => i.role_id !== role.id)
  if (op.length) {
    lines.push('', "ALREADY ON THE CONTROLLER'S DESK (do not raise these again as your own):")
    for (const i of op) lines.push(`- ${i.kind} from ${byId.get(i.role_id)?.name ?? 'a colleague'}: ${i.title}`)
  }

  const inbox = await listNotes(role.id, 'in')
  if (inbox.length) {
    lines.push('', 'YOUR INBOX (handoffs written to you: address each one in this deliverable):')
    for (const n of inbox.filter((x) => x.status === 'open').slice(0, 6)) {
      lines.push(`- From ${byId.get(n.from_role_id)?.name ?? 'a colleague'}, ${agoDays(n.created_at)} — ${n.subject}: ${cut(n.body, 500)}`)
    }
  }
  const sent = await listNotes(role.id, 'out')
  if (sent.length) {
    lines.push('', 'HANDOFFS YOU HAVE ALREADY SENT (do not send the same one twice):')
    for (const n of sent.slice(0, 5)) lines.push(`- To ${n.to_role_id ? byId.get(n.to_role_id)?.name ?? 'a colleague' : n.to_name || 'an unfilled seat'}, ${agoDays(n.created_at)}, ${n.status}: ${n.subject}`)
  }

  return {
    brief: lines.join('\n'),
    colleagues: others.map((r) => ({ name: r.name, title: r.title, owns: ownsOf(r) })),
  }
}

/* ---- Handoffs between roles ---- */
export interface RoleNote {
  id: string; from_role_id: string; to_role_id: string | null; to_name: string
  subject: string; body: string; status: 'open' | 'acknowledged'; created_at: string
}

export async function listNotes(roleId: string, dir: 'in' | 'out'): Promise<RoleNote[]> {
  if (!supabase) return []
  const col = dir === 'in' ? 'to_role_id' : 'from_role_id'
  const { data } = await supabase.from('role_notes').select('id, from_role_id, to_role_id, to_name, subject, body, status, created_at')
    .eq(col, roleId).order('created_at', { ascending: false }).limit(20)
  return (data ?? []) as RoleNote[]
}

/** Open handoffs across the whole workspace, for the org page. */
export async function listOpenNotes(): Promise<RoleNote[]> {
  if (!supabase) return []
  const { data } = await filterByBrand(supabase.from('role_notes')
    .select('id, from_role_id, to_role_id, to_name, subject, body, status, created_at'))
    .eq('status', 'open').order('created_at', { ascending: false }).limit(40)
  return (data ?? []) as RoleNote[]
}

export async function ackNote(id: string): Promise<void> {
  if (!supabase) return
  await supabase.from('role_notes').update({ status: 'acknowledged', updated_at: new Date().toISOString() } as never).eq('id', id)
}

async function fileHandoffs(role: Role, roles: Role[], runId: string | null, handoffs: RoleHandoff[] | undefined): Promise<void> {
  if (!supabase || !handoffs?.length) return
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
  for (const h of handoffs.slice(0, 3)) {
    if (!h?.subject?.trim()) continue
    const target = roles.find((r) => norm(r.name) === norm(h.to ?? '')) ??
      roles.find((r) => norm(h.to ?? '').includes(norm(r.name)) || norm(r.name).includes(norm(h.to ?? '')))
    if (target?.id === role.id) continue
    await supabase.from('role_notes').insert(withBrandInsert({
      from_role_id: role.id, to_role_id: target?.id ?? null, to_name: h.to ?? '',
      run_id: runId, subject: h.subject.trim(), body: (h.body ?? '').trim(),
    }) as never)
  }
}

/* ---- CRUD ---- */
export async function listRoles(): Promise<Role[]> {
  if (!supabase) return []
  const q = supabase.from('roles').select('*').order('created_at', { ascending: true })
  const { data, error } = await filterByBrand(q)
  if (error) return []
  return (data ?? []) as Role[]
}

export async function hireRole(preset: RolePreset | { key: 'custom'; name: string; title: string; charter: string }): Promise<Role> {
  if (!supabase) throw new Error('Not connected')
  const payload = withBrandInsert({ key: preset.key, name: preset.name, title: preset.title, charter: preset.charter })
  // A role must belong to exactly one brand world. Without one it would read
  // across every workspace, so refuse rather than hire something unscoped.
  if (!(payload as { brand_id?: string }).brand_id) throw new Error('Pick a workspace before hiring a role.')
  const { data, error } = await supabase.from('roles')
    .insert(payload as never)
    .select('*').single()
  if (error) throw error
  return data as Role
}

export async function updateRole(id: string, patch: Partial<Pick<Role, 'name' | 'title' | 'charter' | 'instructions' | 'enabled' | 'schedule'>>): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('roles').update({ ...patch, updated_at: new Date().toISOString() } as never).eq('id', id)
  if (error) throw error
}

export async function retireRole(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('roles').delete().eq('id', id)
  if (error) throw error
}

/* ---- Runs ---- */
export interface RoleAction {
  kind: 'carousel' | 'portrait' | 'story' | 'journal' | 'newsletter'
  topic: string
  note?: string
}
export interface RoleLedgerDraft { title: string; detail: string }
export interface RoleHandoff { to: string; subject: string; body: string }
export interface RoleDeliverable {
  title: string
  summary: string
  sections: { heading: string; body: string }[]
  actions: RoleAction[]
  needs?: RoleLedgerDraft[]
  experiments?: RoleLedgerDraft[]
  handoffs?: RoleHandoff[]
}
export interface RoleRun { id: string; task: string; kind?: string; output: RoleDeliverable; created_at: string }

export async function listRuns(roleId: string): Promise<RoleRun[]> {
  if (!supabase) return []
  const { data } = await supabase.from('role_runs').select('id, task, kind, output, created_at')
    .eq('role_id', roleId).order('created_at', { ascending: false }).limit(20)
  return (data ?? []) as RoleRun[]
}

export async function runRole(role: Role, task: string, brand: BrandProfile | null | undefined): Promise<{ run?: RoleRun; error?: string }> {
  if (!(isSupabaseConfigured && supabase && functionsBase)) return { error: 'Roles need the connected studio (not available in local mode).' }
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return { error: 'Sign in first' }
  const facts = await workspaceFacts()
  const roster = await listRoles()
  const org = await orgBrief(role, roster)
  try {
    const res = await fetch(`${functionsBase}/role-agent`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        role: { name: role.name, title: role.title, charter: role.charter, instructions: role.instructions, owns: ownsOf(role), defers: defersOf(role) },
        task,
        facts: facts.summary,
        org,
        brand: brand ? {
          name: brand.name, tagline: brand.tagline ?? undefined,
          voice: brand.tone_of_voice ?? undefined, guidelines: brand.writing_guidelines ?? undefined,
          knowledge: knowledgeDigest(brand.knowledge) || undefined,
        } : undefined,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { error: data?.error ? String(data.error) : `Role ${res.status}` }
    const output = data.deliverable as RoleDeliverable
    const { data: saved, error } = await supabase.from('role_runs')
      .insert(withBrandInsert({ role_id: role.id, task, output }) as never).select('id, task, output, created_at').single()
    if (error) return { run: { id: 'unsaved', task, output, created_at: new Date().toISOString() } }
    const runId = (saved as RoleRun).id
    await fileLedger(role.id, runId, output).catch(() => {})
    // Notes to colleagues are filed, and whatever this role was briefed on is
    // now answered: its inbox closes.
    await fileHandoffs(role, roster, runId, output.handoffs).catch(() => {})
    await supabase.from('role_notes').update({ status: 'acknowledged', updated_at: new Date().toISOString() } as never)
      .eq('to_role_id', role.id).eq('status', 'open')
    return { run: saved as RoleRun }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

/* ---- Ledger (needs + experiments the role raises) ---- */
export interface RoleItem { id: string; kind: 'need' | 'experiment'; title: string; detail: string; status: 'open' | 'approved' | 'declined' | 'done'; created_at: string }

export async function listItems(roleId: string): Promise<RoleItem[]> {
  if (!supabase) return []
  const { data } = await supabase.from('role_items').select('id, kind, title, detail, status, created_at')
    .eq('role_id', roleId).order('created_at', { ascending: false }).limit(40)
  return (data ?? []) as RoleItem[]
}

export async function setItemStatus(id: string, status: RoleItem['status']): Promise<void> {
  if (!supabase) return
  await supabase.from('role_items').update({ status, updated_at: new Date().toISOString() } as never).eq('id', id)
}

async function fileLedger(roleId: string, runId: string | null, deliverable: RoleDeliverable): Promise<void> {
  if (!supabase) return
  const groups: { kind: 'need' | 'experiment'; items?: RoleLedgerDraft[] }[] = [
    { kind: 'need', items: deliverable.needs }, { kind: 'experiment', items: deliverable.experiments },
  ]
  for (const g of groups) for (const item of (g.items ?? []).slice(0, 3)) {
    const { data: existing } = await supabase.from('role_items').select('id')
      .eq('role_id', roleId).eq('kind', g.kind).eq('title', item.title).limit(1)
    if (!existing?.length) await supabase.from('role_items')
      .insert(withBrandInsert({ role_id: roleId, run_id: runId, kind: g.kind, title: item.title, detail: item.detail }) as never)
  }
}

export function presetFor(role: Role): RolePreset | undefined {
  return ROLE_PRESETS.find((p) => p.key === role.key)
}

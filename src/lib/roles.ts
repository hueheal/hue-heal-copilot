import { supabase, isSupabaseConfigured, functionsBase } from './supabase'
import { filterByBrand, withBrandInsert } from './brandScope'
import { seatsIn, seatFor, type OrgRole } from './org'

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
  dept: string | null
  seat: 'lead' | 'member'
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

const presetOf = (r: OrgRole): RolePreset => ({ key: r.key, name: r.name, title: r.title, charter: r.charter, owns: r.owns, defers: r.defers, playbook: r.plays })

/* ---- The org: who else is at the table, and what they have decided ----
   Everything here is read through filterByBrand, so a role only ever sees
   colleagues and decisions from its own workspace. Two workspaces staffed by
   the same person never meet. */

export const ownsOf = (role: Pick<Role, 'key' | 'charter' | 'dept'>, brandName?: string | null): string =>
  seatFor(role, brandName)?.owns || (role.charter.split('.')[0] ?? '').slice(0, 120)
export const defersOf = (role: Pick<Role, 'key' | 'dept'>, brandName?: string | null): string =>
  seatFor(role, brandName)?.defers ?? ''

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

/* ---- CRUD ---- */
export async function listRoles(): Promise<Role[]> {
  if (!supabase) return []
  const q = supabase.from('roles').select('*').order('created_at', { ascending: true })
  const { data, error } = await filterByBrand(q)
  if (error) return []
  return (data ?? []) as Role[]
}

export async function hireRole(preset: RolePreset | { key: 'custom'; name: string; title: string; charter: string }, extra: { dept?: string; seat?: 'lead' | 'member' } = {}): Promise<Role> {
  if (!supabase) throw new Error('Not connected')
  const payload = withBrandInsert({ key: preset.key, name: preset.name, title: preset.title, charter: preset.charter, dept: extra.dept ?? null, seat: extra.seat ?? 'lead' })
  // A role must belong to exactly one brand world. Without one it would read
  // across every workspace, so refuse rather than hire something unscoped.
  if (!(payload as { brand_id?: string }).brand_id) throw new Error('Pick a workspace before hiring.')
  const { data, error } = await supabase.from('roles')
    .insert(payload as never)
    .select('*').single()
  if (error) throw error
  return data as Role
}

/** Hire a whole department for the current brand: its lead and its members,
    from org/roles. Seats already filled are left alone. Returns the lead. */
export async function hireDepartment(dept: string, brandName?: string | null): Promise<Role> {
  const existing = (await listRoles()).filter((r) => r.dept === dept)
  let lead = existing.find((r) => r.seat === 'lead')
  for (const seat of seatsIn(dept, brandName)) {
    if (existing.some((r) => r.key === seat.key)) continue
    const hired = await hireRole(presetOf(seat), { dept, seat: seat.seat })
    if (seat.seat === 'lead') lead = hired
  }
  if (!lead) throw new Error('This department has no lead defined.')
  return lead
}

/** Retire a whole department: the lead and everyone in it. */
export async function retireDepartment(dept: string): Promise<void> {
  if (!supabase) return
  const roles = (await listRoles()).filter((r) => r.dept === dept)
  for (const r of roles) await retireRole(r.id)
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
  external?: boolean
}
export interface RoleRun { id: string; role_id?: string; task: string; kind?: string; output: RoleDeliverable; created_at: string }

/** Runs across several seats (a department's desk), newest first. */
export async function listRunsFor(roleIds: string[]): Promise<RoleRun[]> {
  if (!supabase || !roleIds.length) return []
  const { data } = await supabase.from('role_runs').select('id, role_id, task, kind, output, created_at')
    .in('role_id', roleIds).order('created_at', { ascending: false }).limit(40)
  return (data ?? []) as RoleRun[]
}

export async function listRuns(roleId: string): Promise<RoleRun[]> {
  if (!supabase) return []
  const { data } = await supabase.from('role_runs').select('id, task, kind, output, created_at')
    .eq('role_id', roleId).order('created_at', { ascending: false }).limit(20)
  return (data ?? []) as RoleRun[]
}

/* ---- Jobs: work handed to a role ----
   Assigning returns as soon as the job is filed. The run happens on the
   server, so it survives a reload, a closed tab or a walk to the kettle; the
   room watches the row and the deliverable appears when it lands. */

export interface JobPlan { approach: 'solo' | 'team'; reason: string; assignments: { to: string; roleId?: string; brief: string; runId?: string | null; ok?: boolean }[] }
export interface RoleJob {
  id: string
  role_id: string
  dept: string | null
  task: string
  source: 'studio' | 'telegram' | 'schedule'
  status: 'queued' | 'running' | 'done' | 'failed'
  approval: 'none' | 'pending' | 'approved' | 'declined'
  plan: JobPlan | null
  cost_pence: number
  run_id: string | null
  error: string | null
  reviewed_at: string | null
  created_at: string
  finished_at: string | null
}

const JOB_COLS = 'id, role_id, dept, task, source, status, approval, plan, cost_pence, run_id, error, reviewed_at, created_at, finished_at'

/** Every job in a department, newest first. */
export async function listDeptJobs(dept: string): Promise<RoleJob[]> {
  if (!supabase) return []
  const { data } = await filterByBrand(supabase.from('role_jobs').select(JOB_COLS))
    .eq('dept', dept).order('created_at', { ascending: false }).limit(40)
  return (data ?? []) as RoleJob[]
}

/** Everything across the workspace the founder should see: in flight,
    waiting for approval, or done and unread. */
export async function listWorkspaceJobs(): Promise<RoleJob[]> {
  if (!supabase) return []
  const { data } = await filterByBrand(supabase.from('role_jobs').select(JOB_COLS))
    .order('created_at', { ascending: false }).limit(120)
  return (data ?? []) as RoleJob[]
}

export async function decideJob(jobId: string, approval: 'approved' | 'declined'): Promise<void> {
  if (!supabase) return
  await supabase.from('role_jobs').update({ approval, decided_at: new Date().toISOString(), reviewed_at: new Date().toISOString() } as never).eq('id', jobId)
}

export async function listJobs(roleId: string): Promise<RoleJob[]> {
  if (!supabase) return []
  const { data } = await supabase.from('role_jobs').select(JOB_COLS)
    .eq('role_id', roleId).order('created_at', { ascending: false }).limit(20)
  return (data ?? []) as RoleJob[]
}

/** Jobs in flight across the workspace, for the org page. */
export async function listActiveJobs(): Promise<RoleJob[]> {
  if (!supabase) return []
  const { data } = await filterByBrand(supabase.from('role_jobs').select(JOB_COLS))
    .in('status', ['queued', 'running']).order('created_at', { ascending: false }).limit(40)
  return (data ?? []) as RoleJob[]
}

export async function assignJob(role: Role, task: string): Promise<{ job?: RoleJob; error?: string }> {
  if (!(isSupabaseConfigured && supabase && functionsBase)) return { error: 'Roles need the connected studio (not available in local mode).' }
  const { data, error } = await supabase.from('role_jobs')
    .insert(withBrandInsert({ role_id: role.id, dept: role.dept, task: task.trim(), source: 'studio' }) as never)
    .select(JOB_COLS).single()
  if (error) return { error: error.message }
  const job = data as RoleJob

  // Kick the worker off now rather than waiting for the minute sweep. We do
  // not await the run: the job row is the receipt, and the sweep is the
  // backstop if this request never lands.
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (token) {
    void fetch(`${functionsBase}/role-worker`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ jobId: job.id }),
      keepalive: true,
    }).catch(() => {})
  }
  return { job }
}

/** Ask a department to run its weekly learning now rather than waiting for Friday. */
export async function learnNow(lead: Role): Promise<{ lessons?: string[]; note?: string; error?: string }> {
  if (!(isSupabaseConfigured && supabase && functionsBase)) return { error: 'Needs the connected studio.' }
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return { error: 'Sign in first' }
  const res = await fetch(`${functionsBase}/role-worker`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ retro: lead.id }),
  })
  const data = await res.json().catch(() => ({})) as { lessons?: string[]; note?: string; error?: string }
  if (!res.ok) return { error: data.error ?? `Worker ${res.status}` }
  return data
}

export async function markReviewed(jobId: string): Promise<void> {
  if (!supabase) return
  await supabase.from('role_jobs').update({ reviewed_at: new Date().toISOString() } as never).eq('id', jobId)
}

/* ---- Department state: playbook, budget, tools ---- */
export interface DeptState { dept: string; playbook: string; playbook_updated_at: string | null; budget_pence: number; tools: string[] }

export async function getDeptState(dept: string): Promise<DeptState> {
  const empty: DeptState = { dept, playbook: '', playbook_updated_at: null, budget_pence: 5000, tools: [] }
  if (!supabase) return empty
  const { data } = await filterByBrand(supabase.from('dept_state').select('dept, playbook, playbook_updated_at, budget_pence, tools')).eq('dept', dept).maybeSingle()
  return (data as DeptState | null) ?? empty
}

export async function saveDeptState(dept: string, patch: Partial<Pick<DeptState, 'playbook' | 'budget_pence' | 'tools'>>): Promise<void> {
  if (!supabase) return
  const row = withBrandInsert({ dept, ...patch, updated_at: new Date().toISOString() })
  const { error } = await supabase.from('dept_state').upsert(row as never, { onConflict: 'owner,brand_id,dept' })
  if (error) throw error
}

/** What a department has spent this calendar month, in pence (metered model use). */
export async function deptSpend(roleIds: string[]): Promise<number> {
  if (!supabase || !roleIds.length) return 0
  const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0)
  const { data } = await supabase.from('role_runs').select('cost_pence').in('role_id', roleIds).gte('created_at', start.toISOString())
  return ((data ?? []) as { cost_pence: number }[]).reduce((n, r) => n + Number(r.cost_pence ?? 0), 0)
}

/** Open requests across the department, so the room can show them under the lead. */
export async function listDeptItems(roleIds: string[]): Promise<RoleItem[]> {
  if (!supabase || !roleIds.length) return []
  const { data } = await supabase.from('role_items').select('id, role_id, kind, title, detail, status, created_at')
    .in('role_id', roleIds).order('created_at', { ascending: false }).limit(40)
  return (data ?? []) as RoleItem[]
}

/* ---- Ledger (needs + experiments the role raises) ---- */
export interface RoleItem { id: string; role_id?: string; kind: 'need' | 'experiment'; title: string; detail: string; status: 'open' | 'approved' | 'declined' | 'done'; created_at: string }

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

export function presetFor(role: Role, brandName?: string | null): RolePreset | undefined {
  const seat = seatFor(role, brandName)
  return seat ? presetOf(seat) : undefined
}

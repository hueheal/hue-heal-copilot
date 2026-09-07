// ============================================================================
// The org brief: what a role needs to know about the rest of its org before it
// decides anything. Colleagues and what they own, their latest deliverable,
// the decisions the controller has already made (approved / declined items),
// and the role's own inbox of handoffs.
//
// Every query here is scoped to (owner, brand_id). A role never sees a row
// belonging to another brand world, so the CMO of one workspace cannot be
// influenced by the CMO of another.
// ============================================================================
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ownsOf as seatOwns, deptOf } from './orgShape.ts'

export interface Colleague { name: string; title: string; owns?: string }

interface RoleRow { id: string; name: string; title: string; charter: string; enabled: boolean; key: string; dept?: string | null; seat?: string | null }

const ago = (iso?: string | null) => (iso ? `${Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)}d ago` : '')
const trim = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

/** What a seat owns, from org/roles; custom seats fall back to their charter. */
export function ownsOf(role: { key: string; dept?: string | null; charter: string }, brandName?: string | null): string {
  return seatOwns(role, brandName)
}

export async function buildOrgBrief(
  admin: SupabaseClient,
  role: { id: string; owner: string; brand_id: string | null; name: string; dept?: string | null },
  brandName?: string | null,
): Promise<{ brief: string; colleagues: Colleague[] }> {
  const scope = <T,>(q: T): T => {
    let x = (q as { eq: (a: string, b: unknown) => unknown }).eq('owner', role.owner)
    // A role with no brand world reads nothing cross-brand: it simply has no colleagues.
    x = (x as { eq: (a: string, b: unknown) => unknown }).eq('brand_id', role.brand_id)
    return x as T
  }

  const { data: roleRows } = await scope(admin.from('roles').select('id, name, title, charter, enabled, key, dept, seat'))
  const all = (roleRows ?? []) as RoleRow[]
  const others = all.filter((r) => r.id !== role.id)
  const deptLabel = (r: RoleRow) => { const d = deptOf(r.dept); return d ? `${d.name}${r.seat === 'member' ? '' : ', lead'}` : '' }
  const colleagues: Colleague[] = others.map((r) => ({ name: r.name, title: [r.title, deptLabel(r)].filter(Boolean).join(' · '), owns: ownsOf(r, brandName) }))
  if (!others.length) return { brief: '', colleagues: [] }

  const byId = new Map(all.map((r) => [r.id, r]))
  const lines: string[] = []

  /* Latest deliverable from each colleague: the live state of their division. */
  const latest: string[] = []
  for (const other of others.slice(0, 8)) {
    const { data } = await admin.from('role_runs').select('output, kind, created_at')
      .eq('owner', role.owner).eq('role_id', other.id).order('created_at', { ascending: false }).limit(1)
    const run = (data ?? [])[0] as { output?: { title?: string; summary?: string }; kind?: string; created_at?: string } | undefined
    if (!run?.output) { latest.push(`- ${other.name} (${other.title}): no deliverable yet.`); continue }
    latest.push(`- ${other.name} (${other.title}), ${ago(run.created_at)}${run.kind === 'digest' ? ', weekly digest' : ''}: "${run.output.title ?? 'Untitled'}" — ${trim(run.output.summary ?? '', 400)}`)
  }
  lines.push('WHERE YOUR COLLEAGUES STAND (their most recent deliverable, treat as live and in force):')
  lines.push(...latest)

  /* Controller decisions across the org: approved work is settled. */
  const { data: decided } = await scope(admin.from('role_items').select('role_id, kind, title, detail, status'))
    .in('status', ['approved', 'declined']).order('updated_at', { ascending: false }).limit(10)
  const dec = (decided ?? []) as { role_id: string; kind: string; title: string; detail: string; status: string }[]
  if (dec.length) {
    lines.push('', 'CONTROLLER DECISIONS (already settled: work with these, do not reopen them):')
    for (const d of dec) lines.push(`- ${d.status === 'approved' ? 'APPROVED' : 'DECLINED'} ${d.kind} from ${byId.get(d.role_id)?.name ?? 'a colleague'}: ${d.title}. ${trim(d.detail, 200)}`)
  }

  /* Founder decisions on whole deliverables. */
  const { data: judged } = await scope(admin.from('role_jobs').select('role_id, task, approval'))
    .in('approval', ['approved', 'declined']).order('decided_at', { ascending: false }).limit(8)
  const jj = (judged ?? []) as { role_id: string; task: string; approval: string }[]
  if (jj.length) {
    lines.push('', 'DELIVERABLES THE FOUNDER HAS RULED ON (approved means go; declined means do not resurrect it):')
    for (const j of jj) lines.push(`- ${j.approval.toUpperCase()}, from ${byId.get(j.role_id)?.name ?? 'a colleague'}: ${trim(j.task, 160)}`)
  }

  /* Open requests elsewhere, so two roles don't ask for the same thing. */
  const { data: openItems } = await scope(admin.from('role_items').select('role_id, kind, title'))
    .eq('status', 'open').order('created_at', { ascending: false }).limit(10)
  const op = ((openItems ?? []) as { role_id: string; kind: string; title: string }[]).filter((i) => i.role_id !== role.id)
  if (op.length) {
    lines.push('', 'ALREADY ON THE CONTROLLER\'S DESK (do not raise these again as your own):')
    for (const i of op) lines.push(`- ${i.kind} from ${byId.get(i.role_id)?.name ?? 'a colleague'}: ${i.title}`)
  }

  /* The role's own inbox. */
  const { data: notes } = await admin.from('role_notes').select('id, from_role_id, subject, body, created_at')
    .eq('owner', role.owner).eq('to_role_id', role.id).eq('status', 'open').order('created_at', { ascending: false }).limit(6)
  const inbox = (notes ?? []) as { from_role_id: string; subject: string; body: string; created_at: string }[]
  if (inbox.length) {
    lines.push('', 'YOUR INBOX (handoffs written to you: address each one in this deliverable):')
    for (const n of inbox) lines.push(`- From ${byId.get(n.from_role_id)?.name ?? 'a colleague'}, ${ago(n.created_at)} — ${n.subject}: ${trim(n.body, 500)}`)
  }

  /* What this role has already asked of others, so it doesn't repeat itself. */
  const { data: sent } = await admin.from('role_notes').select('to_role_id, subject, status, created_at')
    .eq('owner', role.owner).eq('from_role_id', role.id).order('created_at', { ascending: false }).limit(5)
  const outbox = (sent ?? []) as { to_role_id: string | null; subject: string; status: string; created_at: string }[]
  if (outbox.length) {
    lines.push('', 'HANDOFFS YOU HAVE ALREADY SENT (do not send the same one twice):')
    for (const n of outbox) lines.push(`- To ${n.to_role_id ? byId.get(n.to_role_id)?.name ?? 'a colleague' : 'an unfilled seat'}, ${ago(n.created_at)}, ${n.status}: ${n.subject}`)
  }

  return { brief: lines.join('\n'), colleagues }
}

/** File the handoffs a deliverable produced, resolving the addressee by name
    within the same workspace. Unmatched names are still recorded so nothing
    the role decided is silently dropped. */
export async function fileHandoffs(
  admin: SupabaseClient,
  role: { id: string; owner: string; brand_id: string | null },
  runId: string | null,
  handoffs: { to?: string; subject?: string; body?: string }[] | undefined,
): Promise<void> {
  if (!handoffs?.length) return
  const { data: roleRows } = await admin.from('roles').select('id, name')
    .eq('owner', role.owner).eq('brand_id', role.brand_id)
  const rows = (roleRows ?? []) as { id: string; name: string }[]
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
  for (const h of handoffs.slice(0, 3)) {
    if (!h?.subject?.trim()) continue
    const target = rows.find((r) => norm(r.name) === norm(h.to ?? '')) ??
      rows.find((r) => norm(h.to ?? '').includes(norm(r.name)) || norm(r.name).includes(norm(h.to ?? '')))
    if (target?.id === role.id) continue // a role does not write to itself
    await admin.from('role_notes').insert({
      owner: role.owner, brand_id: role.brand_id, from_role_id: role.id,
      to_role_id: target?.id ?? null, to_name: h.to ?? '', run_id: runId,
      subject: h.subject.trim(), body: (h.body ?? '').trim(),
    })
  }
}

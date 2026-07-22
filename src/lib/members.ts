import { supabase } from './supabase'
import type { Database } from './database.types'

export type AppMember = Database['public']['Tables']['app_members']['Row']

export interface Membership {
  approved: boolean
  role: 'admin' | 'member' | null
  /** False when the members table doesn't exist yet (migration not run) — the
     gate is treated as inactive so we never lock people out before rollout. */
  gateActive: boolean
}

/** True when a Supabase error means the app_members table isn't there yet. */
function isMissingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  const code = err.code ?? ''
  const msg = (err.message ?? '').toLowerCase()
  return code === '42P01' || code === 'PGRST205' || msg.includes('does not exist') || msg.includes('could not find the table')
}

/** Check whether the signed-in user is an approved member. Fails OPEN only when
    the table is absent (pre-migration); otherwise a non-member is "pending". */
export async function checkMembership(email: string | null): Promise<Membership> {
  if (!supabase || !email) return { approved: true, role: null, gateActive: false }
  const { data, error } = await supabase
    .from('app_members')
    .select('role, status')
    .ilike('email', email)
    .maybeSingle()
  if (error) {
    if (isMissingTable(error)) return { approved: true, role: null, gateActive: false }
    // RLS filters non-members to zero rows without erroring; a real error here
    // (network etc.) shouldn't hard-lock an already-authenticated session.
    return { approved: true, role: null, gateActive: false }
  }
  if (!data) return { approved: false, role: null, gateActive: true } // signed in, not on the list → pending
  return { approved: data.status === 'approved', role: (data.role as 'admin' | 'member') ?? 'member', gateActive: true }
}

/* ---- Team management (admin-gated by RLS) ---- */
export async function listMembers(): Promise<AppMember[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('app_members').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function addMember(email: string, role: 'admin' | 'member' = 'member'): Promise<void> {
  if (!supabase) return
  const clean = email.trim().toLowerCase()
  if (!/.+@.+\..+/.test(clean)) throw new Error('Enter a valid email')
  const { error } = await supabase.from('app_members').insert({ email: clean, role, status: 'approved' })
  if (error) throw error
}

export async function setMemberRole(id: string, role: 'admin' | 'member'): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('app_members').update({ role }).eq('id', id)
  if (error) throw error
}

export async function removeMember(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('app_members').delete().eq('id', id)
  if (error) throw error
}

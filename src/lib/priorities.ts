import { supabase } from './supabase'
import { filterByBrand, withBrandInsert } from './brandScope'

/* ============================================================
   The founder's priorities: one ordered list per workspace.
   Shown on Home and Team; read into every seat's run.
   ============================================================ */

export interface Priority {
  id: string; position: number; title: string; detail: string; dept: string | null
  status: 'active' | 'done' | 'parked'; note: string | null; due: string | null; created_at: string; decided_at: string | null
}
const COLS = 'id, position, title, detail, dept, status, note, due, created_at, decided_at'

export async function listPriorities(): Promise<Priority[]> {
  if (!supabase) return []
  const { data } = await filterByBrand(supabase.from('priorities').select(COLS)).order('position').order('created_at')
  return (data ?? []) as Priority[]
}

export async function addPriority(p: { title: string; detail?: string; dept?: string | null; due?: string | null }, position: number): Promise<Priority | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('priorities')
    .insert(withBrandInsert({ title: p.title.trim(), detail: (p.detail ?? '').trim(), dept: p.dept ?? null, due: p.due ?? null, position }) as never)
    .select(COLS).single()
  if (error) throw error
  return data as Priority
}

export async function updatePriority(id: string, patch: Partial<Pick<Priority, 'title' | 'detail' | 'dept' | 'status' | 'note' | 'due' | 'position'>>): Promise<void> {
  if (!supabase) return
  const decided = patch.status && patch.status !== 'active' ? { decided_at: new Date().toISOString() } : patch.status === 'active' ? { decided_at: null } : {}
  await supabase.from('priorities').update({ ...patch, ...decided, updated_at: new Date().toISOString() } as never).eq('id', id)
}

export async function reorderPriorities(ids: string[]): Promise<void> {
  if (!supabase) return
  await Promise.all(ids.map((id, i) => supabase!.from('priorities').update({ position: i, updated_at: new Date().toISOString() } as never).eq('id', id)))
}

export async function removePriority(id: string): Promise<void> {
  if (!supabase) return
  await supabase.from('priorities').delete().eq('id', id)
}

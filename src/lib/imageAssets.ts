import { supabase, functionsBase } from './supabase'
import { filterByBrand } from './brandScope'

/* ============================================================
   Images a seat generated through a connected tool. Each waits
   for the founder's review; approved ones are the library.
   ============================================================ */

export interface ImageAsset {
  id: string; dept: string | null; role_id: string | null; run_id: string | null
  purpose: string; category: string; surface: string; prompt: string; aspect_ratio: string
  url: string; status: 'pending' | 'approved' | 'declined'; created_at: string; decided_at: string | null
  destination: 'studio' | 'remedae'; library_url: string | null; library_path: string | null
}
const COLS = 'id, dept, role_id, run_id, purpose, category, surface, prompt, aspect_ratio, url, status, created_at, decided_at, destination, library_url, library_path'

export async function listImageAssets(opts: { dept?: string; status?: ImageAsset['status']; limit?: number } = {}): Promise<ImageAsset[]> {
  if (!supabase) return []
  let q = filterByBrand(supabase.from('image_assets').select(COLS))
  if (opts.dept) q = q.eq('dept', opts.dept)
  if (opts.status) q = q.eq('status', opts.status)
  const { data } = await q.order('created_at', { ascending: false }).limit(opts.limit ?? 60)
  return (data ?? []) as ImageAsset[]
}

export async function decideImage(id: string, status: 'approved' | 'declined', note?: string): Promise<void> {
  if (!supabase) return
  await supabase.from('image_assets').update({ status, note: note ?? null, decided_at: new Date().toISOString() } as never).eq('id', id)
}

/** Approved images made for a brand's site are filed into that site's own
    library (Remedae's bucket, with a sidecar). Returns the library URL. */
export async function fileToLibrary(assetId: string): Promise<{ url?: string; path?: string; error?: string }> {
  if (!supabase || !functionsBase) return { error: 'Not connected' }
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return { error: 'Sign in first' }
  const res = await fetch(`${functionsBase}/publish-asset`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ assetId }),
  })
  const out = await res.json().catch(() => ({})) as { url?: string; path?: string; error?: string }
  if (!res.ok) return { error: out.error ?? `publish-asset ${res.status}` }
  return out
}

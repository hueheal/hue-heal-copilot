import { supabase } from './supabase'
import { filterByBrand, withBrandInsert } from './brandScope'

/* ============================================================
   Org channel: a messaging thread linked to one workspace, so
   the founder can brief roles and approve their requests from a
   phone. Pairing is one-time-code based: the studio mints a code,
   you send it to the bot, and the bot binds that chat to this
   workspace. A chat is bound to exactly one workspace at a time,
   which is what keeps two brand worlds from meeting in a thread.
   ============================================================ */

export interface OrgChannel {
  id: string
  provider: string
  chat_id: string | null
  chat_label: string
  pair_code: string | null
  paired_at: string | null
  push: boolean
  brand_id: string | null
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no look-alikes

function mintCode(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (n) => CODE_ALPHABET[n % CODE_ALPHABET.length]).join('')
}

export async function getChannel(): Promise<OrgChannel | null> {
  if (!supabase) return null
  const { data } = await filterByBrand(supabase.from('org_channels')
    .select('id, provider, chat_id, chat_label, pair_code, paired_at, push, brand_id'))
    .eq('provider', 'telegram').limit(1)
  return ((data ?? [])[0] as OrgChannel) ?? null
}

/** Mint (or re-mint) a pairing code for this workspace. */
export async function startPairing(): Promise<OrgChannel> {
  if (!supabase) throw new Error('Not connected')
  const code = mintCode()
  const existing = await getChannel()
  if (existing) {
    const { data, error } = await supabase.from('org_channels')
      .update({ chat_id: null, chat_label: '', pair_code: code, paired_at: null, updated_at: new Date().toISOString() } as never)
      .eq('id', existing.id).select('id, provider, chat_id, chat_label, pair_code, paired_at, push, brand_id').single()
    if (error) throw error
    return data as OrgChannel
  }
  const payload = withBrandInsert({ provider: 'telegram', pair_code: code })
  if (!(payload as { brand_id?: string }).brand_id) throw new Error('Pick a workspace first.')
  const { data, error } = await supabase.from('org_channels').insert(payload as never)
    .select('id, provider, chat_id, chat_label, pair_code, paired_at, push, brand_id').single()
  if (error) throw error
  return data as OrgChannel
}

export async function setPush(id: string, push: boolean): Promise<void> {
  if (!supabase) return
  await supabase.from('org_channels').update({ push, updated_at: new Date().toISOString() } as never).eq('id', id)
}

export async function unlinkChannel(id: string): Promise<void> {
  if (!supabase) return
  await supabase.from('org_channels').delete().eq('id', id)
}

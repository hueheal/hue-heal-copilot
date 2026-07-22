import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/* Hue & Heal — Studio Co-pilot Supabase client.
   The app runs in one of two modes:
   - "connected": VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are present, so we
     talk to a real hosted Supabase project (auth, Postgres, storage, edge fns).
   - "local": neither is set, so the data layer falls back to in-memory state and
     the AI falls back to on-device template generation. This keeps `npm run dev`
     fully usable before any backend is provisioned. */

/* Sanitize env values: copy-pasting keys through rich-text UIs can inject
   invisible characters (zero-width spaces, smart punctuation) that are valid
   in a string but illegal in an HTTP header value — fetch then throws
   "String contains non ISO-8859-1 code point". Strip anything outside
   printable ASCII and trim surrounding whitespace so the header is always clean. */
const clean = (v?: string): string | undefined => {
  if (v == null) return undefined
  const stripped = v.replace(/[^\x20-\x7E]/g, '').trim()
  return stripped.length ? stripped : undefined
}

const url = clean(import.meta.env.VITE_SUPABASE_URL as string | undefined)
const anonKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null

/** Base URL for invoking edge functions (derived from the project URL). */
export const functionsBase = url ? `${url.replace(/\/$/, '')}/functions/v1` : null

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/* Hue & Heal — Studio Co-pilot Supabase client.
   The app runs in one of two modes:
   - "connected": VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are present, so we
     talk to a real hosted Supabase project (auth, Postgres, storage, edge fns).
   - "local": neither is set, so the data layer falls back to in-memory state and
     the AI falls back to on-device template generation. This keeps `npm run dev`
     fully usable before any backend is provisioned. */

/* Public project config. The anon key is designed to be public — it ships in
   every client bundle and access is enforced server-side by row-level security —
   so baking it in as a default is safe, and it makes the deployed app resilient
   to host env vars getting mangled (a corrupted paste, invisible characters, etc.).
   An env var still wins IF it is a well-formed value; otherwise we fall back. */
const FALLBACK_URL = 'https://dxniwcwoacyrjlyhymoh.supabase.co'
const FALLBACK_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4bml3Y3dvYWN5cmpseWh5bW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MjAzNjgsImV4cCI6MjEwMDE5NjM2OH0.290XlpQot76lTQIWWkVxHzTbWWS4Pxd4Rds7eM5BkWE'

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

/* A valid Supabase anon key is a JWT: three base64url segments split by dots. */
const isJwt = (v?: string): boolean => !!v && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(v)
const isSupabaseUrl = (v?: string): boolean => !!v && /^https:\/\/[\w.-]+\.supabase\.co\/?$/.test(v)

const envUrl = clean(import.meta.env.VITE_SUPABASE_URL as string | undefined)
const envAnon = clean(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

const url = isSupabaseUrl(envUrl) ? envUrl! : FALLBACK_URL
const anonKey = isJwt(envAnon) ? envAnon! : FALLBACK_ANON

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null

/** Base URL for invoking edge functions (derived from the project URL). */
export const functionsBase = url ? `${url.replace(/\/$/, '')}/functions/v1` : null

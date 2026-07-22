import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/* Hue & Heal — Studio Co-pilot Supabase client.

   Public project config is baked in below. The anon key is designed to be
   public — it ships in every client bundle and access is enforced server-side
   by row-level security — so hardcoding it is safe. We intentionally do NOT
   read VITE_SUPABASE_* from the host env: those values kept getting corrupted
   in transit (invisible characters from rich-text paste, truncation), producing
   hard-to-debug "Invalid API key" and non-ISO-8859-1 fetch errors on the
   deployed site. Hardcoding removes that entire failure class.

   To point at a different Supabase project, edit these two constants. */
const url = 'https://dxniwcwoacyrjlyhymoh.supabase.co'
const anonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4bml3Y3dvYWN5cmpseWh5bW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MjAzNjgsImV4cCI6MjEwMDE5NjM2OH0.290XlpQot76lTQIWWkVxHzTbWWS4Pxd4Rds7eM5BkWE'

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null

/** Base URL for invoking edge functions (derived from the project URL). */
export const functionsBase = url ? `${url.replace(/\/$/, '')}/functions/v1` : null

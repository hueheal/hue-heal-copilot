import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './supabase'

/* Auth is only enforced when Supabase is configured. In local mode the whole app
   is usable without signing in (data lives in memory), so the preview never blocks. */

interface AuthState {
  mode: 'connected' | 'local'
  session: Session | null
  loading: boolean
  email: string | null
  signIn: (email: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      // Ignore token refreshes for the SAME user. Supabase re-emits on tab
      // refocus with a fresh session object; if we swap it in, effects keyed on
      // the session re-run and remount the app, throwing you back to the
      // workspace picker mid-edit. Keep the same reference when the user is
      // unchanged. Access tokens are read fresh via getSession() at call time,
      // so holding a stable object in state is harmless.
      setSession((prev) => (prev && s && prev.user?.id === s.user?.id ? prev : s))
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value: AuthState = {
    mode: isSupabaseConfigured ? 'connected' : 'local',
    session,
    loading,
    email: session?.user.email ?? null,
    async signIn(email: string) {
      if (!supabase) return {}
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      })
      return error ? { error: error.message } : {}
    },
    async signOut() {
      await supabase?.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

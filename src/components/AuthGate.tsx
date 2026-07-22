import { useState, type ReactNode } from 'react'
import { useAuth } from '../lib/auth'
import Logo from './Logo'

/* Full-screen authentication gate. When Supabase is connected and no one is
   signed in, the entire app (sidebar, dashboard, all data) is replaced by a
   sign-in screen — nothing behind the login is rendered. Once a session
   exists, children render normally. */
export default function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth()

  // While restoring the session, show a quiet branded splash (avoids a flash
  // of the sign-in screen for already-authenticated users).
  if (auth.loading) {
    return (
      <Screen>
        <div style={{ opacity: 0.6, fontSize: 13, color: 'var(--text-on-ink-muted)' }}>Loading…</div>
      </Screen>
    )
  }

  // Connected + not signed in → block everything behind a sign-in screen.
  if (auth.mode === 'connected' && !auth.session) {
    return <SignInScreen />
  }

  return <>{children}</>
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--hh-ink, #1E1B18)',
        fontFamily: 'var(--font-sans)',
        padding: 24,
      }}
    >
      {children}
    </div>
  )
}

function SignInScreen() {
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit() {
    const value = email.trim()
    if (!value) return
    setSending(true)
    setNote(null)
    const { error } = await auth.signIn(value)
    setSending(false)
    if (error) {
      setNote(error)
    } else {
      setSent(true)
      setNote(`We’ve emailed a magic link to ${value}. Open it on this device to sign in.`)
    }
  }

  return (
    <Screen>
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28, color: 'var(--text-on-ink, #F4F0E7)' }}>
          <Logo height={30} />
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontSize: 30,
            lineHeight: 1.15,
            color: 'var(--text-on-ink, #F4F0E7)',
            margin: '0 0 8px',
          }}
        >
          Studio Co-pilot
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-on-ink-muted, #b8ad9c)', margin: '0 0 28px', lineHeight: 1.5 }}>
          Private workspace. Sign in with your studio email to continue.
        </p>

        {!sent && (
          <>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              placeholder="you@hueandheal.com"
              type="email"
              autoFocus
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: '1px solid var(--hh-line-ink, rgba(244,240,231,0.18))',
                background: 'rgba(244,240,231,0.06)',
                color: 'var(--text-on-ink, #F4F0E7)',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 14,
                fontFamily: 'var(--font-sans)',
                marginBottom: 10,
                textAlign: 'center',
              }}
            />
            <button
              onClick={submit}
              disabled={sending}
              style={{
                width: '100%',
                background: 'var(--hh-copper, #B5632F)',
                color: '#F6EFE4',
                border: 'none',
                borderRadius: 10,
                padding: '12px',
                fontSize: 14,
                fontFamily: 'var(--font-sans)',
                cursor: sending ? 'default' : 'pointer',
                opacity: sending ? 0.7 : 1,
              }}
            >
              {sending ? 'Sending…' : 'Send magic link'}
            </button>
          </>
        )}

        {note && (
          <div style={{ fontSize: 12.5, color: 'var(--text-on-ink-muted, #b8ad9c)', marginTop: 16, lineHeight: 1.5 }}>
            {note}
          </div>
        )}
      </div>
    </Screen>
  )
}

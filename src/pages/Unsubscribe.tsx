import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { publicUnsubscribe } from '../lib/newsletter'

/* Public unsubscribe page — OUTSIDE the auth gate. The {{unsubscribe}} link in
   each newsletter carries a per-subscriber token: /unsubscribe?t=<token>.
   Auto-runs on load so one click is enough. */
export default function Unsubscribe() {
  const [params] = useSearchParams()
  const token = params.get('t') ?? ''
  const [state, setState] = useState<'working' | 'done' | 'error'>('working')
  const [email, setEmail] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let off = false
    if (!token) { setState('error'); setError('This unsubscribe link is invalid.'); return }
    publicUnsubscribe(token).then((r) => {
      if (off) return
      if (r.ok) { setEmail(r.email); setState('done') }
      else { setError(r.error ?? 'Could not unsubscribe.'); setState('error') }
    })
    return () => { off = true }
  }, [token])

  return (
    <div style={shell}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, marginBottom: 18 }}>
          hue&amp;heal<span style={{ color: 'var(--hh-copper)' }}>.</span>
        </div>
        {state === 'working' && <p style={muted}>Updating your preferences…</p>}
        {state === 'done' && (
          <>
            <h1 style={heading}>You’re unsubscribed.</h1>
            <p style={muted}>{email ? <>{email} has been removed. </> : null}You won’t receive any more of these emails. Changed your mind? You can always subscribe again.</p>
          </>
        )}
        {state === 'error' && <p style={{ ...muted, color: 'var(--hh-ember)' }}>{error}</p>}
      </div>
    </div>
  )
}

const shell: React.CSSProperties = { minHeight: '100vh', width: '100%', background: 'var(--hh-ink, #1E1B18)', color: 'var(--text-on-ink, #F4F0E7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-sans)' }
const heading: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 26, margin: '0 0 8px' }
const muted: React.CSSProperties = { fontSize: 14, color: 'var(--text-on-ink-muted, #b8ad9c)', lineHeight: 1.6, margin: 0 }

import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { publicSubscribe } from '../lib/newsletter'

/* Public self-serve subscribe page — lives OUTSIDE the app's auth gate.
   Link shape: /subscribe?b=<brandId>&name=<Brand>&g=<optional group> */
export default function Subscribe() {
  const [params] = useSearchParams()
  const brandId = params.get('b') ?? ''
  const brandName = params.get('name') ?? 'our studio'
  const group = params.get('g') ?? ''

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!email.trim()) return
    setBusy(true); setError(null)
    const { ok, error } = await publicSubscribe({ brandId, email, name, group })
    setBusy(false)
    if (ok) setDone(true)
    else setError(error ?? 'Something went wrong — please try again.')
  }

  return (
    <div style={shell}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, marginBottom: 6 }}>
          hue&amp;heal<span style={{ color: 'var(--hh-copper)' }}>.</span>
        </div>
        {!brandId ? (
          <p style={muted}>This subscribe link is missing its brand. Please use the link shared with you.</p>
        ) : done ? (
          <>
            <h1 style={heading}>You’re in.</h1>
            <p style={muted}>Thanks for subscribing to {brandName}. Look out for our next edition — and you can unsubscribe any time from the footer of an email.</p>
          </>
        ) : (
          <>
            <h1 style={heading}>Subscribe to {brandName}</h1>
            <p style={{ ...muted, marginBottom: 24 }}>Thoughtful, occasional emails. No spam, unsubscribe any time.</p>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First name (optional)" style={inp} />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              placeholder="you@email.com"
              type="email"
              autoFocus
              style={{ ...inp, marginTop: 10 }}
            />
            <button onClick={submit} disabled={busy || !email.trim()} style={{ ...btn, opacity: busy || !email.trim() ? 0.6 : 1 }}>
              {busy ? 'Subscribing…' : 'Subscribe'}
            </button>
            {error && <div style={{ ...muted, color: 'var(--hh-ember)', marginTop: 14 }}>{error}</div>}
          </>
        )}
      </div>
    </div>
  )
}

const shell: React.CSSProperties = { minHeight: '100vh', width: '100%', background: 'var(--hh-ink, #1E1B18)', color: 'var(--text-on-ink, #F4F0E7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-sans)' }
const heading: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 26, margin: '0 0 8px' }
const muted: React.CSSProperties = { fontSize: 14, color: 'var(--text-on-ink-muted, #b8ad9c)', lineHeight: 1.6, margin: 0 }
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'rgba(244,240,231,0.06)', border: '1px solid var(--hh-line-ink, rgba(244,240,231,0.18))', borderRadius: 10, padding: '13px 15px', fontSize: 15, color: 'var(--text-on-ink, #F4F0E7)', fontFamily: 'var(--font-sans)', textAlign: 'center' }
const btn: React.CSSProperties = { width: '100%', marginTop: 12, background: 'var(--hh-copper)', color: 'var(--hh-on-accent, #F6EFE4)', border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, cursor: 'pointer', fontFamily: 'var(--font-sans)' }

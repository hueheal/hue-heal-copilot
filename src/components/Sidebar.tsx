import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { NAV, USER } from '../data/studio'
import { useAuth } from '../lib/auth'
import Logo from './Logo'

export default function Sidebar() {
  return (
    <aside
      style={{
        width: 248,
        flexShrink: 0,
        background: 'var(--hh-anthracite)',
        color: 'var(--text-on-ink)',
        display: 'flex',
        flexDirection: 'column',
        padding: '22px 16px',
      }}
    >
      {/* Brand lockup */}
      <div style={{ padding: '6px 10px 24px', color: 'var(--text-on-ink)' }}>
        <Logo height={18} />
      </div>

      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-on-ink-faint)',
          padding: '8px 12px',
        }}
      >
        Workspace
      </div>

      {/* Nav */}
      {NAV.map((item) => (
        <NavLink
          key={item.key}
          to={item.path}
          end={item.path === '/'}
          className="hh-nav"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '11px 12px',
            borderRadius: 10,
            marginBottom: 2,
            background: isActive ? 'rgba(244,240,231,0.10)' : 'transparent',
          })}
        >
          {({ isActive }) => (
            <>
              <span
                style={{
                  width: 16,
                  textAlign: 'center',
                  fontSize: 14,
                  color: isActive ? 'var(--hh-ember)' : 'var(--text-on-ink-faint)',
                }}
              >
                {item.glyph}
              </span>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--text-on-ink)' : 'var(--text-on-ink-muted)',
                }}
              >
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}

      {/* User / auth card — global sign-in */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--hh-line-ink)', paddingTop: 14 }}>
        <AuthCard />
      </div>
    </aside>
  )
}

function AuthCard() {
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [note, setNote] = useState<string | null>(null)

  // Connected but not signed in → global sign-in.
  if (auth.mode === 'connected' && !auth.session) {
    return (
      <div>
        <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-on-ink-faint)', marginBottom: 8 }}>Sign in</div>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@studio.com"
          style={{ width: '100%', border: '1px solid var(--hh-line-ink)', background: 'rgba(244,240,231,0.06)', color: 'var(--text-on-ink)', borderRadius: 8, padding: '8px 10px', fontSize: 12, fontFamily: 'var(--font-sans)', marginBottom: 6 }}
        />
        <button
          className="hh-btn"
          onClick={async () => { const { error } = await auth.signIn(email); setNote(error ? error : `Magic link sent to ${email}`) }}
          style={{ width: '100%', background: 'var(--hh-copper)', color: '#F6EFE4', border: 'none', borderRadius: 8, padding: '8px', fontSize: 12 }}
        >
          Send magic link
        </button>
        {note && <div style={{ fontSize: 10.5, color: 'var(--text-on-ink-muted)', marginTop: 6, lineHeight: 1.4 }}>{note}</div>}
      </div>
    )
  }

  const signedInEmail = auth.email
  const initials = signedInEmail ? signedInEmail.slice(0, 2).toUpperCase() : USER.initials
  const primary = signedInEmail ?? USER.name
  const secondary = auth.mode === 'connected' ? 'Signed in' : 'Local mode'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--hh-mushroom), var(--hh-mocha))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#2A211A', flexShrink: 0 }}>
        {initials}
      </div>
      <div style={{ lineHeight: 1.3, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--text-on-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{primary}</div>
        <div style={{ fontSize: 10.5, color: 'var(--text-on-ink-faint)' }}>{secondary}</div>
      </div>
      {auth.mode === 'connected' && auth.session && (
        <button onClick={auth.signOut} className="hh-btn" style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--hh-ember)', fontSize: 11 }}>
          Sign out
        </button>
      )}
    </div>
  )
}

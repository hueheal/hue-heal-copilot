import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUp, Bell, Check, EnvelopeSimple, List, Microphone, SpeakerHigh, SpeakerSlash, Sparkle, Stop, X } from '@phosphor-icons/react'
import AuthGate from '../components/AuthGate'
import { BrandProvider, useBrand } from '../lib/brandContext'
import { ask, decideAction, getProfile, listActions, listMessages, listTeamApprovals, live, saveProfile, EMPTY_PROFILE, type LifeAction, type LifeMessage, type LifeProfile } from './life'
import { speak, useVoice, voiceSupported } from './voice'
import { useIsMobile } from '../lib/useIsMobile'
import Today from './Today'
import Plan from './Plan'
import Pipeline from './Pipeline'
import Calendar from './Calendar'
import './v2.css'

/* ============================================================
   Copilot V2, the life OS. One shell: the lens switcher (All or
   one business), the expanding menu, and a composer that is on
   every screen and takes voice or text. Everything the founder
   says goes to one assistant (life-agent); the conversation and
   its approvals live on the Chat screen.
   ============================================================ */

export type Lens = 'all' | string
interface LifeCtx {
  profile: LifeProfile; setProfile: (p: Partial<LifeProfile>) => void
  lens: Lens; setLens: (l: Lens) => void
  brands: { id: string; name: string; accent_color?: string | null; logo_url?: string | null }[]
  colorOf: (brandId: string | null | undefined) => string; nameOf: (brandId: string | null | undefined) => string
  inLens: (brandId: string | null | undefined) => boolean
  version: number; bump: () => void
  send: (text: string, via?: 'chat' | 'voice') => void
  prefill: (text: string) => void
  pending: LifeAction[]; decide: (a: LifeAction, approve: boolean) => Promise<void>
}
const Ctx = createContext<LifeCtx | null>(null)
export const useLife = () => { const c = useContext(Ctx); if (!c) throw new Error('useLife outside V2'); return c }

const TILE: Record<string, string> = { 'hue & heal': '/os/ws-hh.png', remedae: '/os/ws-remedae.png', 'mazzi summer showdown': '/os/ws-showdown.png' }
const LIFE_COLOR = '#8C7B6B'

export default function V2App() {
  return <AuthGate><BrandProvider><Shell /></BrandProvider></AuthGate>
}

function Shell() {
  const { brands } = useBrand()
  const nav = useNavigate()
  const loc = useLocation()
  const [profile, setP] = useState<LifeProfile>(EMPTY_PROFILE)
  const [lens, setLensState] = useState<Lens>(() => localStorage.getItem('v2.lens') || 'all')
  const [version, setVersion] = useState(0)
  const [menu, setMenu] = useState(false)
  const [pending, setPending] = useState<LifeAction[]>([])
  const [teamWaiting, setTeamWaiting] = useState(0)
  const [messages, setMessages] = useState<LifeMessage[]>([])
  const [thinking, setThinking] = useState(false)
  const [text, setText] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()

  const bump = useCallback(() => setVersion((v) => v + 1), [])
  useEffect(() => { void getProfile().then(setP) }, [])
  useEffect(() => { void listActions().then(setPending); void listMessages().then(setMessages); void listTeamApprovals().then((j) => setTeamWaiting(j.length)) }, [version])
  useEffect(() => { setMenu(false) }, [loc.pathname])

  const setLens = (l: Lens) => { setLensState(l); localStorage.setItem('v2.lens', l) }
  const setProfile = (patch: Partial<LifeProfile>) => { setP((p) => ({ ...p, ...patch })); void saveProfile(patch) }
  const colorOf = useCallback((id: string | null | undefined) => (id ? brands.find((b) => b.id === id)?.accent_color || '#FE8C2E' : LIFE_COLOR), [brands])
  const nameOf = useCallback((id: string | null | undefined) => (id ? brands.find((b) => b.id === id)?.name ?? 'Business' : 'Life'), [brands])
  const inLens = useCallback((id: string | null | undefined) => lens === 'all' || id === lens, [lens])

  const flash = (n: string) => { setNote(n); window.setTimeout(() => setNote((x) => (x === n ? null : x)), 5000) }

  const send = useCallback(async (raw: string, via: 'chat' | 'voice' = 'chat') => {
    const t = raw.trim(); if (!t || thinking) return
    setText('')
    if (!loc.pathname.startsWith('/v2/chat')) nav('/v2/chat')
    const optimistic: LifeMessage = { id: `tmp-${Date.now()}`, role: 'user', text: t, via, actions: [], created_at: new Date().toISOString() }
    setMessages((m) => [...m, optimistic])
    setThinking(true)
    const r = await ask(t, via)
    setThinking(false)
    if (r.error) { flash(r.error); return }
    setMessages(await listMessages())
    if (r.pending) setPending(r.pending)
    bump()
    if (r.reply && (via === 'voice' || profile.voice_replies)) speak(r.reply)
  }, [thinking, loc.pathname, nav, bump, profile.voice_replies])

  const voice = useVoice((t) => void send(t, 'voice'))
  const prefill = (t: string) => { setText(t); window.setTimeout(() => inputRef.current?.focus(), 30) }

  const decide = async (a: LifeAction, approve: boolean) => {
    setPending((l) => l.filter((x) => x.id !== a.id))
    const r = await decideAction(a.id, approve)
    if (r.error) { flash(r.error); setPending((l) => [a, ...l]); return }
    flash(!approve ? 'Declined. Nothing was sent.' : r.status === 'sent' ? 'Sent.' : 'Approved and added to your tasks.')
    bump()
  }

  const ctx: LifeCtx = { profile, setProfile, lens, setLens, brands, colorOf, nameOf, inLens, version, bump, send: (t, v) => void send(t, v), prefill, pending, decide }
  const isChat = loc.pathname.startsWith('/v2/chat')
  const menuItems: [string, string][] = [['Today', '/v2'], ['Plan', '/v2/plan'], ['Pipeline', '/v2/pipeline'], ['Calendar', '/v2/calendar'], ['Chat', '/v2/chat'], ['Team', '/os?with=slt'], ['Studio', '/create'], ['Settings', '/settings']]
  const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join('').replace('&', '').slice(0, 2).toUpperCase()

  return (
    <Ctx.Provider value={ctx}>
      <div className="v2" data-menu={menu ? 'open' : undefined}>
        <a className="v2-skip" href="#v2-main">Skip to content</a>
        <div className="v2-sky" aria-hidden />
        <header className="v2-top">
          <div className="v2-top-left">
            <button className="v2-pillbtn" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
              {menu ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
            </button>
          </div>
          <div className="v2-lens" role="tablist" aria-label="Lens">
            <button role="tab" aria-selected={lens === 'all'} title="Your whole life" className="v2-tile v2-tile-all" data-on={lens === 'all' ? '1' : undefined} onClick={() => setLens('all')}>All</button>
            {brands.map((b) => {
              const src = b.logo_url || TILE[b.name.trim().toLowerCase()] || ''
              return (
                <button key={b.id} role="tab" aria-selected={lens === b.id} title={b.name} className="v2-tile" data-on={lens === b.id ? '1' : undefined}
                  style={src ? undefined : { background: b.accent_color || undefined }} onClick={() => setLens(b.id)}>
                  {src ? <img src={src} alt={b.name} width={43} height={43} /> : initials(b.name)}
                </button>
              )
            })}
          </div>
          <div className="v2-top-right">
            <button className="v2-pillbtn" data-round="1" aria-label={`${pending.length + teamWaiting} waiting for your approval`} onClick={() => nav('/v2#needs-you')}>
              <Bell size={18} />{pending.length + teamWaiting > 0 && <span className="v2-badge">{pending.length + teamWaiting}</span>}
            </button>
          </div>
        </header>

        <nav className="v2-menu" data-open={menu ? '1' : undefined} aria-label="Menu" aria-hidden={!menu}>
          {menuItems.map(([label, to]) => (
            <NavLink key={label} to={to} end={to === '/v2'} tabIndex={menu ? 0 : -1} className={({ isActive }) => (isActive && to.startsWith('/v2') ? 'on' : undefined)}>{label}</NavLink>
          ))}
        </nav>
        {menu && <button className="v2-scrim" aria-label="Close menu" onClick={() => setMenu(false)} />}

        <main className="v2-stage" id="v2-main" tabIndex={-1}>
          <Routes>
            <Route index element={<Today />} />
            <Route path="plan" element={<Plan />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="chat" element={<Chat messages={messages} thinking={thinking} />} />
          </Routes>
        </main>

        <div className="v2-ground" aria-hidden />
        {note && <div className="v2-toast" role="status">{note}</div>}
        {voice.error && <div className="v2-toast" role="alert">{voice.error}</div>}
        <form className="v2-compose" data-listening={voice.listening ? '1' : undefined} onSubmit={(e) => { e.preventDefault(); void send(text) }}>
          <label className="v2-compose-copy">
            <small>{voice.listening ? 'Listening' : thinking ? 'Copilot is working on it' : isChat ? 'Talk to Copilot' : 'Ask me anything'}</small>
            <input ref={inputRef} name="message" autoComplete="off" value={voice.listening ? voice.interim : text} readOnly={voice.listening} onChange={(e) => setText(e.target.value)}
              placeholder={voice.listening ? 'Speak now…' : isMobile ? 'What can I help with?' : 'What can I help you with today?'} aria-label="Message Copilot" />
          </label>
          {voiceSupported && (
            <button type="button" className="v2-mic" data-on={voice.listening ? '1' : undefined} aria-label={voice.listening ? 'Stop listening' : 'Talk to Copilot'} onClick={() => (voice.listening ? voice.stop() : voice.start())}>
              {voice.listening ? <Stop size={18} weight="fill" /> : <Microphone size={20} />}
            </button>
          )}
          <button type="submit" className="v2-send" disabled={thinking || voice.listening || !text.trim()} aria-label="Send"><ArrowUp size={18} weight="bold" /></button>
        </form>
        {!live && <div className="v2-sample">Sample life. Sign in on the live app to use your own.</div>}
      </div>
    </Ctx.Provider>
  )
}

/* ---- The conversation ---- */
function Chat({ messages, thinking }: { messages: LifeMessage[]; thinking: boolean }) {
  const { pending, decide, profile, setProfile } = useLife()
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [messages.length, thinking, pending.length])
  const shown = useMemo(() => messages.slice(-80), [messages])

  return (
    <div className="v2-col v2-chat">
      <div className="v2-chat-head">
        <h1 className="v2-h-page">Copilot</h1>
        <button className="v2-chip" onClick={() => setProfile({ voice_replies: !profile.voice_replies })} aria-pressed={profile.voice_replies}>
          {profile.voice_replies ? <SpeakerHigh size={16} /> : <SpeakerSlash size={16} />}{profile.voice_replies ? 'Reading replies aloud' : 'Replies silent'}
        </button>
      </div>
      {shown.length === 0 && !thinking && (
        <div className="v2-empty">
          <p>Tell me what's on your mind, or try one of these.</p>
          <div className="v2-chips">
            {['What should I focus on today?', 'Add a meeting with the Hackney team on Thursday at 11', 'Find tenders for service design', 'Draft a follow-up to King\'s College'].map((s) => (
              <SuggestChip key={s} text={s} />
            ))}
          </div>
        </div>
      )}
      <div className="v2-thread">
        {shown.map((m) => (
          <div key={m.id} className="v2-turn" data-me={m.role === 'user' ? '1' : undefined}>
            {m.role === 'assistant' && <span className="v2-mark" aria-hidden><Sparkle size={16} weight="fill" /></span>}
            <div className="v2-bubble">
              <p>{m.text}</p>
              {m.actions?.length > 0 && (
                <ul className="v2-did">{m.actions.map((a, i) => <li key={i}><Check size={13} weight="bold" />{a.summary}</li>)}</ul>
              )}
              <small>{m.role === 'user' ? (m.via === 'voice' ? 'You, by voice' : 'You') : 'Copilot'} · {new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</small>
            </div>
          </div>
        ))}
        {thinking && (
          <div className="v2-turn"><span className="v2-mark" aria-hidden><Sparkle size={16} weight="fill" /></span><div className="v2-bubble v2-typing" aria-label="Copilot is working"><i /><i /><i /></div></div>
        )}
        {pending.length > 0 && (
          <div className="v2-pending">
            <div className="v2-label">Waiting for your yes</div>
            {pending.map((a) => <ApprovalCard key={a.id} a={a} onDecide={decide} />)}
          </div>
        )}
        <div ref={end} />
      </div>
    </div>
  )
}

function SuggestChip({ text }: { text: string }) {
  const { send } = useLife()
  return <button className="v2-chip" onClick={() => send(text)}>{text}</button>
}

export function ApprovalCard({ a, onDecide }: { a: LifeAction; onDecide: (a: LifeAction, approve: boolean) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const p = a.payload ?? {}
  const go = async (approve: boolean) => { setBusy(true); await onDecide(a, approve); setBusy(false) }
  return (
    <article className="v2-approval">
      <div className="v2-approval-head">
        <span className="v2-approval-icon" aria-hidden><EnvelopeSimple size={18} /></span>
        <div>
          <b>{a.kind === 'email' ? p.subject || 'Email' : p.what || 'Booking'}</b>
          <span>{a.kind === 'email' ? `To ${p.to}${p.from ? `, from ${p.from.replace(/<.*>/, '').trim() || p.from}` : ''}` : [p.when, p.where].filter(Boolean).join(', ') || 'A booking to make'}</span>
        </div>
      </div>
      {a.kind === 'email' && p.body && (
        <button className="v2-approval-body" data-open={open ? '1' : undefined} onClick={() => setOpen((v) => !v)} aria-expanded={open}>{p.body}</button>
      )}
      <div className="v2-chips">
        <button className="v2-chip" data-primary="1" disabled={busy} onClick={() => void go(true)}>{a.kind === 'email' ? 'Approve and send' : 'Approve'}</button>
        <button className="v2-chip" disabled={busy} onClick={() => void go(false)}>Decline</button>
      </div>
    </article>
  )
}

export function Section({ label, children, id, aside }: { label: string; children: ReactNode; id?: string; aside?: ReactNode }) {
  return (
    <section className="v2-section" id={id}>
      <div className="v2-section-head"><h2 className="v2-label">{label}</h2>{aside}</div>
      {children}
    </section>
  )
}

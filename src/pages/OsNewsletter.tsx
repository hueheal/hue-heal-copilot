import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBrand } from '../lib/brandContext'
import '../styles/os.css'

/* ============================================================
   Company OS — newsletter, drafted by the editor, sent by you.
   The editor's message sits where a card would on the home page;
   beneath it the email as it will land, and on the right the
   short list of things to settle before it goes. The composer
   talks to the editor: "warmer intro", "swap the second piece".
   Draft with sample content, to judge the shape.
   ============================================================ */

const I = {
  menu: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>,
  arrow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  phone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 17h2" /></svg>,
  desk: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 20h8" /></svg>,
}

const TILE: Record<string, string> = { 'hue & heal': '/os/ws-hh.png', remedae: '/os/ws-remedae.png', 'mazzi summer showdown': '/os/ws-showdown.png' }

const PIECES = [
  { title: 'Why the evening tea ritual works', dek: 'Warmth, a pause, and a cue the body learns to expect.', mins: 5, cat: 'Sleep' },
  { title: 'The 4-7-8 breath, without the mysticism', dek: 'What the counting actually does, and when it doesn\'t.', mins: 4, cat: 'Breath' },
  { title: 'Ginger: the tradition and the trials', dek: 'Two thousand years of use, and what the evidence adds.', mins: 6, cat: 'Tradition' },
]

export default function OsNewsletter() {
  const { current, brands, setCurrent } = useBrand()
  const nav = useNavigate()
  const [menu, setMenu] = useState(false)
  const [view, setView] = useState<'phone' | 'desk'>('desk')
  const [sendAs, setSendAs] = useState<'journal' | 'maria'>('journal')
  const [subject, setSubject] = useState('Longer reads, slowly made')
  const [text, setText] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [thread, setThread] = useState<{ me: boolean; text: string }[]>([
    { me: false, text: 'I\'ve drafted this week\'s digest for 412 readers: three pieces, the tea ritual first. It goes Thursday at 8am once you approve it.' },
  ])

  const say = (t: string) => {
    setThread((l) => [...l, { me: true, text: t }, { me: false, text: 'Done. Take a look at the intro and the running order below; nothing else changed.' }])
    setText(''); setNote(null)
  }
  const menuItems = [
    { label: 'Marketing', go: () => nav('/create') }, { label: 'Teams', go: () => nav('/team') }, { label: 'Clients', go: () => nav('/clients') },
    { label: 'Approvals', go: () => nav('/os') }, { label: 'Settings', go: () => nav('/settings') },
  ]
  const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join('').replace('&', '').slice(0, 2).toUpperCase()

  return (
    <div className="os" data-phase="list" onClick={() => setMenu(false)}>
      <div className="os-sky" aria-hidden />
      <header className="os-top">
        <div className="os-top-left">
          <button className="os-icon" aria-label="Menu" onClick={(e) => { e.stopPropagation(); setMenu((v) => !v) }}>{I.menu}</button>
        </div>
        <div className="os-ws" role="tablist" onClick={(e) => e.stopPropagation()}>
          {brands.map((b) => {
            const src = b.logo_url || TILE[b.name.trim().toLowerCase()] || ''
            return <button key={b.id} role="tab" title={b.name} className="os-ws-tile" data-on={b.id === current?.id ? '1' : undefined} style={src ? undefined : { background: b.accent_color || undefined }} onClick={() => setCurrent(b.id)}>{src ? <img src={src} alt="" /> : initials(b.name)}</button>
          })}
        </div>
        <div className="os-top-right"><button className="os-icon" data-round="1" aria-label="Approvals" onClick={() => nav('/os')}>{I.bell}</button></div>
      </header>
      <nav className="os-menu" data-open={menu ? '1' : undefined} onClick={(e) => e.stopPropagation()}>
        {menuItems.map((m) => <button key={m.label} tabIndex={menu ? 0 : -1} onClick={() => { setMenu(false); m.go() }}>{m.label}</button>)}
      </nav>

      <div className="os-stage">
        <div className="os-col">
          <div className="os-greet" style={{ position: 'static' }}><h1>Newsletter <b>·</b> {subject}</h1></div>

          <div className="os-list" style={{ marginTop: 20 }}>
            {/* The editor's messages, exactly as on the home page. */}
            {thread.map((m, i) => m.me ? (
              <div key={i} className="os-bubble" data-me="1" style={{ alignSelf: 'flex-end', marginLeft: 'auto', marginBottom: 13, maxWidth: '70%' }}>{m.text}<small>You · just now</small></div>
            ) : (
              <article key={i} className="os-msg" style={{ cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                <img className="os-msg-avatar" src="/os/bot-warm.png" alt="" />
                <div className="os-msg-body">
                  <h3>Editor-in-chief:</h3>
                  <p>{m.text}</p>
                  {i === thread.length - 1 && (
                    <div className="os-chips">
                      <button className="os-chip" data-primary="1" onClick={() => setNote(`Sending "${subject}" to 412 readers as ${sendAs === 'maria' ? 'Maria' : 'The Remedae Journal'}, Thursday 8am. Reply "yes" to confirm.`)}>Approve and send</button>
                      <button className="os-chip" onClick={() => say('Make the intro warmer and shorter.')}>Warmer intro</button>
                      <button className="os-chip" onClick={() => say('Swap the second piece for the ginger one.')}>Swap a piece</button>
                      <button className="os-chip" onClick={() => nav('/create/newsletter')}>Edit by hand</button>
                    </div>
                  )}
                </div>
              </article>
            ))}

            <div className="os-chat-grid">
              {/* The email as it will land */}
              <div className="os-nl-preview" data-view={view}>
                <div className="os-nl-toolbar">
                  <span>As it lands · {sendAs === 'maria' ? 'Maria <maria@remedae.app>' : 'The Remedae Journal <news@remedae.app>'}</span>
                  <span className="os-chips" style={{ marginTop: 0 }}>
                    <button className="os-chip" data-primary={view === 'desk' ? '1' : undefined} onClick={() => setView('desk')}>{I.desk}</button>
                    <button className="os-chip" data-primary={view === 'phone' ? '1' : undefined} onClick={() => setView('phone')}>{I.phone}</button>
                  </span>
                </div>
                <div className="os-nl-email">
                  <div className="os-nl-mast">The Remedae Journal</div>
                  <div className="os-nl-hero" />
                  <div className="os-nl-cat">Sleep · 5 min read</div>
                  <h2>{PIECES[0].title}</h2>
                  <p className="os-nl-dek">{PIECES[0].dek}</p>
                  <p className="os-nl-p">Hi, {sendAs === 'maria' ? 'Maria here. ' : ''}three pieces from the shelf this week. Sit with one over tea; the rest keep.</p>
                  {PIECES.slice(1).map((p) => (
                    <div key={p.title} className="os-nl-card"><div className="os-nl-thumb" /><div><div className="os-nl-cat">{p.cat} · {p.mins} min</div><b>{p.title}</b><span>{p.dek}</span></div></div>
                  ))}
                  <div className="os-nl-btn">Open the journal</div>
                  <div className="os-nl-foot">You get this because you asked for pieces as they land. Unsubscribe any time.</div>
                </div>
              </div>

              {/* Before it goes */}
              <aside className="os-tasks">
                <h4>Before it goes</h4>
                <div className="os-task" data-state="done"><i /><span>Subject<small><input className="os-nl-input" value={subject} onChange={(e) => setSubject(e.target.value)} /></small></span></div>
                <div className="os-task" data-state="done"><i /><span>To 412 readers<small>Remedae Journal list · 3 unsubscribed this week</small></span></div>
                <div className="os-task" data-state="approval"><i /><span>Send as<small><span className="os-chips" style={{ marginTop: 6 }}><button className="os-chip" data-primary={sendAs === 'journal' ? '1' : undefined} onClick={() => setSendAs('journal')}>The Journal</button><button className="os-chip" data-primary={sendAs === 'maria' ? '1' : undefined} onClick={() => setSendAs('maria')}>Maria</button></span></small></span></div>
                <div className="os-task" data-state="done"><i /><span>Thursday, 8:00<small>Best open time for this list · change by asking</small></span></div>
                <div className="os-task" data-state="working"><i /><span>Your approval<small>Nothing sends until you say so</small></span></div>
                <h4 style={{ marginTop: 18 }}>Versions</h4>
                <div className="os-task" data-state="done"><i /><span>Draft 3<small>Editor tightened the intro · 2h ago</small></span></div>
                <div className="os-task" data-state="done"><i /><span>Draft 2<small>Counsel softened the ginger claim · yesterday</small></span></div>
                <div className="os-task" data-state="done"><i /><span>Draft 1<small>From this week's published pieces · Monday</small></span></div>
              </aside>
            </div>
          </div>
        </div>
      </div>

      <div className="os-ground" aria-hidden />
      {note && <div className="os-compose-note" role="status">{note}</div>}
      <form className="os-compose" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); if (text.trim()) say(text.trim()) }}>
        <label className="os-compose-copy">
          <small>Chat with Editor-in-chief</small>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Tell the editor what to change" />
        </label>
        <button type="submit" className="os-send" disabled={!text.trim()} aria-label="Send">{I.arrow}</button>
      </form>
    </div>
  )
}

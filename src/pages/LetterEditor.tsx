import { useEffect, useMemo, useRef, useState } from 'react'
import EditorShell from '../components/EditorShell'
import { useAuth } from '../lib/auth'
import { useBrand } from '../lib/brandContext'
import { supabase } from '../lib/supabase'
import { renderSiteEmail, sendSiteEmail } from '../lib/hhSite'

/* The Letter: Hue & Heal's monthly newsletter, in the website's own email
   design. The copilot holds the issue's words; the site renders them
   (netlify/lib/letter.mjs in the website repo), so the email always matches
   the site. Sent to the Hue & Heal newsletter list, one email per person with
   their own unsubscribe link. Drafts live in newsletters (template
   'site-letter'). */

type Room = 'studio' | 'lab' | 'mind'
interface Issue {
  number: number; month: string; subject: string; preheader: string; title: string; standfirst: string
  note: { paragraphs: string[]; signoff: string }
  essayId: string
  rooms: Record<Room, { title: string; text: string; url: string; cta: string }>
  try: { title: string; text: string }
  research: { title: string; text: string; url: string; cta: string }
  quote: { text: string; by: string }
  cta: { label: string; url: string }
}
interface Piece { id: string; title: string; dek: string; slug: string; hero_image: string; reading_time: string; published_at: string | null }

const month = () => new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
const emptyRoom = { title: '', text: '', url: '', cta: '' }
const blankIssue = (n: number): Issue => ({
  number: n, month: month(), subject: '', preheader: '', title: '', standfirst: '',
  note: { paragraphs: [], signoff: 'Maria' }, essayId: '',
  rooms: { studio: { ...emptyRoom, url: '/studio' }, lab: { ...emptyRoom, url: '/lab' }, mind: { ...emptyRoom, url: '/mind' } },
  try: { title: '', text: '' }, research: { title: '', text: '', url: '', cta: '' }, quote: { text: '', by: '' }, cta: { label: '', url: '' },
})

const inp: React.CSSProperties = { width: '100%', border: '1px solid var(--ck-line)', background: 'var(--ck-surface)', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'var(--ck-font)', boxSizing: 'border-box' }
const rail: React.CSSProperties = { fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ck-faint)', margin: '22px 0 10px' }
const hint: React.CSSProperties = { fontSize: 11.5, color: 'var(--ck-faint)', margin: '4px 0 0', lineHeight: 1.45 }
const btn: React.CSSProperties = { background: 'none', border: '1px solid var(--ck-line)', borderRadius: 999, padding: '9px 16px', fontSize: 12.5, cursor: 'pointer' }
const primary: React.CSSProperties = { ...btn, background: 'var(--ck-accent)', borderColor: 'var(--ck-accent)', color: 'var(--hh-on-accent, #10140F)', fontWeight: 500 }

function Field({ label, value, onChange, placeholder, area, rows = 3, max }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; area?: boolean; rows?: number; max?: number }) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <span style={{ display: 'block', fontSize: 12, color: 'var(--ck-muted)', marginBottom: 4 }}>{label}{max ? <span style={{ color: value.length > max ? '#B4491A' : 'var(--ck-faint)' }}> · {value.length}/{max}</span> : null}</span>
      {area
        ? <textarea value={value} rows={rows} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
        : <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={inp} />}
    </label>
  )
}

/* The issue, in the site renderer's field shape. Empty sections are left out. */
function toRendererData(i: Issue, essay: Piece | undefined) {
  const has = (o: Record<string, string>) => Object.values(o).some((v) => v.trim())
  const rooms = (Object.keys(i.rooms) as Room[]).filter((r) => i.rooms[r].title.trim() || i.rooms[r].text.trim()).map((r) => ({ room: r, ...i.rooms[r] }))
  return {
    number: i.number, month: i.month, title: i.title, standfirst: i.standfirst,
    ...(i.subject.trim() ? { subject: i.subject } : {}), ...(i.preheader.trim() ? { preheader: i.preheader } : {}),
    ...(i.note.paragraphs.some((p) => p.trim()) ? { note: { paragraphs: i.note.paragraphs.filter((p) => p.trim()), signoff: i.note.signoff || 'Maria' } } : {}),
    ...(essay ? { essay: { kicker: 'The essay', title: essay.title, dek: essay.dek, image: essay.hero_image || undefined, url: `/journal/${essay.slug}`, readingTime: essay.reading_time || undefined, author: 'Maria Valiji' } } : {}),
    ...(rooms.length ? { rooms } : {}),
    ...(has(i.try) ? { try: i.try } : {}),
    ...(has(i.research) ? { research: i.research } : {}),
    ...(i.quote.text.trim() ? { quote: i.quote.by.trim() ? i.quote : { text: i.quote.text } } : {}),
    ...(i.cta.label.trim() && i.cta.url.trim() ? { cta: i.cta } : {}),
  }
}

export default function LetterEditor() {
  const auth = useAuth()
  const { current: brand } = useBrand()
  const [issue, setIssue] = useState<Issue>(blankIssue(1))
  const [draftId, setDraftId] = useState<string | null>(null)
  const [pieces, setPieces] = useState<Piece[]>([])
  const [listSize, setListSize] = useState<number | null>(null)
  const [html, setHtml] = useState('')
  const [subject, setSubject] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const timer = useRef<number>(0)
  const touched = useRef(false)
  const isHueHeal = /hue\s*&\s*heal/i.test(brand?.name ?? '')

  useEffect(() => {
    if (!supabase || !brand?.id) return
    void (async () => {
      const [{ data: pub }, { data: nl }, { count }] = await Promise.all([
        supabase!.from('journal_articles').select('id, title, dek, slug, hero_image, reading_time, published_at').eq('brand_id', brand.id).eq('status', 'published').order('published_at', { ascending: false }).limit(30),
        supabase!.from('newsletters' as never).select('id, status, blocks, created_at').eq('brand_id', brand.id).eq('template', 'site-letter').order('created_at', { ascending: false }).limit(40),
        supabase!.from('subscribers').select('id', { count: 'exact', head: true }).eq('brand_id', brand.id).eq('status', 'subscribed').contains('groups', ['newsletter']),
      ])
      setPieces((pub ?? []) as Piece[])
      setListSize(count ?? 0)
      const rows = (nl ?? []) as { id: string; status: string; blocks: { issue?: Issue }[] }[]
      const sent = rows.filter((r) => r.status === 'sent').length
      const draft = rows.find((r) => r.status === 'draft')
      // Never overwrite words typed while this was loading.
      if (draft?.blocks?.[0]?.issue) { setDraftId(draft.id); if (!touched.current) setIssue({ ...blankIssue(sent + 1), ...draft.blocks[0].issue }) }
      else if (!touched.current) setIssue(blankIssue(sent + 1))
      else setIssue((i) => ({ ...i, number: sent + 1 }))
    })()
  }, [brand?.id])

  const essay = pieces.find((p) => p.id === issue.essayId)
  const data = useMemo(() => toRendererData(issue, essay), [issue, essay])
  const ready = issue.title.trim() && issue.standfirst.trim()

  /* The preview is the real email from the site, refreshed as you type. */
  useEffect(() => {
    if (!ready) { setHtml(''); return }
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      const r = await renderSiteEmail('letter', data)
      if (r.error) { setStatus(r.error); return }
      setHtml(r.html ?? ''); setSubject(r.subject ?? '')
    }, 700)
    return () => window.clearTimeout(timer.current)
  }, [data, ready])

  const set = (patch: Partial<Issue>) => { touched.current = true; setIssue((i) => ({ ...i, ...patch })) }
  const setRoom = (r: Room, patch: Partial<Issue['rooms'][Room]>) => { touched.current = true; setIssue((i) => ({ ...i, rooms: { ...i.rooms, [r]: { ...i.rooms[r], ...patch } } })) }

  async function save(): Promise<void> {
    if (!supabase || !brand?.id) return
    setBusy(true)
    const row = { brand_id: brand.id, subject: subject || issue.title, preheader: issue.preheader, template: 'site-letter', blocks: [{ type: 'site-email', issue }], status: 'draft' }
    const t = supabase.from('newsletters' as never)
    const res = draftId
      ? await t.update(row as never).eq('id', draftId).select('id').single()
      : await t.insert(row as never).select('id').single()
    setBusy(false)
    if (res.error) { setStatus(`Couldn’t save: ${res.error.message}`); return }
    setDraftId((res.data as { id: string }).id); setStatus('Draft saved')
  }
  async function send(mode: 'test' | 'list') {
    if (!ready) { setStatus('Give the issue a title and a standfirst first.'); return }
    if (mode === 'list' && !window.confirm(`Send No. ${issue.number} to ${listSize ?? 'everyone on'} ${listSize === 1 ? 'subscriber' : 'subscribers'} on the newsletter list now?`)) return
    setBusy(true); setStatus(mode === 'test' ? 'Sending you a test…' : 'Sending the Letter…')
    const r = await sendSiteEmail('letter', data, mode)
    setBusy(false)
    if (r.error && !r.sent) { setStatus(`Not sent: ${r.error}`); return }
    if (mode === 'test') { setStatus(`Test sent to ${r.sentTo}. Check it in Gmail, Apple Mail and Outlook before the list.`); return }
    if (draftId && supabase) await supabase.from('newsletters' as never).delete().eq('id', draftId).eq('status', 'draft')
    setDraftId(null); setIssue(blankIssue(issue.number + 1))
    setStatus(`Sent to ${r.sent} ${r.sent === 1 ? 'subscriber' : 'subscribers'}.${r.error ? ` Some did not send: ${r.error}` : ''}`)
  }

  if (!auth.session) return <EditorShell ctype="The Letter" subline="Sign in to write the Letter" onDone={() => {}} doneDisabled rail={<p style={{ fontSize: 14, color: 'var(--ck-muted)' }}>Sign in (bottom-left) to write the Letter.</p>} canvas={<div />} />
  if (!isHueHeal) return <EditorShell ctype="The Letter" subline={brand?.name ?? ''} onDone={() => {}} doneDisabled rail={<p style={{ fontSize: 14, color: 'var(--ck-muted)' }}>The Letter is Hue & Heal’s. Switch to Hue & Heal in the workspace switcher.</p>} canvas={<div />} />

  const railEl = (
    <div>
      <p style={{ fontSize: 13.5, color: 'var(--ck-muted)', lineHeight: 1.5, margin: '0 0 6px' }}>
        No. {issue.number} · {listSize === null ? '…' : `${listSize} on the newsletter list`}. Written here, designed by the website.
      </p>

      <div style={rail}>The issue</div>
      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8 }}>
        <Field label="No." value={String(issue.number)} onChange={(v) => set({ number: Math.max(1, Number(v.replace(/\D/g, '')) || 1) })} />
        <Field label="Month" value={issue.month} onChange={(v) => set({ month: v })} />
      </div>
      <Field label="Title" value={issue.title} onChange={(v) => set({ title: v })} placeholder="A short line, sentence case" max={80} />
      <Field label="Standfirst" value={issue.standfirst} onChange={(v) => set({ standfirst: v })} placeholder="One or two sentences on what is inside" area rows={2} max={220} />
      <Field label="Subject (optional)" value={issue.subject} onChange={(v) => set({ subject: v })} placeholder={`The Letter: ${issue.title || '…'}`} />
      <Field label="Inbox preview (optional)" value={issue.preheader} onChange={(v) => set({ preheader: v })} placeholder="Under 90 characters; defaults to the standfirst" max={90} />

      <div style={rail}>A note from Maria</div>
      <Field label="Two short paragraphs, a blank line between" value={issue.note.paragraphs.join('\n\n')} onChange={(v) => set({ note: { ...issue.note, paragraphs: v.split(/\n{2,}/) } })} area rows={5} />
      <Field label="Signed" value={issue.note.signoff} onChange={(v) => set({ note: { ...issue.note, signoff: v } })} />

      <div style={rail}>The essay</div>
      <select value={issue.essayId} onChange={(e) => set({ essayId: e.target.value })} style={inp}>
        <option value="">{pieces.length ? 'Choose a published Journal piece' : 'No published Journal pieces yet'}</option>
        {pieces.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
      </select>
      {essay && !essay.hero_image && <p style={hint}>This piece has no hero image, so the email uses the default.</p>}

      <div style={rail}>From the rooms</div>
      <p style={{ ...hint, marginTop: -4, marginBottom: 8 }}>Only fill a room when there is something real to say.</p>
      {(['studio', 'lab', 'mind'] as Room[]).map((r) => (
        <details key={r} style={{ marginBottom: 8 }} open={!!issue.rooms[r].title}>
          <summary style={{ fontSize: 13, cursor: 'pointer', marginBottom: 8, textTransform: 'capitalize' }}>{r}</summary>
          <Field label="Title" value={issue.rooms[r].title} onChange={(v) => setRoom(r, { title: v })} />
          <Field label="Text" value={issue.rooms[r].text} onChange={(v) => setRoom(r, { text: v })} area rows={2} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Field label="Link" value={issue.rooms[r].url} onChange={(v) => setRoom(r, { url: v })} />
            <Field label="Button" value={issue.rooms[r].cta} onChange={(v) => setRoom(r, { cta: v })} placeholder="Read more" />
          </div>
        </details>
      ))}

      <div style={rail}>Try this</div>
      <Field label="Title" value={issue.try.title} onChange={(v) => set({ try: { ...issue.try, title: v } })} placeholder="One design idea from a recent piece" />
      <Field label="Text" value={issue.try.text} onChange={(v) => set({ try: { ...issue.try, text: v } })} area rows={2} />

      <div style={rail}>Research (optional)</div>
      <Field label="Title" value={issue.research.title} onChange={(v) => set({ research: { ...issue.research, title: v } })} placeholder="e.g. The wellness design forecast" />
      <Field label="Text" value={issue.research.text} onChange={(v) => set({ research: { ...issue.research, text: v } })} area rows={2} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field label="Link" value={issue.research.url} onChange={(v) => set({ research: { ...issue.research, url: v } })} placeholder="/reports/…" />
        <Field label="Button" value={issue.research.cta} onChange={(v) => set({ research: { ...issue.research, cta: v } })} placeholder="Read the report" />
      </div>

      <div style={rail}>A line to end on</div>
      <Field label="Quote" value={issue.quote.text} onChange={(v) => set({ quote: { ...issue.quote, text: v } })} area rows={2} />
      <Field label="By (only if it is real)" value={issue.quote.by} onChange={(v) => set({ quote: { ...issue.quote, by: v } })} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field label="Closing button" value={issue.cta.label} onChange={(v) => set({ cta: { ...issue.cta, label: v } })} placeholder="Start a project" />
        <Field label="Link" value={issue.cta.url} onChange={(v) => set({ cta: { ...issue.cta, url: v } })} placeholder="/contact" />
      </div>

      <div style={rail}>Send</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="hh-btn" style={btn} disabled={busy} onClick={() => void save()}>Save draft</button>
        <button className="hh-btn" style={btn} disabled={busy || !ready} onClick={() => void send('test')}>Send me a test</button>
        <button className="hh-btn" style={{ ...primary, opacity: busy || !ready || !listSize ? 0.55 : 1 }} disabled={busy || !ready || !listSize} onClick={() => void send('list')}>Send to the list</button>
      </div>
      <p style={hint}>One email per person, each with their own unsubscribe link. House style: British English, sentence case, no dashes or exclamation marks.</p>
    </div>
  )

  const canvas = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10 }}>
      {subject && <div style={{ fontSize: 12.5, color: 'var(--ck-muted)' }}>Subject: <b style={{ color: 'var(--ck-ink)', fontWeight: 500 }}>{subject}</b></div>}
      {html
        ? <iframe title="The Letter, as subscribers will see it" srcDoc={html} sandbox="" style={{ flex: 1, minHeight: 720, width: '100%', border: '1px solid var(--ck-line)', borderRadius: 12, background: '#0a0d17' }} />
        : <div style={{ flex: 1, minHeight: 420, display: 'grid', placeItems: 'center', border: '1px dashed var(--ck-line)', borderRadius: 12, color: 'var(--ck-faint)', fontSize: 14, textAlign: 'center', padding: 24 }}>Add a title and a standfirst to see the Letter exactly as it will arrive.</div>}
    </div>
  )

  return <EditorShell ctype="The Letter" subline={`Hue & Heal · No. ${issue.number}`} status={status} busy={busy} onNew={() => { setDraftId(null); setIssue(blankIssue(issue.number)); setStatus(null) }} onDone={() => void save()} doneLabel="Save" rail={railEl} canvas={canvas} railWidth={420} />
}

import { useEffect, useState } from 'react'
import PageHeader, { PillButton } from '../components/PageHeader'
import ConfirmButton from '../components/ConfirmButton'
import { useAuth } from '../lib/auth'
import { useBrand } from '../lib/brandContext'
import {
  type JournalArticle,
  generateJournal,
  journalToMarkdown,
  slugify,
  listJournal,
  saveJournal,
  updateJournal,
  deleteJournal,
} from '../lib/journal'

const inp: React.CSSProperties = { width: '100%', border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 8, padding: '9px 11px', fontSize: 13.5, fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }
const rail: React.CSSProperties = { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', margin: '18px 0 8px' }

export default function Journal() {
  const auth = useAuth()
  const { current: brand } = useBrand()
  const gated = auth.mode === 'connected' && !auth.session

  const [aiTopic, setAiTopic] = useState('')
  const [aiNotes, setAiNotes] = useState('')
  const [aiBusy, setAiBusy] = useState(false)

  const [currentId, setCurrentId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [dek, setDek] = useState('')
  const [readingTime, setReadingTime] = useState('')
  const [body, setBody] = useState('')
  const [takeaways, setTakeaways] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [articles, setArticles] = useState<JournalArticle[]>([])

  async function reload() {
    if (gated) return
    try { setArticles(await listJournal()) } catch { /* ignore */ }
  }
  useEffect(() => { reload() /* eslint-disable-next-line */ }, [auth.session, auth.mode, brand?.id])

  async function write() {
    if (!aiTopic.trim()) return
    setAiBusy(true); setStatus(null)
    const { result, error } = await generateJournal({
      topic: aiTopic,
      notes: aiNotes,
      brandName: brand?.name,
      toneOfVoice: brand?.tone_of_voice,
      writingGuidelines: brand?.writing_guidelines,
    })
    setAiBusy(false)
    if (error || !result) { setStatus(error ?? 'Could not write the article'); return }
    setTitle(result.title)
    setDek(result.dek)
    setReadingTime(result.readingTime ?? '')
    setBody(journalToMarkdown(result))
    setTakeaways((result.takeaways ?? []).join('\n'))
    setCurrentId(null)
    setStatus('Draft ready — edit anything below.')
  }

  function blank() {
    setCurrentId(null); setTitle(''); setDek(''); setReadingTime(''); setBody(''); setTakeaways(''); setStatus(null)
  }
  function openArticle(a: JournalArticle) {
    setCurrentId(a.id); setTitle(a.title); setDek(a.dek); setReadingTime(a.reading_time)
    setBody(a.body_md); setTakeaways((a.takeaways ?? []).join('\n')); setStatus(null)
  }

  async function save() {
    setBusy(true); setStatus(null)
    const payload = {
      title, dek, reading_time: readingTime, body_md: body,
      takeaways: takeaways.split('\n').map((s) => s.trim()).filter(Boolean),
      slug: slugify(title || 'untitled'),
    }
    try {
      if (currentId) { await updateJournal(currentId, payload); setStatus('Saved') }
      else { const a = await saveJournal(payload); setCurrentId(a.id); setStatus('Saved to drafts') }
      await reload()
    } catch (e) { setStatus(`Couldn’t save: ${e instanceof Error ? e.message : e}`) } finally { setBusy(false) }
  }
  async function del(id: string) { await deleteJournal(id); if (currentId === id) blank(); await reload() }

  const takeawayList = takeaways.split('\n').map((s) => s.trim()).filter(Boolean)

  return (
    <>
      <PageHeader
        eyebrow="Publishing"
        title="Journal"
        subtitle="Write a full design-led journal piece in the studio voice, ready to publish to the website Journal."
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {status && <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{status}</span>}
            <PillButton tone="ghost" onClick={blank}>New</PillButton>
            <PillButton tone="ink" onClick={save} disabled={busy || !title.trim()}>{busy ? '…' : currentId ? 'Save' : 'Save draft'}</PillButton>
          </div>
        }
      />

      <div style={{ padding: '24px 40px' }}>
        {gated ? (
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Sign in (bottom-left) to write and save articles.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start' }}>
            {/* ---- Editor ---- */}
            <div>
              <div style={{ border: '1px solid var(--hh-line)', borderRadius: 12, padding: 14, background: 'var(--hh-bone)' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-accent)', marginBottom: 8 }}>✦ Write the article</div>
                <input style={{ ...inp, marginBottom: 8 }} value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="Topic — e.g. designing calm into a waiting room" onKeyDown={(e) => { if (e.key === 'Enter') write() }} />
                <textarea style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} rows={3} value={aiNotes} onChange={(e) => setAiNotes(e.target.value)} placeholder="Notes, angles, references, anything to work from (optional)" />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <button className="hh-btn" onClick={write} disabled={aiBusy || !aiTopic.trim()} style={{ background: 'var(--hh-copper)', color: 'var(--hh-on-accent, #F6EFE4)', border: 'none', borderRadius: 999, padding: '9px 18px', fontSize: 12.5, cursor: aiBusy || !aiTopic.trim() ? 'default' : 'pointer', opacity: aiBusy || !aiTopic.trim() ? 0.55 : 1 }}>
                    {aiBusy ? 'Writing… (20–40s)' : 'Write article'}
                  </button>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>Design thinking + behavioural psychology, in {brand?.name ?? 'the brand'}’s voice.</span>
                </div>
              </div>

              <label style={rail}>Title</label>
              <input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Article title" />
              <label style={rail}>Standfirst</label>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={dek} onChange={(e) => setDek(e.target.value)} placeholder="One or two line intro" />
              <label style={rail}>Reading time</label>
              <input style={inp} value={readingTime} onChange={(e) => setReadingTime(e.target.value)} placeholder="6 min read" />
              <label style={rail}>Body (markdown · ## for headings)</label>
              <textarea style={{ ...inp, resize: 'vertical', lineHeight: 1.6, fontFamily: 'var(--font-mono, monospace)', fontSize: 12.5 }} rows={16} value={body} onChange={(e) => setBody(e.target.value)} placeholder="## Section heading&#10;&#10;Paragraphs…" />
              <label style={rail}>Key design takeaways (one per line)</label>
              <textarea style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} rows={4} value={takeaways} onChange={(e) => setTakeaways(e.target.value)} placeholder="One takeaway per line" />

              <div style={{ marginTop: 12, padding: '10px 12px', border: '1px dashed var(--hh-line)', borderRadius: 10, fontSize: 12, color: 'var(--text-faint)' }}>
                Publishing to the website goes live with the new Hue &amp; Heal site. Until then, save drafts here and they’ll be ready to push.
              </div>

              {articles.length > 0 && (
                <>
                  <label style={rail}>Articles · {articles.length}</label>
                  <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {articles.map((a) => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--hh-line)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || 'Untitled'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{a.status === 'published' ? 'Published' : 'Draft'}</div>
                        </div>
                        <button className="hh-btn" onClick={() => openArticle(a)} style={{ background: 'none', border: 'none', color: 'var(--hh-copper)', fontSize: 12 }}>Open</button>
                        <ConfirmButton onConfirm={() => del(a.id)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 15, lineHeight: 1, cursor: 'pointer' }}>×</ConfirmButton>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ---- Preview ---- */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 8 }}>Preview</div>
              <article style={{ background: 'var(--hh-paper, #FBFAF6)', border: '1px solid var(--hh-line-card, var(--hh-line))', borderRadius: 12, padding: '40px 44px', maxWidth: 720 }}>
                {readingTime && <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-accent)', marginBottom: 14 }}>{readingTime}</div>}
                <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 34, lineHeight: 1.15, color: 'var(--text-strong)', margin: '0 0 12px' }}>{title || 'Your article title'}</h1>
                {dek && <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 18, lineHeight: 1.5, color: 'var(--text-muted)', margin: '0 0 24px' }}>{dek}</p>}
                <div>
                  {body.split(/\n{2,}/).map((blk, i) => {
                    const t = blk.trim()
                    if (!t) return null
                    if (t.startsWith('## ')) return <h2 key={i} style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 23, lineHeight: 1.25, color: 'var(--text-strong)', margin: '30px 0 10px' }}>{t.replace(/^##\s*/, '')}</h2>
                    return <p key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: 1.85, color: 'var(--text-body)', margin: '0 0 16px', whiteSpace: 'pre-line' }}>{t}</p>
                  })}
                </div>
                {takeawayList.length > 0 && (
                  <div style={{ marginTop: 28, padding: '22px 24px', background: 'var(--hh-bone)', borderRadius: 12 }}>
                    <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-accent)', marginBottom: 12 }}>Key design takeaways</div>
                    <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {takeawayList.map((t, i) => <li key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.6, color: 'var(--text-body)' }}>{t}</li>)}
                    </ol>
                  </div>
                )}
              </article>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader, { PillButton } from '../components/PageHeader'
import ConfirmButton from '../components/ConfirmButton'
import { useAuth } from '../lib/auth'
import { useBrand } from '../lib/brandContext'
import { useDraft } from '../lib/useDraft'
import { useIsMobile } from '../lib/useIsMobile'
import { type Block, bid } from '../lib/newsletter'
import {
  type JournalArticle,
  generateJournal,
  journalToBlocks,
  blocksToText,
  uploadJournalImage,
  slugify,
  listJournal,
  saveJournal,
  updateJournal,
  deleteJournal,
  createNewsletterFromArticle,
} from '../lib/journal'

const inp: React.CSSProperties = { width: '100%', border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 8, padding: '9px 11px', fontSize: 13.5, fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }
const rail: React.CSSProperties = { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', margin: '18px 0 8px' }
const miniBtn: React.CSSProperties = { background: 'none', border: '1px solid var(--hh-line)', borderRadius: 6, width: 24, height: 22, color: 'var(--text-faint)', fontSize: 12, lineHeight: 1, cursor: 'pointer' }
const segWrap: React.CSSProperties = { display: 'flex', gap: 6, background: 'var(--hh-bone)', border: '1px solid var(--hh-line)', borderRadius: 999, padding: 4, marginBottom: 14 }
const seg = (active: boolean): React.CSSProperties => ({ flex: 1, textAlign: 'center', padding: '9px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: active ? 'var(--hh-anthracite)' : 'transparent', color: active ? 'var(--text-on-ink)' : 'var(--text-muted)' })

export default function Journal() {
  const auth = useAuth()
  const { current: brand } = useBrand()
  const nav = useNavigate()
  const isMobile = useIsMobile()
  const gated = auth.mode === 'connected' && !auth.session

  const [aiTopic, setAiTopic] = useState('')
  const [aiNotes, setAiNotes] = useState('')
  const [aiBusy, setAiBusy] = useState(false)

  const [currentId, setCurrentId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [dek, setDek] = useState('')
  const [readingTime, setReadingTime] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [takeaways, setTakeaways] = useState('')
  const [mView, setMView] = useState<'edit' | 'preview'>('edit')
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [articles, setArticles] = useState<JournalArticle[]>([])

  async function reload() {
    if (gated) return
    try { setArticles(await listJournal()) } catch { /* ignore */ }
  }
  useEffect(() => { reload() /* eslint-disable-next-line */ }, [auth.session, auth.mode, brand?.id])

  // Autosave the editor buffer so an in-app tab switch never loses work.
  useDraft(
    `hh-journal-draft:${brand?.id ?? 'x'}`,
    { currentId, title, dek, readingTime, blocks, takeaways },
    (v) => {
      setCurrentId(v.currentId ?? null); setTitle(v.title ?? ''); setDek(v.dek ?? '')
      setReadingTime(v.readingTime ?? ''); setBlocks(Array.isArray(v.blocks) ? v.blocks : []); setTakeaways(v.takeaways ?? '')
    },
    !gated,
  )

  async function write() {
    if (!aiTopic.trim()) return
    setAiBusy(true); setStatus(null)
    const { result, error } = await generateJournal({ topic: aiTopic, notes: aiNotes, brandName: brand?.name, toneOfVoice: brand?.tone_of_voice, writingGuidelines: brand?.writing_guidelines })
    setAiBusy(false)
    if (error || !result) { setStatus(error ?? 'Could not write the article'); return }
    setTitle(result.title); setDek(result.dek); setReadingTime(result.readingTime ?? '')
    setBlocks(journalToBlocks(result))
    setTakeaways((result.takeaways ?? []).join('\n'))
    setCurrentId(null)
    setStatus('Draft ready — reorder, edit, add images.')
  }

  /* block ops (same model as the newsletter, so the two surfaces match) */
  const setBlock = (id: string, patch: Partial<Block>) => setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } as Block : b)))
  const removeBlock = (id: string) => setBlocks((bs) => bs.filter((b) => b.id !== id))
  const moveBlock = (i: number, dir: -1 | 1) => setBlocks((bs) => { const j = i + dir; if (j < 0 || j >= bs.length) return bs; const c = [...bs]; [c[i], c[j]] = [c[j], c[i]]; return c })
  function addBlock(type: 'heading' | 'text' | 'image') {
    const b: Block = type === 'heading' ? { id: bid(), type, text: 'Section heading' } : type === 'text' ? { id: bid(), type, text: 'Write…' } : { id: bid(), type: 'image', url: '', alt: '' }
    setBlocks((bs) => [...bs, b])
  }
  async function uploadBlockImage(id: string, file: File) {
    setUploadingId(id); setStatus('Uploading image…')
    const { url, error } = await uploadJournalImage(file)
    setUploadingId(null)
    if (error || !url) { setStatus(`Upload failed: ${error ?? ''}`); return }
    setBlock(id, { url }); setStatus('Image added')
  }

  function blank() { setCurrentId(null); setTitle(''); setDek(''); setReadingTime(''); setBlocks([]); setTakeaways(''); setStatus(null) }
  function openArticle(a: JournalArticle) {
    setCurrentId(a.id); setTitle(a.title); setDek(a.dek); setReadingTime(a.reading_time)
    setBlocks(Array.isArray(a.blocks) && a.blocks.length ? (a.blocks as unknown as Block[]) : [])
    setTakeaways((a.takeaways ?? []).join('\n')); setStatus(null)
  }

  const takeawayList = takeaways.split('\n').map((s) => s.trim()).filter(Boolean)
  function payload() {
    return {
      title, dek, reading_time: readingTime,
      blocks: blocks as unknown[],
      body_md: blocksToText(blocks),
      takeaways: takeawayList,
      slug: slugify(title || 'untitled'),
    }
  }

  async function save(): Promise<string | null> {
    setBusy(true); setStatus(null)
    try {
      if (currentId) { await updateJournal(currentId, payload()); setStatus('Saved'); await reload(); return currentId }
      const a = await saveJournal(payload()); setCurrentId(a.id); setStatus('Saved to drafts'); await reload(); return a.id
    } catch (e) { setStatus(`Couldn’t save: ${e instanceof Error ? e.message : e}`); return null } finally { setBusy(false) }
  }
  async function del(id: string) { await deleteJournal(id); if (currentId === id) blank(); await reload() }

  async function createNewsletter() {
    if (!title.trim() || !blocks.length) { setStatus('Write the article first'); return }
    setBusy(true); setStatus('Writing the teaser…')
    try {
      const id = await save() // ensure it exists so the link is stable
      if (!id) return
      const { id: nlId, error } = await createNewsletterFromArticle({ slug: slugify(title || 'untitled'), title, dek, body_md: blocksToText(blocks) }, brand)
      if (error || !nlId) { setStatus(`Couldn’t create newsletter: ${error ?? ''}`); return }
      nav(`/newsletter?open=${nlId}`)
    } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader
        eyebrow="Publishing"
        title="Journal"
        subtitle="Write and lay out a design-led journal piece, then turn it into a newsletter that drives readers to it."
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {status && <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{status}</span>}
            <PillButton tone="ghost" onClick={blank}>New</PillButton>
            <PillButton tone="ghost" onClick={save} disabled={busy || !title.trim()}>{busy ? '…' : currentId ? 'Save' : 'Save draft'}</PillButton>
            <PillButton tone="ink" onClick={createNewsletter} disabled={busy || !title.trim() || !blocks.length}>✉ Create newsletter</PillButton>
          </div>
        }
      />

      <div style={{ padding: isMobile ? '16px' : '24px 40px' }}>
        {gated ? (
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Sign in (bottom-left) to write and save articles.</p>
        ) : (
          <>
            {isMobile && (
              <div style={segWrap}>
                <button onClick={() => setMView('edit')} style={seg(mView === 'edit')}>Edit</button>
                <button onClick={() => setMView('preview')} style={seg(mView === 'preview')}>Preview</button>
              </div>
            )}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '360px 1fr', gap: 24, alignItems: 'start' }}>
            {/* ---- Editor ---- */}
            <div style={{ display: isMobile && mView !== 'edit' ? 'none' : undefined }}>
              <div style={{ border: '1px solid var(--hh-line)', borderRadius: 12, padding: 14, background: 'var(--hh-bone)' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-accent)', marginBottom: 8 }}>✦ Write the article</div>
                <input style={{ ...inp, marginBottom: 8 }} value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="Topic — e.g. designing calm into a waiting room" onKeyDown={(e) => { if (e.key === 'Enter') write() }} />
                <textarea style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} rows={3} value={aiNotes} onChange={(e) => setAiNotes(e.target.value)} placeholder="Notes, angles, references (optional)" />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <button className="hh-btn" onClick={write} disabled={aiBusy || !aiTopic.trim()} style={{ background: 'var(--hh-copper)', color: 'var(--hh-on-accent, #F6EFE4)', border: 'none', borderRadius: 999, padding: '9px 18px', fontSize: 12.5, cursor: aiBusy || !aiTopic.trim() ? 'default' : 'pointer', opacity: aiBusy || !aiTopic.trim() ? 0.55 : 1 }}>
                    {aiBusy ? 'Writing… (20–40s)' : 'Write article'}
                  </button>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>Design-led, in {brand?.name ?? 'the brand'}’s voice.</span>
                </div>
              </div>

              <label style={rail}>Title</label>
              <input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Article title" />
              <label style={rail}>Standfirst</label>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={dek} onChange={(e) => setDek(e.target.value)} placeholder="One or two line intro" />
              <label style={rail}>Reading time</label>
              <input style={inp} value={readingTime} onChange={(e) => setReadingTime(e.target.value)} placeholder="6 min read" />

              <label style={rail}>Sections</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {blocks.map((b, i) => (
                  <div key={b.id} style={{ border: '1px solid var(--hh-line)', borderRadius: 10, padding: 10, background: 'var(--hh-bone)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', flex: 1 }}>{b.type}</span>
                      <button className="hh-btn" onClick={() => moveBlock(i, -1)} style={miniBtn} title="Move up">↑</button>
                      <button className="hh-btn" onClick={() => moveBlock(i, 1)} style={miniBtn} title="Move down">↓</button>
                      <ConfirmButton onConfirm={() => removeBlock(b.id)} style={{ ...miniBtn, border: 'none' }}>×</ConfirmButton>
                    </div>
                    {b.type === 'heading' && <input style={inp} value={b.text} onChange={(e) => setBlock(b.id, { text: e.target.value })} />}
                    {b.type === 'text' && <textarea style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} rows={5} value={b.text} onChange={(e) => setBlock(b.id, { text: e.target.value })} />}
                    {b.type === 'image' && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {b.url && <img src={b.url} alt="" style={{ height: 38, width: 38, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--hh-line)' }} />}
                          <label className="hh-btn" style={{ ...miniBtn, width: 'auto', padding: '8px 12px', flex: 1, textAlign: 'center', cursor: uploadingId === b.id ? 'default' : 'pointer', opacity: uploadingId === b.id ? 0.6 : 1 }}>
                            {uploadingId === b.id ? 'Uploading…' : b.url ? 'Replace image' : '⭱ Upload image'}
                            <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingId === b.id} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBlockImage(b.id, f); e.currentTarget.value = '' }} />
                          </label>
                        </div>
                        <input style={{ ...inp, marginTop: 6, fontSize: 12 }} placeholder="Caption / alt text" value={b.alt ?? ''} onChange={(e) => setBlock(b.id, { alt: e.target.value })} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {(['heading', 'text', 'image'] as const).map((t) => (
                  <button key={t} className="hh-btn" onClick={() => addBlock(t)} style={{ ...miniBtn, width: 'auto', padding: '6px 10px', fontSize: 11.5 }}>＋ {t}</button>
                ))}
              </div>

              <label style={rail}>Key design takeaways (one per line)</label>
              <textarea style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} rows={4} value={takeaways} onChange={(e) => setTakeaways(e.target.value)} placeholder="One takeaway per line" />

              <div style={{ marginTop: 12, padding: '10px 12px', border: '1px dashed var(--hh-line)', borderRadius: 10, fontSize: 12, color: 'var(--text-faint)' }}>
                Publishing to the website goes live with the new Hue &amp; Heal site. Until then, save drafts here and spin up a newsletter to promote each piece.
              </div>

              {articles.length > 0 && (
                <>
                  <label style={rail}>Articles · {articles.length}</label>
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {articles.map((a) => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--hh-line)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || 'Untitled'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{a.status === 'published' ? 'Published' : 'Draft'}</div>
                        </div>
                        <button className="hh-btn" onClick={() => openArticle(a)} style={{ background: 'none', border: 'none', color: 'var(--hh-copper)', fontSize: 12, cursor: 'pointer' }}>Open</button>
                        <ConfirmButton onConfirm={() => del(a.id)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 15, lineHeight: 1, cursor: 'pointer' }}>×</ConfirmButton>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ---- Designed preview ---- */}
            <div style={{ display: isMobile && mView !== 'preview' ? 'none' : undefined }}>
              <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 8 }}>Preview</div>
              <article style={{ background: '#FBFAF6', border: '1px solid var(--hh-line-card, var(--hh-line))', borderRadius: 14, overflow: 'hidden', maxWidth: 760 }}>
                <div style={{ padding: '48px 56px 8px' }}>
                  {readingTime && <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-accent)', marginBottom: 16 }}>{readingTime}</div>}
                  <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 40, lineHeight: 1.12, color: 'var(--text-strong)', margin: '0 0 16px', letterSpacing: '-0.4px' }}>{title || 'Your article title'}</h1>
                  {dek && <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 20, lineHeight: 1.5, color: 'var(--text-muted)', margin: '0 0 8px' }}>{dek}</p>}
                </div>
                <div style={{ padding: '8px 56px 8px' }}>
                  {blocks.map((b) => {
                    if (b.type === 'heading') return <h2 key={b.id} style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 26, lineHeight: 1.25, color: 'var(--text-strong)', margin: '34px 0 12px' }}>{b.text}</h2>
                    if (b.type === 'text') return <div key={b.id}>{b.text.split(/\n{2,}/).map((p, i) => p.trim() ? <p key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: 17, lineHeight: 1.85, color: 'var(--text-body)', margin: '0 0 18px' }}>{p.trim()}</p> : null)}</div>
                    if (b.type === 'image') return (
                      <figure key={b.id} style={{ margin: '28px 0' }}>
                        {b.url
                          ? <img src={b.url} alt={b.alt ?? ''} style={{ width: '100%', display: 'block', borderRadius: 12 }} />
                          : <div style={{ width: '100%', height: 260, background: 'var(--hh-bone)', border: '1px dashed var(--hh-line)', borderRadius: 12 }} />}
                        {b.alt && <figcaption style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--text-faint)', marginTop: 8, textAlign: 'center' }}>{b.alt}</figcaption>}
                      </figure>
                    )
                    return null
                  })}
                </div>
                {takeawayList.length > 0 && (
                  <div style={{ margin: '20px 56px 52px', padding: '26px 28px', background: 'var(--hh-bone)', borderRadius: 12 }}>
                    <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-accent)', marginBottom: 14 }}>Key design takeaways</div>
                    <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {takeawayList.map((t, i) => <li key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: 15.5, lineHeight: 1.6, color: 'var(--text-body)' }}>{t}</li>)}
                    </ol>
                  </div>
                )}
              </article>
            </div>
          </div>
          </>
        )}
      </div>
    </>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ConfirmButton from '../components/ConfirmButton'
import EditorShell from '../components/EditorShell'
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

/* ============================================================
   Content Studio · unified editor for authored publications.
   family = journal | report — one document model (title, standfirst,
   reorderable sections, takeaways), family-specific canvas + register.
   ============================================================ */

type Family = 'journal' | 'report'

const FAMILY_META: Record<Family, { label: string; ctype: string; addLabel: string; topicPlaceholder: string }> = {
  journal: { label: 'Journal', ctype: 'Article', addLabel: 'section', topicPlaceholder: 'Topic — e.g. designing calm into a waiting room' },
  report: { label: 'Report', ctype: 'Report', addLabel: 'chapter', topicPlaceholder: 'Territory — e.g. the state of wellness in hospitality' },
}

/* Structure templates: seed a document shape (kept when empty, never clobbering
   written work). Labels per the design's "Template · {family}" strip. */
const STRUCTURES: Record<Family, { id: string; label: string; blocks: () => Block[] }[]> = {
  journal: [
    { id: 'essay', label: 'Essay', blocks: () => [
      { id: bid(), type: 'text', text: 'Open with the feeling, not the thesis…' },
      { id: bid(), type: 'heading', text: 'The idea' },
      { id: bid(), type: 'text', text: '' },
      { id: bid(), type: 'image', url: '', alt: '' },
      { id: bid(), type: 'heading', text: 'What it means for design' },
      { id: bid(), type: 'text', text: '' },
    ] },
    { id: 'fieldnotes', label: 'Field notes', blocks: () => [
      { id: bid(), type: 'image', url: '', alt: '' },
      { id: bid(), type: 'heading', text: 'What we noticed' },
      { id: bid(), type: 'text', text: '' },
      { id: bid(), type: 'heading', text: 'Why it works' },
      { id: bid(), type: 'text', text: '' },
    ] },
    { id: 'guide', label: 'Guide', blocks: () => [
      { id: bid(), type: 'text', text: '' },
      { id: bid(), type: 'heading', text: '01 · ' },
      { id: bid(), type: 'text', text: '' },
      { id: bid(), type: 'heading', text: '02 · ' },
      { id: bid(), type: 'text', text: '' },
      { id: bid(), type: 'heading', text: '03 · ' },
      { id: bid(), type: 'text', text: '' },
    ] },
  ],
  report: [
    { id: 'stateof', label: 'State of', blocks: () => [
      { id: bid(), type: 'heading', text: 'Executive summary' },
      { id: bid(), type: 'text', text: '' },
      { id: bid(), type: 'heading', text: 'Where the sector is' },
      { id: bid(), type: 'text', text: '' },
      { id: bid(), type: 'image', url: '', alt: '' },
      { id: bid(), type: 'heading', text: 'Where it is heading' },
      { id: bid(), type: 'text', text: '' },
      { id: bid(), type: 'heading', text: 'What we would design' },
      { id: bid(), type: 'text', text: '' },
    ] },
    { id: 'deepdive', label: 'Deep dive', blocks: () => [
      { id: bid(), type: 'heading', text: 'The question' },
      { id: bid(), type: 'text', text: '' },
      { id: bid(), type: 'heading', text: 'The evidence' },
      { id: bid(), type: 'text', text: '' },
      { id: bid(), type: 'heading', text: 'The position' },
      { id: bid(), type: 'text', text: '' },
    ] },
  ],
}

const inp: React.CSSProperties = { width: '100%', border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }
const rail: React.CSSProperties = { fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)', margin: '20px 0 10px' }
const miniBtn: React.CSSProperties = { background: 'none', border: '1px solid var(--hh-line)', borderRadius: 6, width: 26, height: 24, color: 'var(--text-faint)', fontSize: 12, lineHeight: 1, cursor: 'pointer' }
const chip = (active: boolean): React.CSSProperties => ({ borderRadius: 999, padding: '8px 15px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: active ? '1px solid var(--hh-anthracite)' : '1px solid var(--hh-line)', background: active ? 'var(--hh-anthracite)' : 'transparent', color: active ? 'var(--text-on-ink)' : 'var(--text-body)' })

const BLOCK_LABEL: Record<string, string> = { heading: 'Heading', text: 'Text', image: 'Image' }

export default function CreateEditor() {
  const { family: famParam } = useParams()
  const family: Family = famParam === 'report' ? 'report' : 'journal'
  const meta = FAMILY_META[family]
  const structures = STRUCTURES[family]

  const auth = useAuth()
  const { current: brand } = useBrand()
  const nav = useNavigate()
  const isMobile = useIsMobile()
  const gated = auth.mode === 'connected' && !auth.session

  const [aiTopic, setAiTopic] = useState('')
  const [aiNotes, setAiNotes] = useState('')
  const [aiBusy, setAiBusy] = useState(false)

  const [currentId, setCurrentId] = useState<string | null>(null)
  const [structureId, setStructureId] = useState(structures[0].id)
  const [title, setTitle] = useState('')
  const [dek, setDek] = useState('')
  const [readingTime, setReadingTime] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [takeaways, setTakeaways] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [docs, setDocs] = useState<JournalArticle[]>([])
  const [mView, setMView] = useState<'edit' | 'preview'>('edit')

  async function reload() {
    if (gated) return
    try { setDocs(await listJournal(family === 'report' ? 'report' : 'article')) } catch { /* ignore */ }
  }
  useEffect(() => { reload() /* eslint-disable-next-line */ }, [auth.session, auth.mode, brand?.id, family])

  useDraft(
    `hh-create-${family}:${brand?.id ?? 'x'}`,
    { currentId, title, dek, readingTime, blocks, takeaways },
    (v) => {
      setCurrentId(v.currentId ?? null); setTitle(v.title ?? ''); setDek(v.dek ?? '')
      setReadingTime(v.readingTime ?? ''); setBlocks(Array.isArray(v.blocks) ? v.blocks : []); setTakeaways(v.takeaways ?? '')
    },
    !gated,
  )

  const hasContent = blocks.some((b) => (b.type === 'heading' || b.type === 'text' ? b.text.trim() : b.type === 'image' ? !!b.url : false))
  function applyStructure(id: string) {
    setStructureId(id)
    if (hasContent) return // structure only seeds an empty document; it never clobbers writing
    const s = structures.find((x) => x.id === id) ?? structures[0]
    setBlocks(s.blocks())
  }

  async function write() {
    if (!aiTopic.trim()) return
    setAiBusy(true); setStatus(null)
    const { result, error } = await generateJournal({ topic: aiTopic, notes: aiNotes, kind: family === 'report' ? 'report' : 'article', brandName: brand?.name, toneOfVoice: brand?.tone_of_voice, writingGuidelines: brand?.writing_guidelines })
    setAiBusy(false)
    if (error || !result) { setStatus(error ?? 'Could not write it'); return }
    setTitle(result.title); setDek(result.dek); setReadingTime(result.readingTime ?? '')
    setBlocks(journalToBlocks(result))
    setTakeaways((result.takeaways ?? []).join('\n'))
    setCurrentId(null)
    setStatus('Draft ready — reorder, edit, add images.')
    if (isMobile) setMView('preview')
  }

  const setBlock = (id: string, patch: Partial<Block>) => setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } as Block : b)))
  const removeBlock = (id: string) => setBlocks((bs) => bs.filter((b) => b.id !== id))
  const moveBlock = (i: number, dir: -1 | 1) => setBlocks((bs) => { const j = i + dir; if (j < 0 || j >= bs.length) return bs; const c = [...bs]; [c[i], c[j]] = [c[j], c[i]]; return c })
  function addBlock(type: 'heading' | 'text' | 'image') {
    const b: Block = type === 'heading' ? { id: bid(), type, text: '' } : type === 'text' ? { id: bid(), type, text: '' } : { id: bid(), type: 'image', url: '', alt: '' }
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
  function openDoc(a: JournalArticle) {
    setCurrentId(a.id); setTitle(a.title); setDek(a.dek); setReadingTime(a.reading_time)
    setBlocks(Array.isArray(a.blocks) && a.blocks.length ? (a.blocks as unknown as Block[]) : [])
    setTakeaways((a.takeaways ?? []).join('\n')); setStatus(null)
    if (isMobile) setMView('preview')
  }

  const takeawayList = takeaways.split('\n').map((s) => s.trim()).filter(Boolean)
  function payload() {
    return {
      title, dek, reading_time: readingTime,
      blocks: blocks as unknown[],
      body_md: blocksToText(blocks),
      takeaways: takeawayList,
      slug: slugify(title || 'untitled'),
      kind: family === 'report' ? 'report' : 'article',
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

  async function toNewsletter() {
    if (!title.trim() || !blocks.length) { setStatus('Write it first'); return }
    setBusy(true); setStatus('Writing the teaser…')
    try {
      const id = await save()
      if (!id) return
      const { id: nlId, error } = await createNewsletterFromArticle({ slug: slugify(title || 'untitled'), title, dek, body_md: blocksToText(blocks) }, brand)
      if (error || !nlId) { setStatus(`Couldn’t create newsletter: ${error ?? ''}`); return }
      nav(`/create/newsletter?open=${nlId}`)
    } finally { setBusy(false) }
  }

  const year = new Date().getFullYear()

  /* ---------- the designed canvas ---------- */
  const canvas = family === 'report' ? (
    <div style={{ maxWidth: 760 }}>
      {/* Report cover — dark, per the design */}
      <div style={{ background: 'var(--hh-anthracite)', color: '#F4F0E7', borderRadius: 14, padding: isMobile ? '44px 30px' : '64px 56px', marginBottom: 18 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24 }}>hue&heal<span style={{ color: 'var(--hh-ember)' }}>.</span></div>
        <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--hh-ember)', margin: '34px 0 14px' }}>Report · {year}</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: isMobile ? 34 : 46, lineHeight: 1.05, margin: 0 }}>{title || 'The state of…'}</h1>
        {dek && <p style={{ fontFamily: 'var(--font-voice)', fontStyle: 'italic', fontSize: 17, lineHeight: 1.5, color: 'rgba(244,240,231,0.72)', margin: '18px 0 0' }}>{dek}</p>}
        <div style={{ fontSize: 12, color: 'rgba(244,240,231,0.55)', marginTop: 28 }}>{blocks.filter((b) => b.type === 'heading').length || '—'} chapters{readingTime ? ` · ${readingTime}` : ''}</div>
      </div>
      <ArticleBody blocks={blocks} takeaways={takeawayList} isMobile={isMobile} takeawaysLabel="What to do with this" />
    </div>
  ) : (
    <article style={{ background: '#FBFAF6', border: '1px solid var(--hh-line-card, var(--hh-line))', borderRadius: 14, overflow: 'hidden', maxWidth: 760 }}>
      <div style={{ padding: isMobile ? '32px 22px 4px' : '48px 56px 8px' }}>
        {readingTime && <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-accent)', marginBottom: 16 }}>{readingTime}</div>}
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: isMobile ? 30 : 40, lineHeight: 1.12, color: 'var(--text-strong)', margin: '0 0 14px', letterSpacing: '-0.4px' }}>{title || 'Your article title'}</h1>
        {dek && <p style={{ fontFamily: 'var(--font-voice)', fontStyle: 'italic', fontSize: isMobile ? 17 : 20, lineHeight: 1.5, color: 'var(--text-muted)', margin: 0 }}>{dek}</p>}
      </div>
      <div style={{ padding: isMobile ? '4px 22px 28px' : '8px 56px 40px' }}>
        <ArticleBody blocks={blocks} takeaways={takeawayList} isMobile={isMobile} takeawaysLabel="Key design takeaways" />
      </div>
    </article>
  )

  if (gated) {
    return (
      <EditorShell ctype={meta.ctype} subline="Sign in to write and save" onDone={() => {}} doneDisabled
        rail={<p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Sign in (bottom-left) to write and save.</p>} canvas={<div />} />
    )
  }

  return (
    <EditorShell
      ctype={meta.ctype}
      subline={`${brand?.name ?? 'Hue & Heal'} · autosaved`}
      status={status}
      busy={busy}
      onNew={blank}
      onDone={save}
      doneDisabled={!title.trim()}
      view={mView}
      onViewChange={setMView}
      rail={
        <div>
                {/* Copilot brief */}
                <div style={{ border: '1px solid var(--hh-line)', borderRadius: 14, padding: 16, background: 'var(--hh-bone)' }}>
                  <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-accent)', marginBottom: 10 }}>✦ Brief the copilot</div>
                  <input style={{ ...inp, marginBottom: 8 }} value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder={meta.topicPlaceholder} onKeyDown={(e) => { if (e.key === 'Enter') write() }} />
                  <textarea style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} rows={2} value={aiNotes} onChange={(e) => setAiNotes(e.target.value)} placeholder="Notes, angles, references (optional)" />
                  <button className="hh-btn" onClick={write} disabled={aiBusy || !aiTopic.trim()}
                    style={{ marginTop: 10, width: '100%', background: 'var(--hh-copper)', color: 'var(--hh-on-accent, #F6EFE4)', border: 'none', borderRadius: 999, padding: '11px 18px', fontSize: 13, fontWeight: 500, cursor: aiBusy || !aiTopic.trim() ? 'default' : 'pointer', opacity: aiBusy || !aiTopic.trim() ? 0.55 : 1 }}>
                    {aiBusy ? 'Writing… (20–40s)' : '✦ Generate'}
                  </button>
                </div>

                <div style={rail}>Template · {meta.label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {structures.map((s) => <button key={s.id} className="hh-btn" onClick={() => applyStructure(s.id)} style={chip(structureId === s.id)}>{s.label}</button>)}
                </div>
                {hasContent && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>Templates seed an empty document — they won’t overwrite writing.</div>}

                <div style={rail}>Title</div>
                <input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={family === 'report' ? 'The state of wellness in…' : 'Article title'} />
                <div style={rail}>Standfirst</div>
                <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={dek} onChange={(e) => setDek(e.target.value)} placeholder="One or two line intro" />
                <div style={rail}>Reading time</div>
                <input style={inp} value={readingTime} onChange={(e) => setReadingTime(e.target.value)} placeholder="6 min read" />

                <div style={rail}>Sections</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {blocks.map((b, i) => (
                    <div key={b.id} style={{ border: '1px solid var(--hh-line)', borderRadius: 10, padding: 10, background: 'var(--hh-bone)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ color: 'var(--text-faint)', fontSize: 11, cursor: 'default' }}>⋮⋮</span>
                        <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', flex: 1 }}>{BLOCK_LABEL[b.type] ?? b.type}</span>
                        <button className="hh-btn" onClick={() => moveBlock(i, -1)} style={miniBtn} title="Move up">↑</button>
                        <button className="hh-btn" onClick={() => moveBlock(i, 1)} style={miniBtn} title="Move down">↓</button>
                        <ConfirmButton onConfirm={() => removeBlock(b.id)} style={{ ...miniBtn, border: 'none' }}>×</ConfirmButton>
                      </div>
                      {b.type === 'heading' && <input style={inp} value={b.text} placeholder="Section heading" onChange={(e) => setBlock(b.id, { text: e.target.value })} />}
                      {b.type === 'text' && <textarea style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} rows={4} value={b.text} placeholder="Write…" onChange={(e) => setBlock(b.id, { text: e.target.value })} />}
                      {b.type === 'image' && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {b.url && <img src={b.url} alt="" style={{ height: 40, width: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--hh-line)' }} />}
                            <label className="hh-btn" style={{ ...miniBtn, width: 'auto', padding: '9px 12px', flex: 1, textAlign: 'center', cursor: uploadingId === b.id ? 'default' : 'pointer', opacity: uploadingId === b.id ? 0.6 : 1 }}>
                              {uploadingId === b.id ? 'Uploading…' : b.url ? 'Replace image' : '⭱ Upload image'}
                              <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingId === b.id} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBlockImage(b.id, f); e.currentTarget.value = '' }} />
                            </label>
                          </div>
                          <input style={{ ...inp, marginTop: 6, fontSize: 12.5 }} placeholder="Caption / alt text" value={b.alt ?? ''} onChange={(e) => setBlock(b.id, { alt: e.target.value })} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {(['heading', 'text', 'image'] as const).map((t) => (
                    <button key={t} className="hh-btn" onClick={() => addBlock(t)} style={{ ...miniBtn, width: 'auto', padding: '7px 12px', fontSize: 11.5 }}>＋ {BLOCK_LABEL[t]}</button>
                  ))}
                </div>

                <div style={rail}>{family === 'report' ? 'What to do with this' : 'Key design takeaways'} (one per line)</div>
                <textarea style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} rows={4} value={takeaways} onChange={(e) => setTakeaways(e.target.value)} placeholder="One per line" />

                <div style={rail}>Share</div>
                <button className="hh-btn" onClick={toNewsletter} disabled={busy || !title.trim() || !blocks.length}
                  style={{ background: 'none', border: '1px solid var(--hh-copper)', color: 'var(--text-accent)', borderRadius: 999, padding: '10px 18px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', opacity: busy || !title.trim() || !blocks.length ? 0.55 : 1 }}>
                  ✉ Create newsletter from this
                </button>

                {docs.length > 0 && (
                  <>
                    <div style={rail}>{meta.label} library · {docs.length}</div>
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                      {docs.map((a) => (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid var(--hh-line)' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || 'Untitled'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{a.status === 'published' ? 'Published' : 'Draft'}</div>
                          </div>
                          <button className="hh-btn" onClick={() => openDoc(a)} style={{ background: 'none', border: 'none', color: 'var(--hh-copper)', fontSize: 12, cursor: 'pointer' }}>Open</button>
                          <ConfirmButton onConfirm={() => del(a.id)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 15, lineHeight: 1, cursor: 'pointer' }}>×</ConfirmButton>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

      }
      canvas={canvas}
    />
  )
}

function ArticleBody({ blocks, takeaways, isMobile, takeawaysLabel }: { blocks: Block[]; takeaways: string[]; isMobile: boolean; takeawaysLabel: string }) {
  return (
    <>
      {blocks.map((b) => {
        if (b.type === 'heading') return <h2 key={b.id} style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: isMobile ? 22 : 26, lineHeight: 1.25, color: 'var(--text-strong)', margin: '32px 0 12px' }}>{b.text || ' '}</h2>
        if (b.type === 'text') return <div key={b.id}>{b.text.split(/\n{2,}/).map((p, i) => p.trim() ? <p key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: isMobile ? 15.5 : 17, lineHeight: 1.85, color: 'var(--text-body)', margin: '0 0 16px' }}>{p.trim()}</p> : null)}</div>
        if (b.type === 'image') return (
          <figure key={b.id} style={{ margin: '26px 0' }}>
            {b.url
              ? <img src={b.url} alt={b.alt ?? ''} style={{ width: '100%', display: 'block', borderRadius: 12 }} />
              : <div style={{ width: '100%', height: isMobile ? 180 : 260, background: 'var(--hh-bone)', border: '1px dashed var(--hh-line)', borderRadius: 12 }} />}
            {b.alt && <figcaption style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--text-faint)', marginTop: 8, textAlign: 'center' }}>{b.alt}</figcaption>}
          </figure>
        )
        return null
      })}
      {takeaways.length > 0 && (
        <div style={{ marginTop: 26, padding: isMobile ? '20px 18px' : '26px 28px', background: 'var(--hh-bone)', borderRadius: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-accent)', marginBottom: 12 }}>{takeawaysLabel}</div>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {takeaways.map((t, i) => <li key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.6, color: 'var(--text-body)' }}>{t}</li>)}
          </ol>
        </div>
      )}
    </>
  )
}

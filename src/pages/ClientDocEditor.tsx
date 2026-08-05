import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import EditorShell from '../components/EditorShell'
import ConfirmButton from '../components/ConfirmButton'
import { useAuth } from '../lib/auth'
import { useBrand } from '../lib/brandContext'
import { useIsMobile } from '../lib/useIsMobile'
import { supabase, isSupabaseConfigured, functionsBase } from '../lib/supabase'
import { type Block, bid } from '../lib/newsletter'
import { uploadJournalImage } from '../lib/journal'
import { listClients, type Client } from '../lib/studioOps'
import { type ClientDoc, type FormStep, fid, docKind, getClientDoc, updateClientDoc } from '../lib/clientDocs'
import { type DeckSlide, sid, deckTemplate } from '../lib/decks'

/* Client document editor. Three modes by kind:
   - deck: design documents as 1920×1080 presentations with an inbuilt
     structure — pages are filled by hand or the copilot, reordered, deleted.
   - form: onboarding / discovery questionnaires (steps, completed in the portal).
   - doc:  written documents (contract) as block documents. */

const inp: React.CSSProperties = { width: '100%', border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }
const rail: React.CSSProperties = { fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)', margin: '20px 0 10px' }
const miniBtn: React.CSSProperties = { background: 'none', border: '1px solid var(--hh-line)', borderRadius: 6, width: 26, height: 24, color: 'var(--text-faint)', fontSize: 12, lineHeight: 1, cursor: 'pointer' }

const STEP_TYPES: { key: FormStep['type']; label: string }[] = [
  { key: 'text', label: 'Short answer' },
  { key: 'long', label: 'Long answer' },
  { key: 'choice', label: 'Multiple choice' },
  { key: 'scale', label: 'Scale 1–5' },
  { key: 'statement', label: 'Statement' },
]
const SLIDE_LAYOUTS: { key: DeckSlide['layout']; label: string }[] = [
  { key: 'cover', label: 'Cover' },
  { key: 'content', label: 'Content' },
  { key: 'list', label: 'List' },
  { key: 'statement', label: 'Statement' },
]

/* ---- 16:9 slide renderer. Container queries keep type proportional at any
   width, so the same slide is faithful in the editor, portal and export. ---- */
export function SlideView({ slide, index, total, clientName }: { slide: DeckSlide; index: number; total: number; clientName: string }) {
  const wordmark = <span style={{ fontFamily: 'var(--font-serif)' }}>hue&heal<span style={{ color: 'var(--hh-ember)' }}>.</span></span>
  const base: React.CSSProperties & Record<string, string> = {
    aspectRatio: '16 / 9', width: '100%', containerType: 'inline-size', position: 'relative', overflow: 'hidden', borderRadius: 10,
  } as React.CSSProperties & Record<string, string>
  if (slide.layout === 'cover') {
    return (
      <div style={{ ...base, background: 'var(--hh-anthracite)', color: '#F4F0E7' }}>
        <div style={{ position: 'absolute', top: '6cqw', left: '6cqw', fontSize: '2cqw' }}>{wordmark}</div>
        <div style={{ position: 'absolute', left: '6cqw', right: '6cqw', bottom: '10cqw' }}>
          <div style={{ fontSize: '1.15cqw', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--hh-ember)', marginBottom: '1.6cqw' }}>{slide.eyebrow || 'Document'} · Hue & Heal × {clientName}</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: '4.6cqw', lineHeight: 1.06 }}>{slide.title || 'Untitled'}</div>
          {slide.body && <div style={{ fontFamily: 'var(--font-voice)', fontStyle: 'italic', fontSize: '1.7cqw', color: 'rgba(244,240,231,0.72)', marginTop: '1.6cqw', maxWidth: '60cqw' }}>{slide.body}</div>}
        </div>
        <div style={{ position: 'absolute', left: '6cqw', bottom: '4cqw', fontSize: '1.05cqw', color: 'rgba(244,240,231,0.55)' }}>Designing the future of wellness</div>
      </div>
    )
  }
  if (slide.layout === 'statement') {
    return (
      <div style={{ ...base, background: 'var(--hh-bone)', color: 'var(--text-strong)' }}>
        <div style={{ position: 'absolute', top: '5cqw', left: '6cqw', fontSize: '1.15cqw', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>{slide.eyebrow}</div>
        <div style={{ position: 'absolute', left: '6cqw', right: '6cqw', top: '50%', transform: 'translateY(-50%)' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: '3.6cqw', lineHeight: 1.15, maxWidth: '74cqw' }}>{slide.title}</div>
          {slide.body && <div style={{ fontFamily: 'var(--font-voice)', fontStyle: 'italic', fontSize: '1.6cqw', color: 'var(--text-muted)', marginTop: '2cqw', maxWidth: '60cqw' }}>{slide.body}</div>}
        </div>
        <Footer index={index} total={total} />
      </div>
    )
  }
  return (
    <div style={{ ...base, background: '#FBFAF6', color: 'var(--text-strong)' }}>
      <div style={{ position: 'absolute', top: '5cqw', left: '6cqw', right: '6cqw' }}>
        <div style={{ fontSize: '1.15cqw', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>{slide.eyebrow}</div>
        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '3cqw', lineHeight: 1.12, marginTop: '1.2cqw', maxWidth: '70cqw' }}>{slide.title}</div>
      </div>
      <div style={{ position: 'absolute', left: '6cqw', right: '6cqw', top: '17cqw', bottom: '6cqw', overflow: 'hidden' }}>
        {slide.layout === 'list' ? (
          <div>
            {slide.body && <div style={{ fontSize: '1.45cqw', lineHeight: 1.7, color: 'var(--text-body)', maxWidth: '64cqw', marginBottom: '1.6cqw' }}>{slide.body}</div>}
            {(slide.bullets ?? []).filter((b) => b.trim()).map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: '1.2cqw', alignItems: 'baseline', marginBottom: '1cqw' }}>
                <span style={{ width: '0.55cqw', height: '0.55cqw', borderRadius: '50%', background: 'var(--hh-copper)', flexShrink: 0, transform: 'translateY(-0.15cqw)' }} />
                <span style={{ fontSize: '1.5cqw', lineHeight: 1.6, color: 'var(--text-body)' }}>{b}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '1.5cqw', lineHeight: 1.75, color: 'var(--text-body)', maxWidth: '64cqw', whiteSpace: 'pre-line' }}>{slide.body}</div>
        )}
      </div>
      <Footer index={index} total={total} />
    </div>
  )
}

function Footer({ index, total }: { index: number; total: number }) {
  return (
    <div style={{ position: 'absolute', left: '6cqw', right: '6cqw', bottom: '2.6cqw', display: 'flex', justifyContent: 'space-between', fontSize: '1.05cqw', color: 'var(--text-faint)' }}>
      <span style={{ fontFamily: 'var(--font-serif)' }}>hue&heal<span style={{ color: 'var(--hh-copper)' }}>.</span></span>
      <span>{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
    </div>
  )
}

export default function ClientDocEditor() {
  const { id: clientId, docId } = useParams()
  const auth = useAuth()
  const { current: brand } = useBrand()
  const isMobile = useIsMobile()
  const gated = auth.mode === 'connected' && !auth.session

  const [doc, setDoc] = useState<ClientDoc | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [title, setTitle] = useState('')
  const [dek, setDek] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [steps, setSteps] = useState<FormStep[]>([])
  const [slides, setSlides] = useState<DeckSlide[]>([])
  const [shared, setShared] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [aiNotes, setAiNotes] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [mView, setMView] = useState<'edit' | 'preview'>('edit')

  useEffect(() => {
    if (gated || !docId) return
    getClientDoc(docId).then((d) => {
      if (!d) { setStatus('Could not load the document'); return }
      setDoc(d); setTitle(d.title); setDek(d.dek); setShared(d.shared)
      const k = docKind(d.kind)
      if (k.deck) setSlides(Array.isArray(d.blocks) && d.blocks.length ? (d.blocks as unknown as DeckSlide[]) : [])
      else setBlocks(Array.isArray(d.blocks) ? (d.blocks as unknown as Block[]) : [])
      setSteps(Array.isArray(d.form) ? (d.form as unknown as FormStep[]) : [])
    })
    listClients().then((cs) => setClient(cs.find((c) => c.id === clientId) ?? null)).catch(() => {})
  }, [docId, clientId, gated])

  const kind = docKind(doc?.kind ?? 'note')
  const isForm = !!doc?.is_form
  const isDeck = !!kind.deck

  // Older deck docs created before templates: seed the structure once the client is known.
  useEffect(() => {
    if (isDeck && doc && client && slides.length === 0) setSlides(deckTemplate(doc.kind, client.name))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDeck, doc?.id, client?.id])

  /* ---- AI drafting ---- */
  async function generate() {
    if (!doc || !client) return
    if (!(isSupabaseConfigured && supabase && functionsBase)) { setStatus('Not connected'); return }
    const { data: s } = await supabase.auth.getSession()
    const token = s.session?.access_token
    if (!token) { setStatus('Sign in first'); return }
    setAiBusy(true); setStatus(null)
    try {
      const res = await fetch(`${functionsBase}/generate-client-doc`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: doc.kind, kindLabel: kind.label, isForm, isDeck,
          clientName: client.name, clientSector: client.sector, clientNote: client.note,
          notes: aiNotes,
          structure: isDeck ? slides.filter((sl) => sl.layout !== 'cover').map((sl) => ({ eyebrow: sl.eyebrow, title: sl.title, layout: sl.layout })) : undefined,
          brandName: brand?.name, toneOfVoice: brand?.tone_of_voice, writingGuidelines: brand?.writing_guidelines,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.result) { setStatus(data?.error ? String(data.error) : `Draft ${res.status}`); return }
      const r = data.result
      if (r.title) setTitle(r.title)
      if (r.dek) setDek(r.dek)
      if (isDeck && Array.isArray(r.slides)) {
        const cover = slides.find((sl) => sl.layout === 'cover')
        const newCover: DeckSlide = cover
          ? { ...cover, title: r.title || cover.title, body: r.dek || cover.body }
          : { id: sid(), layout: 'cover', eyebrow: kind.label, title: r.title ?? title, body: r.dek ?? dek }
        setSlides([newCover, ...(r.slides as Partial<DeckSlide>[]).map((sl) => ({
          id: sid(),
          layout: (sl.layout === 'list' || sl.layout === 'statement' ? sl.layout : 'content') as DeckSlide['layout'],
          eyebrow: sl.eyebrow ?? '', title: sl.title ?? '', body: sl.body ?? '',
          bullets: Array.isArray(sl.bullets) ? sl.bullets : undefined,
        }))])
      } else if (isForm && Array.isArray(r.steps)) {
        setSteps(r.steps.map((st: Partial<FormStep>) => ({ id: fid(), type: (st.type as FormStep['type']) ?? 'text', question: st.question ?? '', help: st.help ?? '', options: Array.isArray(st.options) ? st.options : undefined })))
      } else if (Array.isArray(r.sections)) {
        const out: Block[] = []
        for (const sec of r.sections as { heading?: string; body?: string }[]) {
          if (sec.heading?.trim()) out.push({ id: bid(), type: 'heading', text: sec.heading })
          if (sec.body?.trim()) out.push({ id: bid(), type: 'text', text: sec.body })
        }
        setBlocks(out)
      }
      setStatus('Draft ready — tailor it below.')
      if (isMobile) setMView('preview')
    } finally { setAiBusy(false) }
  }

  /* ---- slide ops (decks) ---- */
  const setSlide = (sId: string, patch: Partial<DeckSlide>) => setSlides((ss) => ss.map((sl) => (sl.id === sId ? { ...sl, ...patch } : sl)))
  const removeSlide = (sId: string) => setSlides((ss) => (ss.length > 1 ? ss.filter((sl) => sl.id !== sId) : ss))
  const moveSlide = (i: number, dir: -1 | 1) => setSlides((ss) => { const j = i + dir; if (j < 0 || j >= ss.length) return ss; const c = [...ss]; [c[i], c[j]] = [c[j], c[i]]; return c })
  const addSlide = () => setSlides((ss) => [...ss, { id: sid(), layout: 'content', eyebrow: 'Section', title: '', body: '' }])

  /* ---- block ops (written docs) ---- */
  const setBlock = (bId: string, patch: Partial<Block>) => setBlocks((bs) => bs.map((b) => (b.id === bId ? { ...b, ...patch } as Block : b)))
  const removeBlock = (bId: string) => setBlocks((bs) => bs.filter((b) => b.id !== bId))
  const moveBlock = (i: number, dir: -1 | 1) => setBlocks((bs) => { const j = i + dir; if (j < 0 || j >= bs.length) return bs; const c = [...bs]; [c[i], c[j]] = [c[j], c[i]]; return c })
  function addBlock(type: 'heading' | 'text' | 'image') {
    const b: Block = type === 'image' ? { id: bid(), type: 'image', url: '', alt: '' } : { id: bid(), type, text: '' }
    setBlocks((bs) => [...bs, b])
  }
  async function uploadBlockImage(bId: string, file: File) {
    setUploadingId(bId); setStatus('Uploading image…')
    const { url, error } = await uploadJournalImage(file)
    setUploadingId(null)
    if (error || !url) { setStatus(`Upload failed: ${error ?? ''}`); return }
    setBlock(bId, { url }); setStatus('Image added')
  }

  /* ---- step ops (forms) ---- */
  const setStep = (sId: string, patch: Partial<FormStep>) => setSteps((ss) => ss.map((s) => (s.id === sId ? { ...s, ...patch } : s)))
  const removeStep = (sId: string) => setSteps((ss) => ss.filter((s) => s.id !== sId))
  const moveStep = (i: number, dir: -1 | 1) => setSteps((ss) => { const j = i + dir; if (j < 0 || j >= ss.length) return ss; const c = [...ss]; [c[i], c[j]] = [c[j], c[i]]; return c })
  const addStep = () => setSteps((ss) => [...ss, { id: fid(), type: 'text', question: '', help: '' }])

  async function save() {
    if (!doc) return
    setBusy(true); setStatus(null)
    try {
      await updateClientDoc(doc.id, { title, dek, blocks: (isDeck ? slides : blocks) as unknown[], form: steps as unknown[], shared })
      setStatus('Saved')
    } catch (e) { setStatus(`Couldn’t save: ${e instanceof Error ? e.message : e}`) } finally { setBusy(false) }
  }
  async function toggleShare() {
    if (!doc) return
    const next = !shared
    setShared(next)
    try { await updateClientDoc(doc.id, { shared: next }); setStatus(next ? 'Shared to the client space' : 'Now private') }
    catch (e) { setShared(!next); setStatus(`Couldn’t update: ${e instanceof Error ? e.message : e}`) }
  }

  if (gated) {
    return <EditorShell ctype="Document" subline="Sign in to edit" backTo={`/clients/${clientId}`} onDone={() => {}} doneDisabled rail={<p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Sign in (bottom-left) to edit.</p>} canvas={<div />} />
  }
  if (!doc) {
    return <EditorShell ctype="Document" subline="Loading…" backTo={`/clients/${clientId}`} onDone={() => {}} doneDisabled rail={<p style={{ fontSize: 14, color: 'var(--text-faint)' }}>{status ?? 'Loading…'}</p>} canvas={<div />} />
  }

  const shareBtn = (
    <button className="hh-btn" onClick={toggleShare}
      style={{ background: shared ? 'var(--status-positive)' : 'none', color: shared ? '#F6EFE4' : 'var(--text-muted)', border: shared ? '1px solid var(--status-positive)' : '1px solid var(--hh-line)', borderRadius: 999, padding: '8px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {shared ? '✓ Shared' : 'Share to space'}
    </button>
  )

  /* ---- canvases ---- */
  const deckCanvas = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 920 }}>
      {slides.map((sl, i) => (
        <div key={sl.id} style={{ boxShadow: 'var(--shadow-card)', borderRadius: 10 }}>
          <SlideView slide={sl} index={i} total={slides.length} clientName={client?.name ?? 'Client'} />
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: 'var(--text-faint)', textAlign: 'center' }}>1920 × 1080 · presented full-screen in the client space</div>
    </div>
  )

  const docCanvas = (
    <article style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--hh-line-card)', maxWidth: 760, background: '#FBFAF6' }}>
      <div style={{ background: 'var(--hh-anthracite)', color: '#F4F0E7', padding: isMobile ? '38px 26px' : '54px 56px' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 21 }}>hue&heal<span style={{ color: 'var(--hh-ember)' }}>.</span></div>
        <div style={{ fontSize: 10.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--hh-ember)', margin: '28px 0 12px' }}>{kind.label} · Hue & Heal × {client?.name ?? 'Client'}</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: isMobile ? 29 : 40, lineHeight: 1.08, margin: 0 }}>{title || `${kind.label} for ${client?.name ?? 'your client'}`}</h1>
        {dek && <p style={{ fontFamily: 'var(--font-voice)', fontStyle: 'italic', fontSize: 16, lineHeight: 1.5, color: 'rgba(244,240,231,0.72)', margin: '16px 0 0' }}>{dek}</p>}
      </div>
      <div style={{ padding: isMobile ? '10px 22px 30px' : '18px 56px 44px' }}>
        {isForm ? (
          <>
            {steps.length === 0 && <p style={{ fontSize: 13.5, color: 'var(--text-faint)' }}>No questions yet — draft with the copilot or add steps.</p>}
            {steps.map((s, i) => (
              <div key={s.id} style={{ padding: '20px 0', borderBottom: '1px solid var(--hh-line)' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-accent)', marginBottom: 8 }}>{i + 1} / {steps.length}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? 19 : 23, lineHeight: 1.3, color: 'var(--text-strong)' }}>{s.question || 'Untitled question'}</div>
                {s.help && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>{s.help}</div>}
                {s.type === 'choice' && (s.options ?? []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {(s.options ?? []).map((o, j) => <span key={j} style={{ border: '1px solid var(--hh-line)', borderRadius: 999, padding: '6px 13px', fontSize: 12.5, color: 'var(--text-body)' }}>{o}</span>)}
                  </div>
                )}
                {s.type === 'scale' && <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>{[1, 2, 3, 4, 5].map((n) => <span key={n} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--hh-line)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--text-muted)' }}>{n}</span>)}</div>}
                {(s.type === 'text' || s.type === 'long') && <div style={{ marginTop: 10, borderBottom: '1.5px solid var(--hh-mushroom)', width: s.type === 'long' ? '100%' : '60%', height: 26 }} />}
              </div>
            ))}
            {steps.length > 0 && <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 16 }}>Clients complete this step by step in their space.</p>}
          </>
        ) : (
          <>
            {blocks.length === 0 && <p style={{ fontSize: 13.5, color: 'var(--text-faint)' }}>Nothing here yet — draft with the copilot or add sections.</p>}
            {blocks.map((b) => {
              if (b.type === 'heading') return <h2 key={b.id} style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: isMobile ? 21 : 25, lineHeight: 1.25, color: 'var(--text-strong)', margin: '30px 0 12px' }}>{b.text || ' '}</h2>
              if (b.type === 'text') return <div key={b.id}>{b.text.split(/\n{2,}/).map((p, i) => p.trim() ? <p key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: isMobile ? 15 : 16.5, lineHeight: 1.85, color: 'var(--text-body)', margin: '0 0 16px' }}>{p.trim()}</p> : null)}</div>
              if (b.type === 'image') return (
                <figure key={b.id} style={{ margin: '24px 0' }}>
                  {b.url ? <img src={b.url} alt={b.alt ?? ''} style={{ width: '100%', display: 'block', borderRadius: 12 }} /> : <div style={{ width: '100%', height: isMobile ? 170 : 240, background: 'var(--hh-bone)', border: '1px dashed var(--hh-line)', borderRadius: 12 }} />}
                  {b.alt && <figcaption style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 8, textAlign: 'center' }}>{b.alt}</figcaption>}
                </figure>
              )
              return null
            })}
          </>
        )}
      </div>
    </article>
  )

  return (
    <EditorShell
      ctype={kind.label}
      subline={`Hue & Heal × ${client?.name ?? '…'}`}
      backTo={`/clients/${clientId}`}
      status={status}
      busy={busy}
      onDone={save}
      view={mView}
      onViewChange={setMView}
      headerExtra={shareBtn}
      previewLabel={isDeck ? 'Deck' : 'Preview'}
      rail={
        <div>
          <div style={{ border: '1px solid var(--hh-line)', borderRadius: 14, padding: 16, background: 'var(--hh-bone)' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-accent)', marginBottom: 10 }}>✦ Brief the copilot</div>
            <textarea style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} rows={3} value={aiNotes} onChange={(e) => setAiNotes(e.target.value)}
              placeholder={`Anything the ${kind.label.toLowerCase()} should cover for ${client?.name ?? 'this client'} (optional)`} />
            <button className="hh-btn" onClick={generate} disabled={aiBusy}
              style={{ marginTop: 10, width: '100%', background: 'var(--hh-copper)', color: 'var(--hh-on-accent, #F6EFE4)', border: 'none', borderRadius: 999, padding: '11px 18px', fontSize: 13, fontWeight: 500, cursor: aiBusy ? 'default' : 'pointer', opacity: aiBusy ? 0.55 : 1 }}>
              {aiBusy ? 'Drafting…' : `✦ Draft this ${kind.label.toLowerCase()}`}
            </button>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>
              {isDeck ? `Fills the deck's structure for ${client?.name ?? 'the client'}, in ${brand?.name ?? 'the brand'}’s voice.` : `Customised to ${client?.name ?? 'the client'}, in ${brand?.name ?? 'the brand'}’s voice.`}
            </div>
          </div>

          {!isDeck && (
            <>
              <div style={rail}>Title</div>
              <input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} />
              <div style={rail}>Standfirst</div>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={dek} onChange={(e) => setDek(e.target.value)} placeholder="One or two line intro" />
            </>
          )}

          {isDeck && (
            <>
              <div style={rail}>Pages · {slides.length}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {slides.map((sl, i) => (
                  <div key={sl.id} style={{ border: '1px solid var(--hh-line)', borderRadius: 10, padding: 10, background: 'var(--hh-bone)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', flex: 1 }}>Page {i + 1}</span>
                      <select value={sl.layout} onChange={(e) => setSlide(sl.id, { layout: e.target.value as DeckSlide['layout'] })}
                        style={{ border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 6, padding: '3px 6px', fontSize: 11, fontFamily: 'var(--font-sans)', color: 'var(--text-muted)' }}>
                        {SLIDE_LAYOUTS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
                      </select>
                      <button className="hh-btn" onClick={() => moveSlide(i, -1)} style={miniBtn}>↑</button>
                      <button className="hh-btn" onClick={() => moveSlide(i, 1)} style={miniBtn}>↓</button>
                      <ConfirmButton onConfirm={() => removeSlide(sl.id)} confirmLabel="Delete page?" style={{ ...miniBtn, border: 'none', opacity: slides.length > 1 ? 1 : 0.4 }}>×</ConfirmButton>
                    </div>
                    <input style={{ ...inp, fontSize: 12.5, marginBottom: 6 }} value={sl.eyebrow ?? ''} placeholder="Eyebrow (section label)" onChange={(e) => setSlide(sl.id, { eyebrow: e.target.value })} />
                    <input style={inp} value={sl.title ?? ''} placeholder="Page title" onChange={(e) => { setSlide(sl.id, { title: e.target.value }); if (sl.layout === 'cover') setTitle(e.target.value) }} />
                    <textarea style={{ ...inp, marginTop: 6, resize: 'vertical', lineHeight: 1.5, fontSize: 13 }} rows={3} value={sl.body ?? ''} placeholder="Body" onChange={(e) => { setSlide(sl.id, { body: e.target.value }); if (sl.layout === 'cover') setDek(e.target.value) }} />
                    {sl.layout === 'list' && (
                      <textarea style={{ ...inp, marginTop: 6, resize: 'vertical', fontSize: 12.5 }} rows={3} value={(sl.bullets ?? []).join('\n')} placeholder="Bullets, one per line"
                        onChange={(e) => setSlide(sl.id, { bullets: e.target.value.split('\n') })} />
                    )}
                  </div>
                ))}
              </div>
              <button className="hh-btn" onClick={addSlide} style={{ ...miniBtn, width: 'auto', padding: '7px 12px', fontSize: 11.5, marginTop: 8 }}>＋ Page</button>
            </>
          )}

          {isForm && (
            <>
              <div style={rail}>Steps</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {steps.map((s, i) => (
                  <div key={s.id} style={{ border: '1px solid var(--hh-line)', borderRadius: 10, padding: 10, background: 'var(--hh-bone)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', flex: 1 }}>Step {i + 1}</span>
                      <button className="hh-btn" onClick={() => moveStep(i, -1)} style={miniBtn}>↑</button>
                      <button className="hh-btn" onClick={() => moveStep(i, 1)} style={miniBtn}>↓</button>
                      <ConfirmButton onConfirm={() => removeStep(s.id)} style={{ ...miniBtn, border: 'none' }}>×</ConfirmButton>
                    </div>
                    <select value={s.type} onChange={(e) => setStep(s.id, { type: e.target.value as FormStep['type'] })} style={{ ...inp, marginBottom: 6, fontSize: 12.5 }}>
                      {STEP_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                    <input style={inp} value={s.question} placeholder="Question" onChange={(e) => setStep(s.id, { question: e.target.value })} />
                    <input style={{ ...inp, marginTop: 6, fontSize: 12.5 }} value={s.help ?? ''} placeholder="Help text (optional)" onChange={(e) => setStep(s.id, { help: e.target.value })} />
                    {s.type === 'choice' && (
                      <textarea style={{ ...inp, marginTop: 6, fontSize: 12.5, resize: 'vertical' }} rows={2} value={(s.options ?? []).join('\n')} placeholder="Options, one per line"
                        onChange={(e) => setStep(s.id, { options: e.target.value.split('\n') })} />
                    )}
                  </div>
                ))}
              </div>
              <button className="hh-btn" onClick={addStep} style={{ ...miniBtn, width: 'auto', padding: '7px 12px', fontSize: 11.5, marginTop: 8 }}>＋ Step</button>
            </>
          )}

          {!isDeck && !isForm && (
            <>
              <div style={rail}>Sections</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {blocks.map((b, i) => (
                  <div key={b.id} style={{ border: '1px solid var(--hh-line)', borderRadius: 10, padding: 10, background: 'var(--hh-bone)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', flex: 1 }}>{b.type}</span>
                      <button className="hh-btn" onClick={() => moveBlock(i, -1)} style={miniBtn}>↑</button>
                      <button className="hh-btn" onClick={() => moveBlock(i, 1)} style={miniBtn}>↓</button>
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
                  <button key={t} className="hh-btn" onClick={() => addBlock(t)} style={{ ...miniBtn, width: 'auto', padding: '7px 12px', fontSize: 11.5 }}>＋ {t}</button>
                ))}
              </div>
            </>
          )}
        </div>
      }
      canvas={isDeck ? deckCanvas : docCanvas}
    />
  )
}

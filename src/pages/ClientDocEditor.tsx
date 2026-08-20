import { useEffect, useState } from 'react'
import { fileNameFromTitle } from '../lib/fileName'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import EditorShell from '../components/EditorShell'
import ConfirmButton from '../components/ConfirmButton'
import SlideView from '../components/SlideView'
import { useAuth } from '../lib/auth'
import { useBrand } from '../lib/brandContext'
import { useIsMobile } from '../lib/useIsMobile'
import { supabase, isSupabaseConfigured, functionsBase } from '../lib/supabase'
import { type Block } from '../lib/newsletter'
import { uploadJournalImage } from '../lib/journal'
import { listClients, type Client } from '../lib/studioOps'
import { type ClientDoc, type FormStep, fid, getClientDoc, updateClientDoc } from '../lib/clientDocs'
import { type DeckSlide, type SlideLayout, type SlideTheme, sid } from '../lib/decks'

/* Client document editor. Two families by format:
   - deck (1920×1080) and a4 (portrait): branded pages — filled by hand or the
     copilot, added, reordered, restyled (layout + surface) and deleted.
   - form: step-by-step questionnaires completed in the client space. */

const inp: React.CSSProperties = { width: '100%', border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }
const rail: React.CSSProperties = { fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)', margin: '20px 0 10px' }
const miniBtn: React.CSSProperties = { background: 'none', border: '1px solid var(--hh-line)', borderRadius: 6, width: 26, height: 24, color: 'var(--text-faint)', fontSize: 12, lineHeight: 1, cursor: 'pointer' }
const miniSelect: React.CSSProperties = { border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 6, padding: '3px 6px', fontSize: 11, fontFamily: 'var(--font-sans)', color: 'var(--text-muted)' }

const STEP_TYPES: { key: FormStep['type']; label: string }[] = [
  { key: 'text', label: 'Short answer' },
  { key: 'long', label: 'Long answer' },
  { key: 'choice', label: 'Multiple choice' },
  { key: 'scale', label: 'Scale 1–5' },
  { key: 'statement', label: 'Statement' },
]
const LAYOUTS: { key: SlideLayout; label: string }[] = [
  { key: 'cover', label: 'Cover' },
  { key: 'statement', label: 'Statement' },
  { key: 'content', label: 'Detail' },
  { key: 'list', label: 'List' },
  { key: 'split', label: 'Split' },
  { key: 'terms', label: 'Terms' },
  { key: 'timeline', label: 'Roadmap' },
]
const THEMES: { key: SlideTheme; label: string }[] = [
  { key: 'paper', label: 'Paper' },
  { key: 'ink', label: 'Ink' },
  { key: 'clay', label: 'Clay' },
  { key: 'bone', label: 'Bone' },
]

function prettyKind(kind: string): string {
  const t = kind.replace(/-/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/* Legacy content docs stored Block[] — convert into pages once. */
function blocksToPages(blocks: Block[], kind: string, clientName: string, title: string, dek: string): DeckSlide[] {
  const pages: DeckSlide[] = [{ id: sid(), layout: 'cover', theme: 'ink', eyebrow: prettyKind(kind), title: title || clientName, body: dek }]
  let current: DeckSlide | null = null
  for (const b of blocks) {
    if (b.type === 'heading') { current = { id: sid(), layout: 'content', eyebrow: prettyKind(kind), title: b.text, body: '' }; pages.push(current) }
    else if (b.type === 'text') {
      if (!current) { current = { id: sid(), layout: 'content', eyebrow: prettyKind(kind), title: '', body: '' }; pages.push(current) }
      current.body = current.body ? `${current.body}\n\n${b.text}` : b.text
    } else if (b.type === 'image' && b.url) {
      if (current && !current.image) current.image = b.url
    }
  }
  return pages
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
  const [slides, setSlides] = useState<DeckSlide[]>([])
  const [steps, setSteps] = useState<FormStep[]>([])
  const [shared, setShared] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [aiNotes, setAiNotes] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [printing, setPrinting] = useState(false)
  const [mView, setMView] = useState<'edit' | 'preview'>('edit')

  useEffect(() => {
    if (gated || !docId) return
    getClientDoc(docId).then((d) => {
      if (!d) { setStatus('Could not load the document'); return }
      setDoc(d); setTitle(d.title); setDek(d.dek); setShared(d.shared)
      if (!d.is_form) {
        const raw = Array.isArray(d.blocks) ? d.blocks : []
        const looksLikePages = raw.length > 0 && typeof (raw[0] as DeckSlide).layout === 'string'
        if (looksLikePages) setSlides(raw as unknown as DeckSlide[])
        else if (raw.length) setSlides(blocksToPages(raw as unknown as Block[], d.kind, 'Client', d.title, d.dek))
        else setSlides([])
      }
      setSteps(Array.isArray(d.form) ? (d.form as unknown as FormStep[]) : [])
    })
    listClients().then((cs) => setClient(cs.find((c) => c.id === clientId) ?? null)).catch(() => {})
  }, [docId, clientId, gated])

  const isForm = !!doc?.is_form
  const format = doc?.format ?? 'deck'
  const isA4 = format === 'a4'
  const kindLabel = prettyKind(doc?.kind ?? 'Document')

  /* ---- AI drafting: fill the pages for this client ---- */
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
          kind: doc.kind, kindLabel, isForm, isDeck: !isForm,
          clientName: client.name, clientSector: client.sector, clientNote: client.note,
          notes: aiNotes,
          structure: !isForm ? slides.filter((sl) => sl.layout !== 'cover').map((sl) => ({ eyebrow: sl.eyebrow, title: sl.title, layout: sl.layout })) : undefined,
          brandName: brand?.name, toneOfVoice: brand?.tone_of_voice, writingGuidelines: brand?.writing_guidelines,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.result) { setStatus(data?.error ? String(data.error) : `Draft ${res.status}`); return }
      const r = data.result
      if (r.title) setTitle(r.title)
      if (r.dek) setDek(r.dek)
      if (!isForm && Array.isArray(r.slides)) {
        const cover = slides.find((sl) => sl.layout === 'cover')
        const newCover: DeckSlide = cover
          ? { ...cover, title: r.title || cover.title, body: r.dek || cover.body }
          : { id: sid(), layout: 'cover', theme: 'ink', eyebrow: kindLabel, title: r.title ?? title, body: r.dek ?? dek }
        // Preserve each page's chosen theme by position where possible.
        const prior = slides.filter((sl) => sl.layout !== 'cover')
        setSlides([newCover, ...(r.slides as Partial<DeckSlide>[]).map((sl, i) => ({
          id: sid(),
          layout: (['content', 'list', 'statement', 'split', 'terms', 'timeline'].includes(sl.layout as string) ? sl.layout : 'content') as SlideLayout,
          theme: prior[i]?.theme,
          eyebrow: sl.eyebrow ?? '', title: sl.title ?? '', body: sl.body ?? '',
          bullets: Array.isArray(sl.bullets) ? sl.bullets : undefined,
          image: prior[i]?.image,
        }))])
      } else if (isForm && Array.isArray(r.steps)) {
        setSteps(r.steps.map((st: Partial<FormStep>) => ({ id: fid(), type: (st.type as FormStep['type']) ?? 'text', question: st.question ?? '', help: st.help ?? '', options: Array.isArray(st.options) ? st.options : undefined })))
      }
      setStatus('Draft ready — tailor it below.')
      if (isMobile) setMView('preview')
    } finally { setAiBusy(false) }
  }

  /* ---- page ops ---- */
  const setSlide = (sId: string, patch: Partial<DeckSlide>) => setSlides((ss) => ss.map((sl) => (sl.id === sId ? { ...sl, ...patch } : sl)))
  const removeSlide = (sId: string) => setSlides((ss) => (ss.length > 1 ? ss.filter((sl) => sl.id !== sId) : ss))
  const moveSlide = (i: number, dir: -1 | 1) => setSlides((ss) => { const j = i + dir; if (j < 0 || j >= ss.length) return ss; const c = [...ss]; [c[i], c[j]] = [c[j], c[i]]; return c })
  const addSlide = () => setSlides((ss) => [...ss, { id: sid(), layout: 'content', eyebrow: 'Section', title: '', body: '' }])
  async function uploadSlideImage(sId: string, file: File) {
    setUploadingId(sId); setStatus('Uploading image…')
    const { url, error } = await uploadJournalImage(file)
    setUploadingId(null)
    if (error || !url) { setStatus(`Upload failed: ${error ?? ''}`); return }
    setSlide(sId, { image: url }); setStatus('Image added')
  }

  /* ---- step ops ---- */
  const setStep = (sId: string, patch: Partial<FormStep>) => setSteps((ss) => ss.map((s) => (s.id === sId ? { ...s, ...patch } : s)))
  const removeStep = (sId: string) => setSteps((ss) => ss.filter((s) => s.id !== sId))
  const moveStep = (i: number, dir: -1 | 1) => setSteps((ss) => { const j = i + dir; if (j < 0 || j >= ss.length) return ss; const c = [...ss]; [c[i], c[j]] = [c[j], c[i]]; return c })
  const addStep = () => setSteps((ss) => [...ss, { id: fid(), type: 'text', question: '', help: '' }])

  async function save() {
    if (!doc) return
    setBusy(true); setStatus(null)
    try {
      await updateClientDoc(doc.id, { title, dek, blocks: slides as unknown[], form: steps as unknown[], shared })
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

  /* ---- Export PDF: print the pages full-bleed via a portal outside #root ---- */
  useEffect(() => {
    if (!printing) return
    document.body.classList.add('hh-print-doc')
    // The browser names the saved PDF after document.title: use the cover title.
    const previousTitle = document.title
    document.title = fileNameFromTitle(doc?.title, 'Document')
    const t = setTimeout(() => window.print(), 120)
    const done = () => { document.body.classList.remove('hh-print-doc'); document.title = previousTitle; setPrinting(false) }
    window.addEventListener('afterprint', done)
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done); document.body.classList.remove('hh-print-doc'); document.title = previousTitle }
  }, [printing])

  if (gated) {
    return <EditorShell ctype="Document" subline="Sign in to edit" backTo={`/clients/${clientId}`} onDone={() => {}} doneDisabled rail={<p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Sign in (bottom-left) to edit.</p>} canvas={<div />} />
  }
  if (!doc) {
    return <EditorShell ctype="Document" subline="Loading…" backTo={`/clients/${clientId}`} onDone={() => {}} doneDisabled rail={<p style={{ fontSize: 14, color: 'var(--text-faint)' }}>{status ?? 'Loading…'}</p>} canvas={<div />} />
  }

  const headerExtra = (
    <>
      {!isForm && (
        <button className="hh-btn" onClick={() => setPrinting(true)}
          style={{ background: 'none', border: '1px solid var(--hh-line)', borderRadius: 999, padding: '8px 14px', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {isMobile ? '↧ PDF' : '↧ Download PDF'}
        </button>
      )}
      <button className="hh-btn" onClick={toggleShare}
        style={{ background: shared ? 'var(--status-positive)' : 'none', color: shared ? '#F6EFE4' : 'var(--text-muted)', border: shared ? '1px solid var(--status-positive)' : '1px solid var(--hh-line)', borderRadius: 999, padding: '8px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        {shared ? '✓ Shared' : 'Share'}
      </button>
    </>
  )

  const pagesCanvas = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: isA4 ? 640 : 920 }}>
      {slides.map((sl, i) => (
        <div key={sl.id} style={{ boxShadow: 'var(--shadow-card)', borderRadius: 10 }}>
          <SlideView slide={sl} index={i} total={slides.length} clientName={client?.name ?? 'Client'} format={format} />
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: 'var(--text-faint)', textAlign: 'center' }}>{isA4 ? 'A4 · 210 × 297 mm' : '1920 × 1080'} · viewed full-screen in the client space</div>
    </div>
  )

  const formCanvas = (
    <article style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--hh-line-card)', maxWidth: 760, background: '#FBFAF6' }}>
      <div style={{ background: 'var(--hh-anthracite)', color: '#F4F0E7', padding: isMobile ? '38px 26px' : '54px 56px' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 21 }}>hue&heal<span style={{ color: 'var(--hh-ember)' }}>.</span></div>
        <div style={{ fontSize: 10.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--hh-ember)', margin: '28px 0 12px' }}>{kindLabel} · Hue & Heal × {client?.name ?? 'Client'}</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: isMobile ? 29 : 40, lineHeight: 1.08, margin: 0 }}>{title || `${kindLabel} for ${client?.name ?? 'your client'}`}</h1>
        {dek && <p style={{ fontFamily: 'var(--font-voice)', fontStyle: 'italic', fontSize: 16, lineHeight: 1.5, color: 'rgba(244,240,231,0.72)', margin: '16px 0 0' }}>{dek}</p>}
      </div>
      <div style={{ padding: isMobile ? '10px 22px 30px' : '18px 56px 44px' }}>
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
      </div>
    </article>
  )

  return (
    <>
      <EditorShell
        ctype={kindLabel}
        subline={`Hue & Heal × ${client?.name ?? '…'}${!isForm ? ` · ${slides.length} pages` : ''}`}
        backTo={`/clients/${clientId}`}
        status={status}
        busy={busy}
        onDone={save}
        doneLabel="Save draft"
        view={mView}
        onViewChange={setMView}
        headerExtra={headerExtra}
        previewLabel={isForm ? 'Preview' : 'Pages'}
        rail={
          <div>
            <div style={{ border: '1px solid var(--hh-line)', borderRadius: 14, padding: 16, background: 'var(--hh-bone)' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-accent)', marginBottom: 10 }}>✦ Brief the copilot</div>
              <textarea style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} rows={3} value={aiNotes} onChange={(e) => setAiNotes(e.target.value)}
                placeholder={`Anything this ${kindLabel.toLowerCase()} should cover for ${client?.name ?? 'this client'} (optional)`} />
              <button className="hh-btn" onClick={generate} disabled={aiBusy}
                style={{ marginTop: 10, width: '100%', background: 'var(--hh-copper)', color: 'var(--hh-on-accent, #F6EFE4)', border: 'none', borderRadius: 999, padding: '11px 18px', fontSize: 13, fontWeight: 500, cursor: aiBusy ? 'default' : 'pointer', opacity: aiBusy ? 0.55 : 1 }}>
                {aiBusy ? 'Drafting…' : `✦ Fill this ${isForm ? 'questionnaire' : isA4 ? 'document' : 'deck'}`}
              </button>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>Keeps the structure, written for {client?.name ?? 'the client'} in {brand?.name ?? 'the brand'}’s voice.</div>
            </div>

            {isForm ? (
              <>
                <div style={rail}>Title</div>
                <input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} />
                <div style={rail}>Invitation line</div>
                <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={dek} onChange={(e) => setDek(e.target.value)} placeholder="One line inviting the client in" />
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
            ) : (
              <>
                <div style={rail}>Pages · {slides.length}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {slides.map((sl, i) => (
                    <div key={sl.id} style={{ border: '1px solid var(--hh-line)', borderRadius: 10, padding: 10, background: 'var(--hh-bone)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', flex: 1 }}>Page {i + 1}</span>
                        <select value={sl.layout} onChange={(e) => setSlide(sl.id, { layout: e.target.value as SlideLayout })} style={miniSelect}>
                          {LAYOUTS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
                        </select>
                        <select value={sl.theme ?? (sl.layout === 'cover' ? 'ink' : 'paper')} onChange={(e) => setSlide(sl.id, { theme: e.target.value as SlideTheme })} style={miniSelect}>
                          {THEMES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                        </select>
                        <button className="hh-btn" onClick={() => moveSlide(i, -1)} style={miniBtn}>↑</button>
                        <button className="hh-btn" onClick={() => moveSlide(i, 1)} style={miniBtn}>↓</button>
                        <ConfirmButton onConfirm={() => removeSlide(sl.id)} confirmLabel="Delete page?" style={{ ...miniBtn, border: 'none', opacity: slides.length > 1 ? 1 : 0.4 }}>×</ConfirmButton>
                      </div>
                      <input style={{ ...inp, fontSize: 12.5, marginBottom: 6 }} value={sl.eyebrow ?? ''} placeholder="Eyebrow (section label)" onChange={(e) => setSlide(sl.id, { eyebrow: e.target.value })} />
                      <input style={inp} value={sl.title ?? ''} placeholder="Page title" onChange={(e) => { setSlide(sl.id, { title: e.target.value }); if (sl.layout === 'cover') setTitle(e.target.value) }} />
                      <textarea style={{ ...inp, marginTop: 6, resize: 'vertical', lineHeight: 1.5, fontSize: 13 }} rows={3} value={sl.body ?? ''} placeholder="Body" onChange={(e) => { setSlide(sl.id, { body: e.target.value }); if (sl.layout === 'cover') setDek(e.target.value) }} />
                      {(sl.layout === 'list' || sl.layout === 'terms' || sl.layout === 'timeline') && (
                        <textarea style={{ ...inp, marginTop: 6, resize: 'vertical', fontSize: 12.5 }} rows={3} value={(sl.bullets ?? []).join('\n')} placeholder={sl.layout === 'timeline' ? 'Milestones, one per line' : 'Items, one per line'}
                          onChange={(e) => setSlide(sl.id, { bullets: e.target.value.split('\n') })} />
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        {sl.image && <img src={sl.image} alt="" style={{ height: 28, width: 28, objectFit: 'cover', borderRadius: 5, border: '1px solid var(--hh-line)' }} />}
                        <label className="hh-btn" style={{ ...miniBtn, width: 'auto', padding: '6px 10px', fontSize: 11, cursor: uploadingId === sl.id ? 'default' : 'pointer', opacity: uploadingId === sl.id ? 0.6 : 1 }}>
                          {uploadingId === sl.id ? 'Uploading…' : sl.image ? 'Replace image' : '⭱ Image'}
                          <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingId === sl.id} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSlideImage(sl.id, f); e.currentTarget.value = '' }} />
                        </label>
                        {sl.image && <button className="hh-btn" onClick={() => setSlide(sl.id, { image: undefined })} style={{ ...miniBtn, width: 'auto', padding: '6px 10px', fontSize: 11 }}>Remove</button>}
                      </div>
                    </div>
                  ))}
                </div>
                <button className="hh-btn" onClick={addSlide} style={{ ...miniBtn, width: 'auto', padding: '7px 12px', fontSize: 11.5, marginTop: 8 }}>＋ Add page</button>
              </>
            )}
          </div>
        }
        canvas={isForm ? formCanvas : pagesCanvas}
      />

      {/* PDF export: pages rendered full-bleed in print only. The wrapper holds
          the exact page size (a hair under @page to defeat rounding spill). */}
      {printing && createPortal(
        <div id="hh-doc-print">
          <style>{`@media print { @page { size: ${isA4 ? '210mm 297mm' : '297mm 167.1mm'}; margin: 0; } }`}</style>
          {slides.map((sl, i) => (
            <div key={sl.id} className="hh-print-page" style={{ width: isA4 ? '210mm' : '297mm', height: isA4 ? '296.6mm' : '166.7mm' }}>
              <SlideView slide={sl} index={i} total={slides.length} clientName={client?.name ?? 'Client'} format={format} />
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}

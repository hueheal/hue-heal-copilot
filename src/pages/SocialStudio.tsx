import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PillButton } from '../components/PageHeader'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getPost, updatePost, generateImage, analyzeReference, IMAGE_PRESETS, SECTOR_LABEL, type Post } from '../lib/socialCopilot'
import { listBrands, resolveActiveBrand, getActiveBrandId, setActiveBrandId, type BrandProfile } from '../lib/brand'
import { INSTAGRAM_FORMAT_LIST, INSTAGRAM_FORMATS, type InstaFormat } from '../lib/social/formats'
import { TEMPLATES, buildDesign, templateById, type ContentSlideInput } from '../lib/social/templates'
import { captureNode, downloadDataUrl, zipPngs } from '../lib/social/exportImage'
import {
  type Design, type Slide, type DesignElement, type ElStyle, type FontKey,
  accentHex, fontVar, eid, isDesign,
} from '../lib/social/design'
import type { Accent } from '../lib/database.types'

const PALETTE = ['#1E1B18', '#3A2E25', '#8A6A52', '#C6B7A2', '#ECE6DA', '#F4F0E7', '#B5632F', '#CE8A53', '#D2DC4E', '#9A4A26']
const FONTS: { key: FontKey; label: string }[] = [
  { key: 'serif', label: 'Ivy Ora' }, { key: 'sans', label: 'Poppins' }, { key: 'voice', label: 'Italic' },
]

/* ---------- Slide canvas (shared by editor + offscreen export) ---------- */
function SlideCanvas({
  slide, spec, displayW, interactive, selectedId, onSelectEl, onElPointerDown, onResizePointerDown, innerRef,
}: {
  slide: Slide
  spec: { w: number; h: number }
  displayW: number
  interactive?: boolean
  selectedId?: string | null
  onSelectEl?: (id: string | null) => void
  onElPointerDown?: (id: string, e: React.PointerEvent) => void
  onResizePointerDown?: (id: string, e: React.PointerEvent) => void
  innerRef?: (n: HTMLDivElement | null) => void
}) {
  const scale = displayW / spec.w
  const displayH = displayW * (spec.h / spec.w)
  const bg = slide.background
  const bgStyle: React.CSSProperties =
    bg.type === 'solid' ? { background: bg.value }
    : bg.type === 'image' ? { backgroundImage: `url("${bg.value}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {}
  return (
    <div
      ref={innerRef}
      className={bg.type === 'atmos' ? 'hh-atmos' : undefined}
      onPointerDown={interactive ? () => onSelectEl?.(null) : undefined}
      style={{ position: 'relative', width: displayW, height: displayH, overflow: 'hidden', flexShrink: 0, ...bgStyle }}
    >
      {slide.scrim && slide.scrim !== 'none' && (() => {
        const s = (slide.scrimStrength ?? 55) / 100
        const bg = slide.scrim === 'gradient'
          ? `linear-gradient(to bottom, rgba(20,17,14,${(0.25 * s).toFixed(3)}) 0%, rgba(20,17,14,0) 28%, rgba(20,17,14,0) 46%, rgba(20,17,14,${Math.min(0.97, s + 0.15).toFixed(3)}) 100%)`
          : `rgba(20,17,14,${Math.min(0.9, s * 0.95).toFixed(3)})`
        return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: bg }} />
      })()}
      {slide.elements.map((el) => {
        const selected = interactive && selectedId === el.id
        const common: React.CSSProperties = {
          position: 'absolute', left: `${el.box.x}%`, top: `${el.box.y}%`, width: `${el.box.w}%`,
          opacity: el.style.opacity ?? 1, cursor: interactive ? 'move' : 'default',
          outline: selected ? '1.5px solid var(--hh-copper)' : 'none', outlineOffset: 2,
        }
        const startDrag = interactive
          ? (e: React.PointerEvent) => { e.stopPropagation(); onSelectEl?.(el.id); onElPointerDown?.(el.id, e) }
          : undefined
        let inner: React.ReactNode = null
        if (el.type === 'text') {
          const hasPlate = el.style.plate && el.style.plate !== 'none'
          const plateBg = el.style.plate === 'light' ? 'rgba(244,240,231,0.92)' : 'rgba(20,17,14,0.55)'
          inner = (
            <div style={{
              fontFamily: fontVar(el.style.fontKey), fontSize: (el.style.fontSize ?? 40) * scale,
              fontWeight: el.style.fontWeight ?? 400, color: el.style.color ?? '#1E1B18',
              textAlign: el.style.align ?? 'left', lineHeight: el.style.lineHeight ?? 1.1,
              letterSpacing: `${el.style.letterSpacing ?? 0}em`, fontStyle: el.style.italic ? 'italic' : 'normal',
              textTransform: el.style.uppercase ? 'uppercase' : 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              background: hasPlate ? plateBg : 'transparent',
              padding: hasPlate ? `${10 * scale}px ${14 * scale}px` : 0,
              borderRadius: hasPlate ? 10 * scale : 0,
            }}>{el.content || ' '}</div>
          )
        } else if (el.type === 'pill') {
          inner = (
            <div style={{ width: '100%', textAlign: el.style.align ?? 'center' }}>
              <span style={{
                display: 'inline-block',
                background: 'rgba(244,240,231,0.16)',
                backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                border: '1px solid rgba(244,240,231,0.30)',
                borderRadius: 999,
                padding: `${8 * scale}px ${20 * scale}px`,
                fontFamily: fontVar(el.style.fontKey ?? 'voice'),
                fontStyle: 'italic',
                fontSize: (el.style.fontSize ?? 32) * scale,
                color: el.style.color ?? '#F4F0E7',
                whiteSpace: 'nowrap',
              }}>{el.content}</span>
            </div>
          )
        } else if (el.type === 'shape') {
          inner = <div style={{ width: '100%', height: displayH * (el.box.h / 100), background: el.style.bg ?? '#000', borderRadius: `${el.style.radius ?? 0}%` }} />
        } else {
          inner = <img src={el.content} alt="" style={{ width: '100%', height: displayH * (el.box.h / 100), objectFit: 'cover', borderRadius: `${el.style.radius ?? 0}%` }} />
        }
        return (
          <div key={el.id} style={common} onPointerDown={startDrag}>
            {inner}
            {selected && (
              <div
                onPointerDown={(e) => { e.stopPropagation(); onResizePointerDown?.(el.id, e) }}
                style={{ position: 'absolute', right: -6, bottom: -6, width: 12, height: 12, background: 'var(--hh-copper)', borderRadius: 3, cursor: 'nwse-resize' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Editor ---------- */
export default function SocialStudio() {
  const { id } = useParams()
  const nav = useNavigate()
  const auth = useAuth()
  const [post, setPost] = useState<Post | null>(null)
  const [design, setDesign] = useState<Design | null>(null)
  const [active, setActive] = useState(0)
  const [selId, setSelId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [imgPreset, setImgPreset] = useState('editorial')
  const [imgNotes, setImgNotes] = useState('')
  const [brands, setBrands] = useState<BrandProfile[]>([])
  const [brandId, setBrandId] = useState<string | null>(getActiveBrandId())

  useEffect(() => { listBrands().then(setBrands).catch(() => {}) }, [])

  const canvasRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ id: string; mode: 'move' | 'resize'; sx: number; sy: number; box: DesignElement['box'] } | null>(null)

  useEffect(() => {
    if (!id) return
    getPost(id).then((p) => {
      if (!p) { setStatus('Could not load post'); return }
      setPost(p)
      const seed = { headline: p.headline || p.topic, sector: SECTOR_LABEL[p.sector], accent: p.accent }
      const fmt: InstaFormat = (p.format === 'square' || p.format === 'portrait' || p.format === 'story' || p.format === 'carousel') ? p.format : 'portrait'
      const content = (p.slides ?? []) as ContentSlideInput[]
      setDesign(isDesign(p.design) ? (p.design as unknown as Design) : buildDesign(fmt, 'guide', seed, 3, content))
    }).catch(() => setStatus('Could not load post'))
  }, [id])

  const spec = useMemo(() => (design ? INSTAGRAM_FORMATS[design.format] : INSTAGRAM_FORMATS.portrait), [design])
  const displayW = useMemo(() => Math.min(520, (600 * spec.w) / spec.h), [spec])

  // Drag / resize listeners — declared before any early return (Rules of Hooks).
  // Uses a functional setDesign so it needs no later-defined closures.
  useEffect(() => {
    function move(e: PointerEvent) {
      const d = drag.current
      if (!d || !canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      const dx = ((e.clientX - d.sx) / rect.width) * 100
      const dy = ((e.clientY - d.sy) / rect.height) * 100
      const clamp = (v: number) => Math.max(0, Math.min(100, v))
      setDesign((prev) => {
        if (!prev) return prev
        const slides = prev.slides.map((s, i) => {
          if (i !== active) return s
          return {
            ...s,
            elements: s.elements.map((el) =>
              el.id !== d.id
                ? el
                : {
                    ...el,
                    box:
                      d.mode === 'move'
                        ? { ...d.box, x: clamp(d.box.x + dx), y: clamp(d.box.y + dy) }
                        : { ...d.box, w: Math.max(4, Math.min(100, d.box.w + dx)), h: Math.max(1, d.box.h + dy) },
                  },
            ),
          }
        })
        return { ...prev, slides }
      })
    }
    function up() { drag.current = null }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [active])

  if (!design || !post) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>{status ?? 'Loading studio…'}</div>

  const slide = design.slides[active] ?? design.slides[0]
  const selEl = slide.elements.find((e) => e.id === selId) ?? null

  /* ---- mutation helpers ---- */
  const commit = (d: Design) => setDesign({ ...d })
  const updateSlide = (patch: Partial<Slide>) => {
    const slides = design.slides.map((s, i) => (i === active ? { ...s, ...patch } : s))
    commit({ ...design, slides })
  }
  const updateEl = (elId: string, patch: Partial<DesignElement>) =>
    updateSlide({ elements: slide.elements.map((e) => (e.id === elId ? { ...e, ...patch } : e)) })
  const updateElStyle = (elId: string, patch: ElStyle) => {
    const el = slide.elements.find((e) => e.id === elId)
    if (el) updateEl(elId, { style: { ...el.style, ...patch } })
  }

  /* ---- drag / resize via pointer ---- */
  function onElPointerDown(elId: string, e: React.PointerEvent) {
    const el = slide.elements.find((x) => x.id === elId)
    if (!el) return
    drag.current = { id: elId, mode: 'move', sx: e.clientX, sy: e.clientY, box: { ...el.box } }
  }
  function onResizePointerDown(elId: string, e: React.PointerEvent) {
    const el = slide.elements.find((x) => x.id === elId)
    if (!el) return
    drag.current = { id: elId, mode: 'resize', sx: e.clientX, sy: e.clientY, box: { ...el.box } }
  }

  /* ---- actions ---- */
  const contentSlides = (post.slides ?? []) as ContentSlideInput[]
  function applyFormat(f: InstaFormat) {
    const seed = { headline: post!.headline || post!.topic, sector: SECTOR_LABEL[post!.sector], accent: design!.accent }
    setDesign(buildDesign(f, design!.templateId, seed, 3, contentSlides))
    setActive(0); setSelId(null)
  }
  // Switching template only restyles the COVER — content slides are left intact,
  // and edited text is carried over by matching element roles + the current accent.
  function applyTemplate(tid: string) {
    const seed = { headline: post!.headline || post!.topic, sector: SECTOR_LABEL[post!.sector], accent: design!.accent }
    const cover = templateById(tid).build(design!.format, seed)
    const old = design!.slides[0]
    const accNew = accentHex(design!.accent)
    const elements = cover.elements.map((ne) => {
      const preserved = ne.role ? old.elements.find((oe) => oe.role === ne.role) : undefined
      let el = preserved ? { ...ne, content: preserved.content } : ne
      if (el.accentRef) el = { ...el, style: { ...el.style, ...(el.type === 'shape' ? { bg: accNew } : { color: accNew }) } }
      return el
    })
    const mergedCover: Slide = { ...cover, elements, background: old.background, scrim: old.scrim, scrimStrength: old.scrimStrength }
    commit({ ...design!, templateId: tid, slides: [mergedCover, ...design!.slides.slice(1)] })
    setSelId(null)
  }
  // Accent switch recolours every accent-driven element across all slides.
  function applyAccent(a: Accent) {
    const newHex = accentHex(a)
    const slides = design!.slides.map((s) => ({
      ...s,
      elements: s.elements.map((el) =>
        el.accentRef ? { ...el, style: { ...el.style, ...(el.type === 'shape' ? { bg: newHex } : { color: newHex }) } } : el,
      ),
    }))
    commit({ ...design!, accent: a, slides })
  }
  function setBackground(bg: Slide['background']) { updateSlide({ background: bg }) }
  function addText() {
    const el: DesignElement = { id: eid('t'), type: 'text', box: { x: 10, y: 45, w: 60, h: 10 }, style: { color: '#F4F0E7', fontKey: 'serif', fontSize: 56, fontWeight: 300 }, content: 'New text' }
    updateSlide({ elements: [...slide.elements, el] }); setSelId(el.id)
  }
  function addPill() {
    const el: DesignElement = { id: eid('pill'), type: 'pill', box: { x: 30, y: 46, w: 40, h: 6 }, style: { color: '#F4F0E7', fontKey: 'voice', fontSize: 34, align: 'center' }, content: 'Part 1: Classrooms', role: 'pill' }
    updateSlide({ elements: [...slide.elements, el] }); setSelId(el.id)
  }
  function deleteEl(elId: string) { updateSlide({ elements: slide.elements.filter((e) => e.id !== elId) }); setSelId(null) }
  function addSlide() {
    const clone: Slide = { ...slide, id: eid('slide'), elements: slide.elements.map((e) => ({ ...e, id: eid('el') })) }
    const slides = [...design!.slides]; slides.splice(active + 1, 0, clone)
    commit({ ...design!, slides }); setActive(active + 1)
  }
  function removeSlide(i: number) {
    if (design!.slides.length <= 1) return
    const slides = design!.slides.filter((_, j) => j !== i)
    commit({ ...design!, slides }); setActive(Math.max(0, i - 1))
  }

  async function uploadImage(file: File) {
    if (!supabase || !auth.session) {
      setBackground({ type: 'image', value: URL.createObjectURL(file) }) // local preview
      return
    }
    setBusy(true); setStatus('Uploading…')
    try {
      const path = `${auth.session.user.id}/${post!.id}/up-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`
      const { error } = await supabase.storage.from('social-assets').upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('social-assets').getPublicUrl(path)
      setBackground({ type: 'image', value: data.publicUrl }); setStatus('Image added')
    } catch (e) { setStatus(`Upload failed: ${e instanceof Error ? e.message : e}`) } finally { setBusy(false) }
  }
  async function aiBackground() {
    setBusy(true); setStatus('Generating background… (10–20s)')
    try {
      const brand = brands.find((b) => b.id === brandId) ?? resolveActiveBrand(brands)
      const { url, error } = await generateImage(
        post!.id,
        { topic: post!.topic, format: post!.format, sector: post!.sector, accent: design!.accent },
        { preset: imgPreset, inspiration: imgNotes, masterPrompt: brand?.image_master_prompt, negatives: brand?.image_negatives },
      )
      if (url) { setBackground({ type: 'image', value: url }); setStatus('Background generated') }
      else setStatus(`AI image failed: ${error ?? 'unknown'}`)
    } finally { setBusy(false) }
  }
  async function onReference(file: File) {
    setBusy(true); setStatus('Reading reference with Claude…')
    try {
      const { description, error } = await analyzeReference(file)
      if (description) { setImgNotes(description); setStatus('Reference captured — hit Generate image to apply.') }
      else setStatus(`Reference failed: ${error ?? 'unknown'}`)
    } finally { setBusy(false) }
  }

  async function save() {
    setBusy(true); setStatus(null)
    try {
      await updatePost(post!.id, { design: design as unknown as Record<string, unknown>, format: design!.format, platform: 'instagram', accent: design!.accent })
      setStatus('Saved')
    } catch (e) { setStatus(`Couldn’t save: ${e instanceof Error ? e.message : e}`) } finally { setBusy(false) }
  }
  async function exportImages() {
    if (!canvasRef.current) return
    setBusy(true); setStatus('Exporting…')
    try {
      const base = (post!.headline || post!.topic || 'post').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'post'
      if (design!.format === 'carousel' && design!.slides.length > 1) {
        const urls: string[] = []
        const orig = active
        for (let i = 0; i < design!.slides.length; i++) {
          setActive(i)
          await new Promise((r) => setTimeout(r, 200)) // let the active slide render
          if (canvasRef.current) urls.push(await captureNode(canvasRef.current, spec.w))
        }
        setActive(orig)
        await zipPngs(urls, base)
      } else {
        downloadDataUrl(await captureNode(canvasRef.current, spec.w), `${base}.png`)
      }
      setStatus('Exported')
    } catch (e) { setStatus(`Export failed: ${e instanceof Error ? e.message : e}`) } finally { setBusy(false) }
  }

  const railLabel: React.CSSProperties = { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', margin: '18px 0 8px' }
  const chip = (activeC: boolean): React.CSSProperties => ({ borderRadius: 999, padding: '7px 13px', fontSize: 12, border: activeC ? '1px solid var(--hh-anthracite)' : '1px solid var(--hh-line)', background: activeC ? 'var(--hh-anthracite)' : 'transparent', color: activeC ? 'var(--text-on-ink)' : 'var(--text-body)' })

  return (
    <div>
      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 32px', borderBottom: '1px solid var(--hh-line)' }}>
        <button onClick={() => nav('/social')} className="hh-btn" style={{ background: 'none', border: 'none', color: 'var(--hh-copper)', fontSize: 13 }}>⟵ Social</button>
        <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>{spec.label} · {spec.w}×{spec.h}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {status && <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{status}</span>}
          <PillButton tone="ghost" onClick={save}>{busy ? '…' : 'Save'}</PillButton>
          <PillButton tone="ink" onClick={exportImages}>↧ Export {design.format === 'carousel' ? 'ZIP' : 'PNG'}</PillButton>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 0, minHeight: 'calc(100vh - 60px)' }}>
        {/* control rail */}
        <div style={{ borderRight: '1px solid var(--hh-line)', padding: '4px 20px 40px', overflowY: 'auto', maxHeight: 'calc(100vh - 60px)' }}>
          <div style={railLabel}>Format</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {INSTAGRAM_FORMAT_LIST.map((f) => (
              <button key={f.key} className="hh-btn" onClick={() => applyFormat(f.key)} style={chip(design.format === f.key)}>{f.label}</button>
            ))}
          </div>

          <div style={railLabel}>Template</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TEMPLATES.map((t) => (
              <button key={t.id} className="hh-btn" onClick={() => applyTemplate(t.id)} style={chip(design.templateId === t.id)}>{t.label}</button>
            ))}
          </div>

          <div style={railLabel}>Background</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            <button className="hh-btn" onClick={() => setBackground({ type: 'atmos', value: 'atmos' })} style={chip(slide.background.type === 'atmos')}>Atmos</button>
            <label className="hh-btn" style={{ ...chip(false), cursor: 'pointer' }}>
              Upload<input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
            </label>
          </div>

          {brands.length > 0 && (
            <>
              <div style={{ ...railLabel, marginTop: 12 }}>Creative direction</div>
              <select
                value={brands.find((b) => b.id === brandId) ? brandId! : (resolveActiveBrand(brands)?.id ?? '')}
                onChange={(e) => { setBrandId(e.target.value); setActiveBrandId(e.target.value) }}
                style={{ width: '100%', border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, fontFamily: 'var(--font-sans)' }}
              >
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}{b.is_default ? ' · default' : ''}</option>)}
              </select>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>Edit brand looks in Settings.</div>
            </>
          )}

          <div style={{ ...railLabel, marginTop: 12 }}>AI image · style</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {IMAGE_PRESETS.map((p) => (
              <button key={p.key} className="hh-btn" onClick={() => setImgPreset(p.key)} style={chip(imgPreset === p.key)}>{p.label}</button>
            ))}
          </div>
          <textarea
            value={imgNotes}
            onChange={(e) => setImgNotes(e.target.value)}
            placeholder="Inspiration / art-direction notes (optional)"
            rows={2}
            style={{ width: '100%', border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, fontFamily: 'var(--font-sans)', marginTop: 8, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
            <button className="hh-btn" onClick={aiBackground} style={{ background: 'var(--hh-copper)', color: '#F6EFE4', border: 'none', borderRadius: 999, padding: '8px 16px', fontSize: 12.5 }}>
              ✦ Generate image
            </button>
            <label className="hh-btn" style={{ background: 'none', border: '1px solid var(--hh-line)', borderRadius: 999, padding: '8px 14px', fontSize: 12.5, color: 'var(--text-muted)', cursor: 'pointer' }}>
              ↥ Match a reference
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && onReference(e.target.files[0])} />
            </label>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PALETTE.map((c) => (
              <button key={c} onClick={() => setBackground({ type: 'solid', value: c })} title={c}
                style={{ width: 22, height: 22, borderRadius: 6, background: c, border: slide.background.type === 'solid' && slide.background.value === c ? '2px solid var(--hh-copper)' : '1px solid var(--hh-line)' }} />
            ))}
          </div>

          <div style={railLabel}>Legibility</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['none', 'gradient', 'shade'] as const).map((sc) => (
              <button key={sc} className="hh-btn" onClick={() => updateSlide({ scrim: sc, scrimStrength: slide.scrimStrength ?? 55 })} style={chip((slide.scrim ?? 'none') === sc)}>
                {sc === 'none' ? 'None' : sc === 'gradient' ? 'Gradient' : 'Shade'}
              </button>
            ))}
          </div>
          {slide.scrim && slide.scrim !== 'none' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Intensity</span>
              <input type="range" min={10} max={100} value={slide.scrimStrength ?? 55} onChange={(e) => updateSlide({ scrimStrength: Number(e.target.value) })} style={{ flex: 1 }} />
            </div>
          )}

          <div style={railLabel}>Add</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="hh-btn" onClick={addText} style={chip(false)}>＋ Text</button>
            <button className="hh-btn" onClick={addPill} style={chip(false)}>＋ Glass pill</button>
          </div>

          {/* selected element */}
          {selEl && (selEl.type === 'text' || selEl.type === 'pill') && (
            <>
              <div style={railLabel}>Text</div>
              <textarea value={selEl.content} onChange={(e) => updateEl(selEl.id, { content: e.target.value })} rows={2}
                style={{ width: '100%', border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'var(--font-sans)', resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {FONTS.map((f) => (
                  <button key={f.key} className="hh-btn" onClick={() => updateElStyle(selEl.id, { fontKey: f.key })} style={chip(selEl.style.fontKey === f.key)}>{f.label}</button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Size</span>
                <input type="range" min={16} max={200} value={selEl.style.fontSize ?? 48} onChange={(e) => updateElStyle(selEl.id, { fontSize: Number(e.target.value) })} style={{ flex: 1 }} />
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                {(['left', 'center', 'right'] as const).map((a) => (
                  <button key={a} className="hh-btn" onClick={() => updateElStyle(selEl.id, { align: a })} style={chip(selEl.style.align === a)}>{a[0].toUpperCase()}</button>
                ))}
                <button className="hh-btn" onClick={() => updateElStyle(selEl.id, { italic: !selEl.style.italic })} style={chip(!!selEl.style.italic)}>Italic</button>
                <button className="hh-btn" onClick={() => updateElStyle(selEl.id, { uppercase: !selEl.style.uppercase })} style={chip(!!selEl.style.uppercase)}>AA</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {PALETTE.map((c) => (
                  <button key={c} onClick={() => updateElStyle(selEl.id, { color: c })} title={c}
                    style={{ width: 20, height: 20, borderRadius: 5, background: c, border: selEl.style.color === c ? '2px solid var(--hh-copper)' : '1px solid var(--hh-line)' }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Backing</span>
                {(['none', 'dark', 'light'] as const).map((pl) => (
                  <button key={pl} className="hh-btn" onClick={() => updateElStyle(selEl.id, { plate: pl })} style={chip((selEl.style.plate ?? 'none') === pl)}>
                    {pl === 'none' ? 'None' : pl === 'dark' ? 'Dark' : 'Light'}
                  </button>
                ))}
              </div>
              <button className="hh-btn" onClick={() => deleteEl(selEl.id)} style={{ marginTop: 12, background: 'none', border: '1px solid var(--hh-line)', borderRadius: 999, padding: '7px 14px', fontSize: 12, color: 'var(--text-muted)' }}>Delete element</button>
            </>
          )}

          <div style={railLabel}>Accent</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['lime', 'terracotta', 'copper'] as Accent[]).map((a) => (
              <button key={a} onClick={() => applyAccent(a)} title={a}
                style={{ width: 24, height: 24, borderRadius: '50%', background: accentHex(a), border: design.accent === a ? '2px solid var(--hh-anthracite)' : '1px solid var(--hh-line)' }} />
            ))}
          </div>
        </div>

        {/* canvas stage */}
        <div style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, overflowY: 'auto', maxHeight: 'calc(100vh - 60px)', background: 'var(--hh-monterey)' }}>
          <div style={{ boxShadow: 'var(--shadow-raised)', borderRadius: 4, overflow: 'hidden' }}>
            <SlideCanvas
              slide={slide} spec={spec} displayW={displayW} interactive
              selectedId={selId} onSelectEl={setSelId}
              onElPointerDown={onElPointerDown} onResizePointerDown={onResizePointerDown}
              innerRef={(n) => (canvasRef.current = n)}
            />
          </div>

          {design.format === 'carousel' && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              {design.slides.map((s, i) => (
                <div key={s.id} onClick={() => { setActive(i); setSelId(null) }}
                  style={{ border: i === active ? '2px solid var(--hh-copper)' : '1px solid var(--hh-line)', borderRadius: 4, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}>
                  <SlideCanvas slide={s} spec={spec} displayW={72} />
                  {design.slides.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); removeSlide(i) }} style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: 4, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', fontSize: 11, lineHeight: 1 }}>×</button>
                  )}
                </div>
              ))}
              <button className="hh-btn" onClick={addSlide} style={{ ...chip(false), height: 40 }}>＋ Slide</button>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

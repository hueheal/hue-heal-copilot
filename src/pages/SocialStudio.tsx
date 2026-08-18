import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import EditorShell from '../components/EditorShell'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getPost, updatePost, generateCopy, generateImage, analyzeReference, publishToInstagram, IMAGE_PRESETS, SECTOR_LABEL, type Post } from '../lib/socialCopilot'
import ConfirmButton from '../components/ConfirmButton'
import { listBrands, resolveActiveBrand, getActiveBrandId, type BrandProfile } from '../lib/brand'
import { useBrand } from '../lib/brandContext'
import { INSTAGRAM_FORMAT_LIST, INSTAGRAM_FORMATS, type InstaFormat } from '../lib/social/formats'
import { templatesFor, defaultTemplateFor, fontsFor, buildDesign, templateById, type ContentSlideInput } from '../lib/social/templates'
import { REMEDAE_PALETTE, isRemedae } from '../lib/social/remedae'
import { resolveStyle } from '../lib/social/style'
import { TYPE_ROLES, CANVAS_TYPE_SIZE } from '../lib/typeScale'
import { useIsMobile } from '../lib/useIsMobile'
import { captureNode, captureNodeJpeg, dataUrlToBlob, downloadDataUrl, zipPngs } from '../lib/social/exportImage'
import {
  type Design, type Slide, type DesignElement, type ElStyle, type FontKey, type FontPair,
  accentHex, fontVar, eid, isDesign, splitHighlights,
} from '../lib/social/design'
import type { Accent } from '../lib/database.types'

const HOUSE_PALETTE = ['#1E1B18', '#3A2E25', '#8A6A52', '#C6B7A2', '#ECE6DA', '#F4F0E7', '#B5632F', '#CE8A53', '#D2DC4E', '#9A4A26']
const HOUSE_FONTS: { key: FontKey; label: string }[] = [
  { key: 'serif', label: 'Ivy Ora' }, { key: 'sans', label: 'Poppins' }, { key: 'voice', label: 'Italic' },
]
const REMEDAE_FONT_LABELS: { key: FontKey; label: string }[] = [
  { key: 'serif', label: 'Quando' }, { key: 'sans', label: 'Poppins' }, { key: 'voice', label: 'Italic' },
]

/* The shared type scale rendered at social-canvas px. */
const TYPE_SCALE: { label: string; size: number }[] = TYPE_ROLES.map((label) => ({ label, size: CANVAS_TYPE_SIZE[label] }))

/* ---------- Slide canvas (shared by editor + offscreen export) ---------- */
export function SlideCanvas({
  slide, spec, displayW, interactive, selectedId, onSelectEl, onElPointerDown, onResizePointerDown, innerRef, fonts,
}: {
  slide: Slide
  spec: { w: number; h: number }
  /** Brand-world font pairing (Remedae: Quando + Poppins); absent = house fonts. */
  fonts?: FontPair
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
        const c = slide.scrimTint ?? '20,17,14'
        const bg = slide.scrim === 'gradient'
          ? `linear-gradient(to bottom, rgba(${c},${(0.25 * s).toFixed(3)}) 0%, rgba(${c},0) 28%, rgba(${c},0) 46%, rgba(${c},${Math.min(0.97, s + 0.15).toFixed(3)}) 100%)`
          : `rgba(${c},${Math.min(0.9, s * 0.95).toFixed(3)})`
        return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: bg }} />
      })()}
      {slide.elements.map((el) => {
        const selected = interactive && selectedId === el.id
        const common: React.CSSProperties = {
          position: 'absolute', left: `${el.box.x}%`, top: `${el.box.y}%`, width: `${el.box.w}%`,
          opacity: el.style.opacity ?? 1, cursor: interactive ? 'move' : 'default',
          outline: selected ? '1.5px solid var(--hh-copper)' : 'none', outlineOffset: 2,
          // Let a touch drag move the element instead of scrolling the page.
          touchAction: interactive ? 'none' : undefined,
        }
        const startDrag = interactive
          ? (e: React.PointerEvent) => { e.stopPropagation(); onSelectEl?.(el.id); onElPointerDown?.(el.id, e) }
          : undefined
        let inner: React.ReactNode = null
        if (el.type === 'text') {
          const hasPlate = el.style.plate && el.style.plate !== 'none'
          const plateBg = el.style.plate === 'light' ? 'rgba(244,240,231,0.92)' : 'rgba(20,17,14,0.55)'
          const parts = el.style.hl ? splitHighlights(el.content || ' ') : [{ text: el.content || ' ', hl: false }]
          inner = (
            <div style={{
              fontFamily: fontVar(el.style.fontKey, fonts), fontSize: (el.style.fontSize ?? 40) * scale,
              fontWeight: el.style.fontWeight ?? 400, color: el.style.color ?? '#1E1B18',
              textAlign: el.style.align ?? 'left', lineHeight: el.style.lineHeight ?? 1.1,
              letterSpacing: `${el.style.letterSpacing ?? 0}em`, fontStyle: el.style.italic ? 'italic' : 'normal',
              textTransform: el.style.uppercase ? 'uppercase' : 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              textDecoration: el.style.strike ? 'line-through' : 'none',
              background: hasPlate ? plateBg : 'transparent',
              padding: hasPlate ? `${10 * scale}px ${14 * scale}px` : 0,
              borderRadius: hasPlate ? 10 * scale : 0,
            }}>{parts.map((p, i) => p.hl ? <span key={i} style={{ color: el.style.hl, fontStyle: 'italic' }}>{p.text}</span> : <React.Fragment key={i}>{p.text}</React.Fragment>)}</div>
          )
        } else if (el.type === 'pill') {
          // House pill = glass + italic voice. A styled pill (bg/border/fontKey set)
          // follows its own style so brand worlds can have their own chip language.
          const styled = Boolean(el.style.bg || el.style.border || (el.style.fontKey && el.style.fontKey !== 'voice'))
          const border = el.style.border ? el.style.border.replace(/^(\d+(?:\.\d+)?)px/, (_m, n) => `${Number(n) * scale}px`) : '1px solid rgba(244,240,231,0.30)'
          inner = (
            <div style={{ width: '100%', textAlign: el.style.align ?? 'center' }}>
              <span style={{
                display: 'inline-block',
                background: el.style.bg ?? 'rgba(244,240,231,0.16)',
                backdropFilter: styled ? undefined : 'blur(6px)', WebkitBackdropFilter: styled ? undefined : 'blur(6px)',
                border,
                borderRadius: el.style.radiusPx != null ? el.style.radiusPx * scale : 999,
                padding: `${8 * scale}px ${20 * scale}px`,
                fontFamily: fontVar(el.style.fontKey ?? 'voice', fonts),
                fontStyle: el.style.italic ?? !styled ? 'italic' : 'normal',
                fontWeight: el.style.fontWeight ?? 400,
                fontSize: (el.style.fontSize ?? 32) * scale,
                letterSpacing: `${el.style.letterSpacing ?? 0}em`,
                textTransform: el.style.uppercase ? 'uppercase' : 'none',
                color: el.style.color ?? '#F4F0E7',
                whiteSpace: 'nowrap',
              }}>{el.content}</span>
            </div>
          )
        } else if (el.type === 'shape') {
          const border = el.style.border ? el.style.border.replace(/^(\d+(?:\.\d+)?)px/, (_m, n) => `${Number(n) * scale}px`) : undefined
          inner = <div style={{ width: '100%', height: displayH * (el.box.h / 100), background: el.style.bg ?? '#000', borderRadius: el.style.radiusPx != null ? el.style.radiusPx * scale : `${el.style.radius ?? 0}%`, border, boxSizing: 'border-box' }} />
        } else if (el.type === 'logo') {
          inner = (
            <img
              src={el.content}
              alt=""
              crossOrigin="anonymous"
              style={{
                width: '100%', height: displayH * (el.box.h / 100),
                objectFit: 'contain',
                objectPosition: el.style.align === 'center' ? 'center' : el.style.align === 'right' ? 'right' : 'left',
              }}
            />
          )
        } else {
          inner = <img src={el.content} alt="" crossOrigin="anonymous" style={{ width: '100%', height: displayH * (el.box.h / 100), objectFit: 'cover', borderRadius: el.style.radiusPx != null ? el.style.radiusPx * scale : `${el.style.radius ?? 0}%`, opacity: 1 }} />
        }
        return (
          <div key={el.id} style={common} onPointerDown={startDrag}>
            {inner}
            {selected && (
              <div
                onPointerDown={(e) => { e.stopPropagation(); onResizePointerDown?.(el.id, e) }}
                style={{ position: 'absolute', right: -9, bottom: -9, width: 18, height: 18, background: 'var(--hh-copper)', borderRadius: 4, cursor: 'nwse-resize', touchAction: 'none', border: '2px solid #fff' }}
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
  const [brandId] = useState<string | null>(getActiveBrandId())
  const [mView, setMView] = useState<'edit' | 'preview'>('preview') // mobile opens on the canvas
  const [copyTopic, setCopyTopic] = useState('')
  const [copyBusy, setCopyBusy] = useState(false)
  const { current: brandWorld } = useBrand()

  useEffect(() => { listBrands().then(setBrands).catch(() => {}) }, [])

  const canvasRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ id: string; mode: 'move' | 'resize'; sx: number; sy: number; box: DesignElement['box'] } | null>(null)

  useEffect(() => {
    if (!id) return
    getPost(id).then((p) => {
      if (!p) { setStatus('Could not load post'); return }
      setPost(p)
      setCopyTopic(p.topic || '')
      const seed = { headline: p.headline || p.topic, sector: SECTOR_LABEL[p.sector], accent: p.accent, brandName: brandWorld?.name, logoUrl: brandWorld?.logo_url ?? undefined, style: resolveStyle(brandWorld ?? undefined), coverImage: p.image_url ?? undefined, website: brandWorld?.website ?? undefined, dek: (p.caption ?? '').split(/\n/)[0]?.slice(0, 160) || undefined }
      const fmt: InstaFormat = (p.format === 'square' || p.format === 'portrait' || p.format === 'story' || p.format === 'carousel') ? p.format : 'portrait'
      const content = (p.slides ?? []) as ContentSlideInput[]
      // A draft that arrives with a cover photo (e.g. the daily automated posts, an
      // article hero) opens in the workspace's photo-led template; otherwise its
      // text-led default. Each brand world has its own family.
      const seedTemplate = defaultTemplateFor(brandWorld?.name, fmt, Boolean(p.image_url))
      const loaded = isDesign(p.design) ? (p.design as unknown as Design) : buildDesign(fmt, seedTemplate, seed, 3, content)
      // Older saved designs predate per-brand fonts; attach the pairing on load.
      setDesign(loaded.fonts ? loaded : { ...loaded, fonts: fontsFor(brandWorld?.name) })
    }).catch(() => setStatus('Could not load post'))
  }, [id])

  const spec = useMemo(() => (design ? INSTAGRAM_FORMATS[design.format] : INSTAGRAM_FORMATS.portrait), [design])
  // Track viewport width so the canvas scales to fit small screens.
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const on = () => setVw(window.innerWidth)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  const isMobile = useIsMobile()
  // Fit within height, the 520 cap, and (on mobile) the viewport width.
  const displayW = useMemo(() => Math.min(520, (600 * spec.w) / spec.h, isMobile ? vw - 32 : Infinity), [spec, isMobile, vw])

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
  // What the user has actually typed, keyed by element role, so switching
  // template or format carries it straight through instead of resetting.
  function coverContent(): Record<string, string> {
    const m: Record<string, string> = {}
    for (const el of design!.slides[0].elements) if (el.role && (el.type === 'text' || el.type === 'pill')) m[el.role] = el.content
    return m
  }
  function liveContentSlides(): ContentSlideInput[] {
    return design!.slides.slice(1).map((s) => ({
      heading: s.elements.find((e) => e.role === 'heading')?.content ?? '',
      body: s.elements.find((e) => e.role === 'body')?.content ?? '',
    }))
  }
  function seedFrom(headline: string) {
    return { headline, sector: SECTOR_LABEL[post!.sector], accent: design!.accent, brandName: brandWorld?.name, logoUrl: brandWorld?.logo_url ?? undefined, style: resolveStyle(brandWorld ?? undefined), website: brandWorld?.website ?? undefined, dek: (post!.caption ?? '').split(/\n/)[0]?.slice(0, 160) || undefined, coverImage: post!.image_url ?? undefined }
  }
  const remedae = isRemedae(brandWorld?.name)
  const PALETTE = remedae ? REMEDAE_PALETTE : HOUSE_PALETTE
  const FONTS = remedae ? REMEDAE_FONT_LABELS : HOUSE_FONTS
  const TEMPLATES = templatesFor(brandWorld?.name, design.format)
  // Rebuild a cover in a new template/format but keep the edited text (matched by
  // role), any manually-added elements, and the current background + accent.
  function mergeCover(next: Slide, prev: Slide, noPhoto = false, prevDefault?: Slide): Slide {
    const accHex = accentHex(design!.accent)
    // Carry over ONLY edited text, matched by role. Rules, quote marks, accents,
    // pills and any other decoration come from the new template, so a switch
    // resembles that template cleanly with no leftover marks from the old one.
    // Text that still equals what the previous template generated (its own
    // eyebrow, cue, label defaults) is not "edited" and does not travel either.
    const isEdited = (role: string, content: string) => {
      if (!prevDefault) return true
      const d = prevDefault.elements.find((e) => e.role === role && (e.type === 'text' || e.type === 'pill'))
      return !d || d.content !== content
    }
    const elements = next.elements.map((ne) => {
      const was = (ne.type === 'text' || ne.type === 'pill') && ne.role
        ? prev.elements.find((oe) => oe.role === ne.role && (oe.type === 'text' || oe.type === 'pill') && isEdited(oe.role!, oe.content))
        : undefined
      let el = was ? { ...ne, content: was.content } : ne
      if (el.accentRef) el = { ...el, style: { ...el.style, ...(el.type === 'shape' ? { bg: accHex } : { color: accHex }) } }
      return el
    })
    // Remedae templates own their ground (dark, charcoal or cream); only a photo
    // carries across a switch. The house set keeps whatever ground was chosen.
    const keepGround = (!remedae || prev.background.type === 'image') && !(noPhoto && prev.background.type === 'image')
    return keepGround
      ? { ...next, elements, background: prev.background, scrim: prev.scrim, scrimStrength: prev.scrimStrength, scrimTint: prev.scrimTint }
      : { ...next, elements }
  }
  function applyFormat(f: InstaFormat) {
    const map = coverContent()
    const built = buildDesign(f, design!.templateId, seedFrom(map.headline || post!.headline || post!.topic), Math.max(design!.slides.length, 1), liveContentSlides())
    commit({ ...built, slides: [mergeCover(built.slides[0], design!.slides[0], templateById(design!.templateId).noPhoto), ...built.slides.slice(1)] })
    setActive(0); setSelId(null)
  }
  // Switching template restyles the cover; content slides are left intact, and
  // edited text carries over by role.
  function applyTemplate(tid: string) {
    const map = coverContent()
    const seed = seedFrom(map.headline || post!.headline || post!.topic)
    const cover = templateById(tid).build(design!.format, seed)
    const prevDefault = templateById(design!.templateId).build(design!.format, seed)
    commit({ ...design!, templateId: tid, slides: [mergeCover(cover, design!.slides[0], templateById(tid).noPhoto, prevDefault), ...design!.slides.slice(1)] })
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
    const el: DesignElement = { id: eid('t'), type: 'text', box: { x: 10, y: 45, w: 60, h: 10 }, style: { color: '#F4F0E7', fontKey: 'serif', fontSize: CANVAS_TYPE_SIZE.H2, fontWeight: 300 }, content: 'New text' }
    updateSlide({ elements: [...slide.elements, el] }); setSelId(el.id)
  }
  function addPill() {
    const el: DesignElement = { id: eid('pill'), type: 'pill', box: { x: 30, y: 46, w: 40, h: 6 }, style: { color: '#F4F0E7', fontKey: 'voice', fontSize: CANVAS_TYPE_SIZE.Body, align: 'center' }, content: 'Part 1: Classrooms', role: 'pill' }
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

  /* Brief the copilot: write headline + caption + hashtags (and carousel content)
     for the topic, lay it into the canvas, and keep the current background. */
  async function generateCopyNow() {
    if (!copyTopic.trim() || !post || !design) return
    setCopyBusy(true); setStatus('Writing copy…')
    try {
      const { copy, source } = await generateCopy({
        topic: copyTopic, format: design.format, sector: post.sector, accent: design.accent, template: design.templateId,
        brandOverride: brandWorld ? { name: brandWorld.name, voice: brandWorld.tone_of_voice ?? undefined, guidelines: brandWorld.writing_guidelines ?? undefined, tagline: brandWorld.tagline ?? undefined } : undefined,
      })
      // "The number" hook arrives as "3bn | statement": the number is its own element.
      let headline = copy.headline
      let stat: string | undefined
      if (design.templateId === 'rd-number' && headline.includes('|')) { const [n, ...rest] = headline.split('|'); stat = n.trim(); headline = rest.join('|').trim() }
      setPost((p) => (p ? { ...p, topic: copyTopic, headline, caption: copy.caption, hashtags: copy.hashtags, slides: copy.slides as unknown as Post['slides'] } : p))
      const built = buildDesign(design.format, design.templateId, seedFrom(headline), Math.max(design.slides.length, 1), (copy.slides ?? []) as ContentSlideInput[])
      const prev = design.slides[0]
      const keepPhoto = prev.background.type === 'image' && !templateById(design.templateId).noPhoto
      const cover = keepPhoto ? { ...built.slides[0], background: prev.background, scrim: prev.scrim, scrimStrength: prev.scrimStrength, scrimTint: prev.scrimTint } : (remedae ? built.slides[0] : { ...built.slides[0], background: prev.background, scrim: prev.scrim, scrimStrength: prev.scrimStrength })
      if (stat) cover.elements = cover.elements.map((el) => (el.role === 'stat' ? { ...el, content: stat! } : el))
      commit({ ...built, slides: [cover, ...built.slides.slice(1)] })
      setActive(0); setSelId(null)
      setStatus(source === 'claude' ? 'Copy drafted with Claude' : 'Drafted on-device')
      if (isMobile) setMView('preview')
    } finally { setCopyBusy(false) }
  }

  async function save() {
    setBusy(true); setStatus(null)
    try {
      await updatePost(post!.id, {
        design: design as unknown as Record<string, unknown>, format: design!.format, platform: 'instagram', accent: design!.accent,
        topic: post!.topic, headline: post!.headline, caption: post!.caption, hashtags: post!.hashtags ?? [], slides: post!.slides ?? [],
      })
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

  /* Render each slide to JPEG, host it in the bucket, then publish to Instagram
     via the edge function (caption = post caption + hashtags). */
  async function postToInstagram() {
    if (!canvasRef.current) return
    if (!supabase || !auth.session) { setStatus('Sign in first'); return }
    setBusy(true); setStatus('Rendering slides…')
    try {
      const uid = auth.session.user.id
      const ts = Date.now()
      const n = design!.format === 'carousel' ? design!.slides.length : 1
      const orig = active
      const urls: string[] = []
      for (let i = 0; i < n; i++) {
        if (n > 1) { setActive(i); await new Promise((r) => setTimeout(r, 200)) }
        if (!canvasRef.current) continue
        const blob = dataUrlToBlob(await captureNodeJpeg(canvasRef.current, spec.w))
        const path = `${uid}/published/${post!.id}/${ts}-${i + 1}.jpg` // bucket policy: first folder must be the uploader's uid
        const { error } = await supabase.storage.from('social-assets').upload(path, blob, { contentType: 'image/jpeg', upsert: true })
        if (error) throw error
        urls.push(supabase.storage.from('social-assets').getPublicUrl(path).data.publicUrl)
      }
      if (n > 1) setActive(orig)
      setStatus('Posting to Instagram…')
      const caption = [post!.caption, (post!.hashtags ?? []).join(' ')].map((s) => (s ?? '').trim()).filter(Boolean).join('\n\n')
      const { ok, permalink, error } = await publishToInstagram(urls, caption, brandWorld?.id)
      if (!ok) { setStatus(`Post failed: ${error}`); return }
      await updatePost(post!.id, { status: 'published' })
      setPost((p) => (p ? { ...p, status: 'published' } : p))
      setStatus('Posted to Instagram ✓')
      if (permalink) window.open(permalink, '_blank', 'noopener')
    } catch (e) { setStatus(`Post failed: ${e instanceof Error ? e.message : e}`) } finally { setBusy(false) }
  }

  const railLabel: React.CSSProperties = { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', margin: '18px 0 8px' }
  const chip = (activeC: boolean): React.CSSProperties => ({ borderRadius: 999, padding: '7px 13px', fontSize: 12, border: activeC ? '1px solid var(--hh-anthracite)' : '1px solid var(--hh-line)', background: activeC ? 'var(--hh-anthracite)' : 'transparent', color: activeC ? 'var(--text-on-ink)' : 'var(--text-body)' })

  return (
    <EditorShell
      ctype={spec.label}
      subline={`${spec.w}×${spec.h} · ${brandWorld?.name ?? 'Hue & Heal'}`}
      status={status}
      busy={busy}
      onDone={save}
      doneLabel="Save"
      view={mView}
      onViewChange={setMView}
      editLabel="Controls"
      previewLabel="Canvas"
      railWidth={320}
      rail={
        <div>
          {/* Brief the copilot */}
          <div style={{ border: '1px solid var(--hh-line)', borderRadius: 14, padding: 14, background: 'var(--hh-bone)', marginTop: 4 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-accent)', marginBottom: 8 }}>✦ Brief the copilot</div>
            <input value={copyTopic} onChange={(e) => setCopyTopic(e.target.value)} placeholder="Topic — e.g. wellness design in hotels" onKeyDown={(e) => { if (e.key === 'Enter') generateCopyNow() }}
              style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 8, padding: '9px 11px', fontSize: 13, fontFamily: 'var(--font-sans)' }} />
            <button className="hh-btn" onClick={generateCopyNow} disabled={copyBusy || !copyTopic.trim()}
              style={{ marginTop: 8, width: '100%', background: 'var(--hh-copper)', color: 'var(--hh-on-accent, #F6EFE4)', border: 'none', borderRadius: 999, padding: '10px 16px', fontSize: 12.5, fontWeight: 500, cursor: copyBusy || !copyTopic.trim() ? 'default' : 'pointer', opacity: copyBusy || !copyTopic.trim() ? 0.55 : 1 }}>
              {copyBusy ? 'Writing…' : '✦ Generate copy'}
            </button>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>Headline, caption, hashtags and carousel content — laid into the canvas.</div>
          </div>

          <div style={railLabel}>Format</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {INSTAGRAM_FORMAT_LIST.map((f) => (
              <button key={f.key} className="hh-btn" onClick={() => applyFormat(f.key)} style={chip(design.format === f.key)}>{f.label}</button>
            ))}
          </div>

          <div style={{ ...railLabel, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span>Template</span>
            <a href={`/templates?format=${design.format}${post.image_url ? '&photo=1' : ''}`} target="_blank" rel="noopener" style={{ fontSize: 11, letterSpacing: 0, textTransform: 'none', color: 'var(--text-muted)' }}>See all ↗</a>
          </div>
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
              {remedae && selEl.type === 'text' && (
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>Wrap one phrase in *asterisks* to set it in mint. One per slide.</div>
              )}
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {FONTS.map((f) => (
                  <button key={f.key} className="hh-btn" onClick={() => updateElStyle(selEl.id, { fontKey: f.key })} style={chip(selEl.style.fontKey === f.key)}>{f.label}</button>
                ))}
              </div>
              <div style={railLabel}>Size</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TYPE_SCALE.map((t) => (
                  <button key={t.label} className="hh-btn" title={`${t.size}px`}
                    onClick={() => updateElStyle(selEl.id, { fontSize: t.size })}
                    style={chip((selEl.style.fontSize ?? 48) === t.size)}>{t.label}</button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', minWidth: 34 }}>Custom</span>
                <input type="range" min={16} max={200} value={selEl.style.fontSize ?? 48} onChange={(e) => updateElStyle(selEl.id, { fontSize: Number(e.target.value) })} style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: 'var(--text-faint)', minWidth: 34, textAlign: 'right' }}>{Math.round(selEl.style.fontSize ?? 48)}px</span>
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

          <div style={railLabel}>Caption</div>
          <textarea value={post.caption ?? ''} onChange={(e) => setPost((p) => (p ? { ...p, caption: e.target.value } : p))} rows={4}
            placeholder="The post description that ships with the image."
            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 8, padding: '9px 11px', fontSize: 13, fontFamily: 'var(--font-sans)', resize: 'vertical', lineHeight: 1.5 }} />
          <div style={railLabel}>Hashtags</div>
          <textarea value={(post.hashtags ?? []).join(' ')} onChange={(e) => setPost((p) => (p ? { ...p, hashtags: e.target.value.split(/\s+/).filter(Boolean) } : p))} rows={2}
            placeholder="#WellnessDesign #ExperienceDesign"
            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 8, padding: '9px 11px', fontSize: 12.5, fontFamily: 'var(--font-sans)', resize: 'vertical', lineHeight: 1.5, color: 'var(--text-accent)' }} />

          <div style={railLabel}>Publish</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <button className="hh-btn" onClick={exportImages} style={{ background: 'none', border: '1px solid var(--hh-line)', borderRadius: 999, padding: '10px 16px', fontSize: 12.5, color: 'var(--text-body)', cursor: 'pointer' }}>
              ↧ Export {design.format === 'carousel' ? 'ZIP' : 'PNG'}
            </button>
            <ConfirmButton onConfirm={postToInstagram} confirmLabel="Post now?"
              style={{ background: 'var(--hh-copper)', color: 'var(--hh-on-accent, #F6EFE4)', border: '1px solid var(--hh-copper)', borderRadius: 999, padding: '10px 18px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>
              ↗ Post to Instagram
            </ConfirmButton>
          </div>
        </div>
      }
      canvas={
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ boxShadow: 'var(--shadow-raised)', borderRadius: 4, overflow: 'hidden' }}>
            <SlideCanvas
              slide={slide} spec={spec} displayW={displayW} interactive fonts={design.fonts}
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
                  <SlideCanvas slide={s} spec={spec} displayW={72} fonts={design.fonts} />
                  {design.slides.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); removeSlide(i) }} style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: 4, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', fontSize: 11, lineHeight: 1 }}>×</button>
                  )}
                </div>
              ))}
              <button className="hh-btn" onClick={addSlide} style={{ ...chip(false), height: 40 }}>＋ Slide</button>
            </div>
          )}
        </div>
      }
    />
  )
}

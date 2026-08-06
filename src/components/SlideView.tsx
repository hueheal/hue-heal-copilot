import type { DeckSlide, SlideTheme } from '../lib/decks'
import { HUE_HEAL_LOGO_PATH, HUE_HEAL_LOGO_VIEWBOX } from '../lib/logoPath'

/* ============================================================
   Branded page renderer for client documents — 1920×1080 decks
   and A4 portrait pages. Container queries keep type proportional
   at any width, so the same page is faithful in the editor, the
   client space, and the PDF export. Uses the real Hue & Heal
   wordmark (vector, recoloured via currentColor).
   ============================================================ */

const THEMES: Record<SlideTheme, { bg: string; ink: string; meta: string; rule: string; accent: string }> = {
  paper: { bg: '#FBFAF6', ink: '#1E1B18', meta: 'rgba(30,27,24,0.62)', rule: 'rgba(30,27,24,0.14)', accent: '#B5632F' },
  ink: { bg: '#14110E', ink: '#F4EFE2', meta: 'rgba(244,239,226,0.62)', rule: 'rgba(244,239,226,0.24)', accent: '#CE8A53' },
  clay: { bg: '#8A4A22', ink: '#F4EFE2', meta: 'rgba(244,239,226,0.74)', rule: 'rgba(244,239,226,0.3)', accent: '#F0CBA6' },
  bone: { bg: '#ECE6DA', ink: '#1E1B18', meta: 'rgba(30,27,24,0.6)', rule: 'rgba(30,27,24,0.16)', accent: '#8A4A22' },
}

export function themeOf(slide: DeckSlide): SlideTheme {
  return slide.theme ?? (slide.layout === 'cover' ? 'ink' : 'paper')
}

function Mark({ width, color }: { width: string; color: string }) {
  return (
    <svg viewBox={HUE_HEAL_LOGO_VIEWBOX} style={{ width, display: 'block', color }} fill="none" aria-label="Hue & Heal Studio">
      <path fill="currentColor" d={HUE_HEAL_LOGO_PATH} />
    </svg>
  )
}

export default function SlideView({ slide, index, total, clientName, format = 'deck' }: {
  slide: DeckSlide
  index: number
  total: number
  clientName: string
  format?: string
}) {
  const isA4 = format === 'a4'
  const t = THEMES[themeOf(slide)]
  // A4 pages are narrower, so type scales up to stay readable.
  const k = isA4 ? 1.55 : 1
  const fz = (n: number) => `${(n * k).toFixed(2)}cqw`
  const pad = fz(6)

  const base: React.CSSProperties = {
    aspectRatio: isA4 ? '1240 / 1754' : '16 / 9',
    width: '100%', position: 'relative', overflow: 'hidden', borderRadius: 10,
    background: t.bg, color: t.ink,
    containerType: 'inline-size', // container queries drive the proportional type
  }

  const footer = slide.layout !== 'cover' && (
    <div style={{ position: 'absolute', left: pad, right: pad, bottom: fz(2.6), display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: t.meta }}>
      <Mark width={fz(7)} color={t.ink} />
      <span style={{ fontSize: fz(1.05) }}>{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
    </div>
  )

  if (slide.layout === 'cover') {
    return (
      <div style={base}>
        <div style={{ position: 'absolute', top: pad, left: pad }}><Mark width={fz(12)} color={t.ink} /></div>
        <div style={{ position: 'absolute', left: pad, right: pad, bottom: fz(10) }}>
          <div style={{ fontSize: fz(1.15), letterSpacing: '0.22em', textTransform: 'uppercase', color: t.accent, marginBottom: fz(1.6) }}>{slide.eyebrow || 'Document'} · Hue & Heal × {clientName}</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: fz(4.6), lineHeight: 1.06 }}>{slide.title || 'Untitled'}</div>
          {slide.body && <div style={{ fontFamily: 'var(--font-voice)', fontStyle: 'italic', fontSize: fz(1.7), color: t.meta, marginTop: fz(1.6), maxWidth: '62%' }}>{slide.body}</div>}
        </div>
        <div style={{ position: 'absolute', left: pad, bottom: fz(4), fontSize: fz(1.05), color: t.meta }}>Designing the future of wellness</div>
      </div>
    )
  }

  if (slide.layout === 'statement') {
    return (
      <div style={base}>
        <div style={{ position: 'absolute', top: fz(5), left: pad, fontSize: fz(1.15), letterSpacing: '0.22em', textTransform: 'uppercase', color: t.accent }}>{slide.eyebrow}</div>
        {/* Bounded and vertically centred, so long copy never reaches the footer. */}
        <div style={{ position: 'absolute', left: pad, right: pad, top: fz(10), bottom: fz(9), display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: fz(3.6), lineHeight: 1.15, maxWidth: '80%' }}>{slide.title}</div>
          {slide.body && <div style={{ fontFamily: 'var(--font-voice)', fontStyle: 'italic', fontSize: fz(1.6), color: t.meta, marginTop: fz(2), maxWidth: '64%' }}>{slide.body}</div>}
        </div>
        {footer}
      </div>
    )
  }

  if (slide.layout === 'split') {
    return (
      <div style={base}>
        <div style={{ position: 'absolute', left: pad, top: fz(5), width: '38%' }}>
          <div style={{ fontSize: fz(1.15), letterSpacing: '0.22em', textTransform: 'uppercase', color: t.accent }}>{slide.eyebrow}</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: fz(2.8), lineHeight: 1.14, marginTop: fz(1.2) }}>{slide.title}</div>
        </div>
        <div style={{ position: 'absolute', right: pad, top: fz(5.4), width: '44%', bottom: fz(8.5), overflow: 'hidden' }}>
          {slide.image
            ? <img src={slide.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: fz(0.8) }} />
            : <div style={{ fontSize: fz(1.5), lineHeight: 1.75, whiteSpace: 'pre-line', color: t.ink, opacity: 0.92 }}>{slide.body}</div>}
        </div>
        {slide.image && slide.body && (
          <div style={{ position: 'absolute', left: pad, top: fz(16), width: '38%', bottom: fz(8.5), overflow: 'hidden', fontSize: fz(1.35), lineHeight: 1.7, color: t.meta, whiteSpace: 'pre-line' }}>{slide.body}</div>
        )}
        {footer}
      </div>
    )
  }

  if (slide.layout === 'timeline') {
    const cols = (slide.bullets ?? []).filter((b) => b.trim())
    return (
      <div style={base}>
        <div style={{ position: 'absolute', top: fz(5), left: pad, right: pad }}>
          <div style={{ fontSize: fz(1.15), letterSpacing: '0.22em', textTransform: 'uppercase', color: t.accent }}>{slide.eyebrow}</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: fz(3), lineHeight: 1.12, marginTop: fz(1.2) }}>{slide.title}</div>
          {slide.body && <div style={{ fontSize: fz(1.35), lineHeight: 1.65, color: t.meta, marginTop: fz(1.2), maxWidth: '70%', maxHeight: fz(8), overflow: 'hidden' }}>{slide.body}</div>}
        </div>
        <div style={{ position: 'absolute', left: pad, right: pad, bottom: fz(9), display: 'grid', gridTemplateColumns: isA4 ? 'repeat(2, 1fr)' : `repeat(${Math.max(cols.length, 1)}, 1fr)`, gap: fz(1.4) }}>
          {cols.map((b, i) => (
            <div key={i} style={{ borderTop: `2px solid ${t.accent}`, paddingTop: fz(1) }}>
              <div style={{ fontSize: fz(1.3), lineHeight: 1.5 }}>{b}</div>
            </div>
          ))}
        </div>
        {footer}
      </div>
    )
  }

  if (slide.layout === 'terms') {
    return (
      <div style={base}>
        <div style={{ position: 'absolute', top: fz(5), left: pad, right: pad }}>
          <div style={{ fontSize: fz(1.15), letterSpacing: '0.22em', textTransform: 'uppercase', color: t.accent }}>{slide.eyebrow}</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: fz(2.6), lineHeight: 1.14, marginTop: fz(1) }}>{slide.title}</div>
        </div>
        <div style={{ position: 'absolute', left: pad, right: pad, top: fz(13.5), bottom: fz(8.5), overflow: 'hidden' }}>
          {slide.body && <div style={{ fontSize: fz(1.3), lineHeight: 1.7, color: t.ink, opacity: 0.92, whiteSpace: 'pre-line', marginBottom: fz(1.4) }}>{slide.body}</div>}
          {(slide.bullets ?? []).filter((b) => b.trim()).map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: fz(1), padding: `${fz(0.9)} 0`, borderBottom: `1px solid ${t.rule}`, fontSize: fz(1.3), lineHeight: 1.55 }}>
              <span style={{ color: t.accent, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
              <span>{b}</span>
            </div>
          ))}
        </div>
        {footer}
      </div>
    )
  }

  // content (detail) + list
  return (
    <div style={base}>
      <div style={{ position: 'absolute', top: fz(5), left: pad, right: pad }}>
        <div style={{ fontSize: fz(1.15), letterSpacing: '0.22em', textTransform: 'uppercase', color: t.accent }}>{slide.eyebrow}</div>
        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: fz(3), lineHeight: 1.12, marginTop: fz(1.2), maxWidth: '74%' }}>{slide.title}</div>
      </div>
      <div style={{ position: 'absolute', left: pad, right: pad, top: fz(17), bottom: fz(8.5), overflow: 'hidden' }}>
        {slide.layout === 'list' ? (
          <div>
            {slide.body && <div style={{ fontSize: fz(1.45), lineHeight: 1.7, maxWidth: '66%', marginBottom: fz(1.6), opacity: 0.92 }}>{slide.body}</div>}
            {(slide.bullets ?? []).filter((b) => b.trim()).map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: fz(1.2), alignItems: 'baseline', marginBottom: fz(1) }}>
                <span style={{ width: fz(0.55), height: fz(0.55), borderRadius: '50%', background: t.accent, flexShrink: 0, transform: 'translateY(-0.15em)' }} />
                <span style={{ fontSize: fz(1.5), lineHeight: 1.6 }}>{b}</span>
              </div>
            ))}
          </div>
        ) : slide.image ? (
          <div style={{ display: 'flex', gap: fz(2.4), height: '100%' }}>
            <div style={{ flex: 1, fontSize: fz(1.5), lineHeight: 1.75, whiteSpace: 'pre-line', opacity: 0.92 }}>{slide.body}</div>
            <img src={slide.image} alt="" style={{ width: '42%', height: '100%', objectFit: 'cover', borderRadius: fz(0.8) }} />
          </div>
        ) : (
          <div style={{ fontSize: fz(1.5), lineHeight: 1.75, maxWidth: '66%', whiteSpace: 'pre-line', opacity: 0.92 }}>{slide.body}</div>
        )}
      </div>
      {footer}
    </div>
  )
}

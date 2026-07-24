import { useState } from 'react'
import { type SocialStyle, type BgTreatment } from '../lib/social/style'
import { generateSocialStyle } from '../lib/social/styleGen'

/* Reusable "set this brand's social look" panel. Collects inspiration + optional
   reference images, asks Claude for a style profile, previews it, and hands the
   chosen SocialStyle back via onApply (caller saves to the brand or holds it). */

const INK = '#1E1B18'
const CREAM = '#F4F0E7'
const SAND = '#ECE6DA'

function previewBg(t: BgTreatment, accent: string, bgColor?: string): string {
  switch (t) {
    case 'ink': return bgColor || INK
    case 'sand': return bgColor || SAND
    case 'accent': return bgColor || accent
    case 'photo': return `linear-gradient(160deg, ${accent}, ${INK})`
    default: return `radial-gradient(120% 120% at 30% 20%, ${accent}55, ${INK})`
  }
}

export default function SocialLookSetup({
  brandName, accentColor = '#B5632F', dark = true, busyLabel = 'Reading your references…',
  onApply, onSkip,
}: {
  brandName?: string
  accentColor?: string
  dark?: boolean
  busyLabel?: string
  onApply: (style: SocialStyle) => void
  onSkip: () => void
}) {
  const [inspiration, setInspiration] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [style, setStyle] = useState<SocialStyle | null>(null)

  const muted = dark ? 'var(--text-on-ink-muted, #b8ad9c)' : 'var(--text-muted)'
  const fg = dark ? 'var(--text-on-ink, #F4F0E7)' : 'var(--text-strong)'
  const line = dark ? 'var(--hh-line-ink, rgba(244,240,231,0.16))' : 'var(--hh-line)'
  const field = dark ? 'rgba(244,240,231,0.06)' : 'var(--hh-lotus)'
  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: field, border: `1px solid ${line}`, borderRadius: 10, padding: '11px 13px', fontSize: 14, color: fg, fontFamily: 'var(--font-sans)' }

  async function generate() {
    if (!inspiration.trim() && !files.length) { setNote('Add a description or a reference image first'); return }
    setBusy(true); setNote(null)
    const { style: s, error } = await generateSocialStyle({ inspiration, files, brandName, accentColor })
    setBusy(false)
    if (error || !s) { setNote(error ?? 'Could not generate a look'); return }
    setStyle(s)
    setNote('Preview below — use it or tweak the description and regenerate.')
  }

  const previewText = style ? (previewLuma(style, accentColor) ? INK : CREAM) : CREAM

  return (
    <div style={{ maxWidth: 560 }}>
      <p style={{ fontSize: 13.5, color: muted, margin: '0 0 14px', lineHeight: 1.55 }}>
        Describe how {brandName || 'this brand'}’s social should feel, and/or add reference images. Claude sets a distinct template look — you review before it’s applied.
      </p>

      <textarea
        value={inspiration}
        onChange={(e) => setInspiration(e.target.value)}
        rows={3}
        placeholder="e.g. bold, high-contrast, dark backgrounds, big modern sans type, editorial like Cereal…"
        style={{ ...inp, resize: 'vertical', lineHeight: 1.5, marginBottom: 8 }}
      />
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px dashed ${line}`, borderRadius: 12, padding: 16, fontSize: 13, color: muted, cursor: 'pointer', marginBottom: 8 }}>
        <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={(e) => setFiles([...(e.target.files ?? [])])} />
        {files.length ? `${files.length} reference${files.length > 1 ? 's' : ''} attached` : '＋ Add reference images (optional)'}
      </label>

      {style && (
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', margin: '14px 0', padding: 12, border: `1px solid ${line}`, borderRadius: 12 }}>
          <div style={{ width: 96, height: 120, borderRadius: 8, background: previewBg(style.background, accentColor, style.bgColor), flexShrink: 0, position: 'relative', overflow: 'hidden', padding: 10, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ fontFamily: style.headlineFont === 'serif' ? 'var(--font-serif)' : 'var(--font-sans)', color: previewText, fontSize: 17, lineHeight: 1, textAlign: style.align }}>Aa</div>
            {style.motif === 'rule' && <div style={{ width: 22, height: 2, background: accentColor, marginTop: 5 }} />}
          </div>
          <div style={{ fontSize: 12.5, color: muted, lineHeight: 1.7 }}>
            <div style={{ color: fg, fontSize: 13, marginBottom: 4 }}>Proposed look</div>
            {label(style.background)} background · {style.headlineFont === 'serif' ? 'serif' : 'sans'} headline<br />
            {style.textTone} text · {style.motif === 'rule' ? 'accent rule' : 'no rule'} · {style.align}
            {style.tagline ? <><br />“{style.tagline}”</> : null}
          </div>
        </div>
      )}

      {note && <div style={{ fontSize: 12.5, color: muted, margin: '6px 0 0', lineHeight: 1.5 }}>{note}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
        <button onClick={onSkip} className="hh-btn" style={{ background: 'none', border: `1px solid ${line}`, color: muted, borderRadius: 10, padding: '10px 16px', fontSize: 13, cursor: 'pointer' }}>
          Skip for now
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button onClick={generate} disabled={busy} className="hh-btn" style={{ background: 'none', border: `1px solid ${line}`, color: fg, borderRadius: 10, padding: '10px 16px', fontSize: 13, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? busyLabel : style ? 'Regenerate' : 'Generate look'}
          </button>
          {style && (
            <button onClick={() => onApply(style)} className="hh-btn" style={{ background: accentColor, color: previewLuma(style, accentColor) ? INK : CREAM, border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13.5, cursor: 'pointer' }}>
              Use this look
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function label(t: BgTreatment): string {
  return t === 'atmos' ? 'Warm gradient' : t === 'ink' ? 'Dark' : t === 'accent' ? 'Brand colour' : t === 'sand' ? 'Light' : 'Photo-led'
}
/** True when the accent is light enough to want dark text on it (for the CTA). */
function previewLuma(_s: SocialStyle, accent: string): boolean {
  const h = accent.replace('#', ''); if (h.length !== 6) return false
  const c = (i: number) => { const v = parseInt(h.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  return 0.2126 * c(0) + 0.7152 * c(2) + 0.0722 * c(4) > 0.5
}

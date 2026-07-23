import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { listBrands, resolveActiveBrand, getActiveBrandId, setActiveBrandId, type BrandProfile } from './brand'

/* ---- Colour legibility helpers (WCAG relative luminance + contrast) ---- */
type RGB = { r: number; g: number; b: number }
function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return { r: parseInt(v.slice(0, 2), 16), g: parseInt(v.slice(2, 4), 16), b: parseInt(v.slice(4, 6), 16) }
}
function rgbToHex({ r, g, b }: RGB): string {
  const c = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}
function lin(c: number): number { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) }
function relLum({ r, g, b }: RGB): number { return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) }
function contrast(a: RGB, b: RGB): number { const l1 = relLum(a), l2 = relLum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) }
function rgbToHsl({ r, g, b }: RGB) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min
  let h = 0, s = 0
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h /= 6
  }
  return { h, s, l }
}
function hslToRgb({ h, s, l }: { h: number; s: number; l: number }): RGB {
  if (!s) return { r: l * 255, g: l * 255, b: l * 255 }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue = (t: number) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p }
  return { r: hue(h + 1 / 3) * 255, g: hue(h) * 255, b: hue(h - 1 / 3) * 255 }
}

/** Pick dark or light text for legibility on a given hex background. */
export function textOnColor(hex: string): string {
  try { return relLum(hexToRgb(hex)) > 0.5 ? '#2A211A' : '#F6EFE4' } catch { return '#F6EFE4' }
}

/** Tonally adjust `hex` (keeping its hue + saturation) until it reads legibly as
    text/marks on `surfaceHex`. Darkens on light surfaces, lightens on dark ones. */
export function readableOn(hex: string, surfaceHex: string, min = 4.2): string {
  try {
    const surf = hexToRgb(surfaceHex)
    const darken = relLum(surf) > 0.5
    const { h, s } = rgbToHsl(hexToRgb(hex))
    let l = rgbToHsl(hexToRgb(hex)).l
    for (let i = 0; i < 50; i++) {
      const rgb = hslToRgb({ h, s, l })
      if (contrast(rgb, surf) >= min) return rgbToHex(rgb)
      l += darken ? -0.02 : 0.02
      if (l <= 0 || l >= 1) { l = Math.max(0, Math.min(1, l)); break }
    }
    return rgbToHex(hslToRgb({ h, s, l: Math.max(0, Math.min(1, l)) }))
  } catch { return hex }
}

interface BrandState {
  brands: BrandProfile[]
  current: BrandProfile | null
  loading: boolean
  /** Has the user explicitly picked a workspace this session? Drives the entry picker. */
  chosen: boolean
  setCurrent: (id: string) => void
  /** Return to the workspace-selection screen. */
  openSelector: () => void
  reload: () => Promise<void>
}

const Ctx = createContext<BrandState | null>(null)

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brands, setBrands] = useState<BrandProfile[]>([])
  const [currentId, setCurrentId] = useState<string | null>(getActiveBrandId())
  const [loading, setLoading] = useState(true)
  const [chosen, setChosen] = useState(false)

  const reload = useCallback(async () => {
    try {
      const list = await listBrands()
      setBrands(list)
      setCurrentId((id) => (list.find((b) => b.id === id) ? id : resolveActiveBrand(list)?.id ?? null))
    } catch {
      setBrands([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  const current = brands.find((b) => b.id === currentId) ?? resolveActiveBrand(brands)

  const setCurrent = useCallback((id: string) => { setActiveBrandId(id); setCurrentId(id); setChosen(true) }, [])
  const openSelector = useCallback(() => setChosen(false), [])

  // Apply the current brand's identity to the whole product: accent colour,
  // luminance-aware text on the accent, and headline font (Ivy Ora for the
  // Hue & Heal parent, Poppins for white-label).
  useEffect(() => {
    const root = document.documentElement
    if (!current) return
    const accent = current.accent_color || '#B5632F'
    // Raw accent — for fills/CTAs (always paired with --hh-on-accent text).
    root.style.setProperty('--hh-copper', accent)
    root.style.setProperty('--hh-on-accent', textOnColor(accent))
    // Legibility-adjusted accent for use AS text/marks on each surface.
    root.style.setProperty('--text-accent', readableOn(accent, '#F5F1E8', 4.2)) // on light cards
    const onInk = readableOn(accent, '#1E1B18', 4.2) // on the dark sidebar / ink
    root.style.setProperty('--text-accent-on-ink', onInk)
    root.style.setProperty('--hh-ember', onInk)
    root.style.setProperty(
      '--font-serif',
      current.display_font === 'poppins' ? "'Poppins', system-ui, sans-serif" : "'ivyora-display', Georgia, serif",
    )
  }, [current?.id, current?.accent_color, current?.display_font])

  return <Ctx.Provider value={{ brands, current: current ?? null, loading, chosen, setCurrent, openSelector, reload }}>{children}</Ctx.Provider>
}

export function useBrand(): BrandState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useBrand must be used within BrandProvider')
  return ctx
}

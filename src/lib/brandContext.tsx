import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { listBrands, resolveActiveBrand, getActiveBrandId, setActiveBrandId, type BrandProfile } from './brand'
import { textOnColor, readableOn } from './color'

export { textOnColor, readableOn }

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

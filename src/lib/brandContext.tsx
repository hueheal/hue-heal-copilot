import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { listBrands, resolveActiveBrand, getActiveBrandId, setActiveBrandId, type BrandProfile } from './brand'

interface BrandState {
  brands: BrandProfile[]
  current: BrandProfile | null
  loading: boolean
  setCurrent: (id: string) => void
  reload: () => Promise<void>
}

const Ctx = createContext<BrandState | null>(null)

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brands, setBrands] = useState<BrandProfile[]>([])
  const [currentId, setCurrentId] = useState<string | null>(getActiveBrandId())
  const [loading, setLoading] = useState(true)

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

  const setCurrent = useCallback((id: string) => { setActiveBrandId(id); setCurrentId(id) }, [])

  // Apply the current brand's identity to the whole product: accent colour and
  // headline font (Ivy Ora for the Hue & Heal parent, Poppins for white-label).
  useEffect(() => {
    const root = document.documentElement
    if (!current) return
    root.style.setProperty('--hh-copper', current.accent_color || '#B5632F')
    root.style.setProperty(
      '--font-serif',
      current.display_font === 'poppins' ? "'Poppins', system-ui, sans-serif" : "'ivyora-display', Georgia, serif",
    )
  }, [current?.id, current?.accent_color, current?.display_font])

  return <Ctx.Provider value={{ brands, current: current ?? null, loading, setCurrent, reload }}>{children}</Ctx.Provider>
}

export function useBrand(): BrandState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useBrand must be used within BrandProvider')
  return ctx
}

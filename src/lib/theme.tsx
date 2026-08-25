import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/* ============================================================
   Chrome theme: light / dark / system, persisted. Stamps
   data-theme on <html> so the --ck-* chrome tokens flip.
   Brand canvases read --hh-* and are untouched by the theme.
   ============================================================ */

export type ThemeMode = 'light' | 'dark' | 'system'
const KEY = 'hh:chrome-theme'

interface ThemeCtx { mode: ThemeMode; setMode: (m: ThemeMode) => void }
const Ctx = createContext<ThemeCtx>({ mode: 'system', setMode: () => {} })

function apply(mode: ThemeMode) {
  const el = document.documentElement
  if (mode === 'system') delete el.dataset.theme
  else el.dataset.theme = mode
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      const v = localStorage.getItem(KEY)
      return v === 'light' || v === 'dark' ? v : 'system'
    } catch { return 'system' }
  })
  useEffect(() => { apply(mode) }, [mode])
  const setMode = (m: ThemeMode) => {
    setModeState(m)
    try { m === 'system' ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, m) } catch { /* ignore */ }
  }
  return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>
}

export function useTheme(): ThemeCtx {
  return useContext(Ctx)
}

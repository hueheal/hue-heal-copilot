import { useEffect, useRef } from 'react'

/* Autosave + restore for an editor buffer. Mirrors a serialisable snapshot to
   localStorage (debounced) and restores it once on mount, so leaving and
   returning to a page, or an in-app tab switch, never loses in-progress work.
   Keyed per surface + brand so drafts don't bleed across workspaces. */
export function useDraft<T>(key: string, snapshot: T, restore: (v: T) => void, ready = true): (() => void) {
  const didRestore = useRef(false)

  useEffect(() => {
    if (!ready || didRestore.current) return
    didRestore.current = true
    try {
      const raw = localStorage.getItem(key)
      if (raw) restore(JSON.parse(raw) as T)
    } catch { /* ignore */ }
    // Restore once, when the surface becomes ready. restore is intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key])

  useEffect(() => {
    if (!ready || !didRestore.current) return
    const t = setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify(snapshot)) } catch { /* ignore */ }
    }, 500)
    return () => clearTimeout(t)
  }, [key, snapshot, ready])

  return () => { try { localStorage.removeItem(key) } catch { /* ignore */ } }
}

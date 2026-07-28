import { useEffect, useState } from 'react'

/* True when the viewport is at or below the breakpoint. Drives responsive
   layout switches (stacked grids, drawer nav) alongside the inline styles the
   app uses. */
export function useIsMobile(breakpoint = 820): boolean {
  const query = `(max-width:${breakpoint}px)`
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMobile(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return mobile
}

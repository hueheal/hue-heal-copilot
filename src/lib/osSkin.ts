/* The OS home's skin: sand (the founder's Figma frames) or graphite (the
   Grok-manner exploration). ?skin= sets it and it is remembered per browser. */
export type Skin = 'sand' | 'graphite'
const KEY = 'os.skin'
export function readSkin(params: URLSearchParams = new URLSearchParams(window.location.search)): Skin {
  const p = params.get('skin')
  if (p === 'sand' || p === 'graphite') { localStorage.setItem(KEY, p); return p }
  return localStorage.getItem(KEY) === 'graphite' ? 'graphite' : 'sand'
}
export function saveSkin(s: Skin): void { localStorage.setItem(KEY, s) }

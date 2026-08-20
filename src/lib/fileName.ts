/* ============================================================
   Saved-file names. Every export (PDF, PNG, ZIP) is named from the
   document's cover title: readable, filesystem-safe, and never
   carrying the app's own name ("copilot" in any spelling).
   ============================================================ */

/** Turn a cover title into the saved-file base name (no extension).
    "Helius — Wellness Strategy" -> "Helius Wellness Strategy". */
export function fileNameFromTitle(title: string | null | undefined, fallback = 'Document'): string {
  let t = (title ?? '').trim()
  // The app's name never belongs in a client-facing file name.
  t = t.replace(/\bstudio\s+co-?pilot\b/gi, ' ').replace(/\bco-?pilot\b/gi, ' ')
  // Characters that break on some filesystems; dashes become spaces.
  t = t.replace(/[\\/:*?"<>|]+/g, ' ').replace(/[–—-]+/g, ' ')
  t = t.replace(/\s+/g, ' ').trim()
  if (t.length > 80) t = `${t.slice(0, 80).trimEnd()}…`
  return t || fallback
}

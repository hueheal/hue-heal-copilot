/** kebab-case a string for use in a filename. Kept in a light module so it can
    be imported without pulling in the heavy @react-pdf renderer (see pdfDoc.tsx,
    which is dynamically imported only when a PDF is actually generated). */
export function slugify(s: string): string {
  return (
    (s || 'document')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'document'
  )
}

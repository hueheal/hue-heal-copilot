/* Export social canvases to PNG at their true pixel size.

   Uses html2canvas (Canvas 2D `fillText`) so real Ivy Ora (Adobe Fonts / Typekit)
   — whatever is LOADED on the page — is captured, with no font file to embed.
   We capture the VISIBLE canvas node (html2canvas can't reliably capture
   far-off-screen elements), so callers switch the active slide and re-capture. */

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** Download a PNG data URL. Converts to a Blob URL first — large `data:` URLs are
    blocked/ignored by browsers, blob URLs are not. */
export function downloadDataUrl(dataUrl: string, filename: string) {
  const [meta, b64] = dataUrl.split(',')
  const mime = /:(.*?);/.exec(meta)?.[1] ?? 'image/png'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  const url = URL.createObjectURL(new Blob([arr], { type: mime }))
  triggerDownload(url, filename)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Capture a DOM node to a PNG data URL at `realW` px wide. */
export async function captureNode(node: HTMLElement, realW: number): Promise<string> {
  const { default: html2canvas } = await import('html2canvas')
  if (document.fonts?.ready) await document.fonts.ready
  const rect = node.getBoundingClientRect()
  const scale = rect.width > 0 ? realW / rect.width : 2
  const canvas = await html2canvas(node, { scale, useCORS: true, backgroundColor: null, logging: false })
  return canvas.toDataURL('image/png')
}

export async function exportPng(node: HTMLElement, realW: number, filename: string): Promise<void> {
  downloadDataUrl(await captureNode(node, realW), filename)
}

/** Bundle already-captured PNG data URLs into a numbered zip (for carousels). */
export async function zipPngs(dataUrls: string[], baseName: string): Promise<void> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  dataUrls.forEach((d, i) => zip.file(`${baseName}-${String(i + 1).padStart(2, '0')}.png`, d.split(',')[1], { base64: true }))
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, `${baseName}.zip`)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

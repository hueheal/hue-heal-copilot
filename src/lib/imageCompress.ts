/* ============================================================
   Client-side photo compression before upload.
   Editorial photos (journal heroes, inline images, newsletter
   images) are served publicly at reading size, so we resize to a
   sensible long edge and re-encode as WebP before they hit storage.
   The remedae.app optimizer and Resend still get to work with a
   light source instead of a multi-megabyte camera export.
   Vector, animated and already-small files pass through untouched.
   ============================================================ */

export interface CompressOptions {
  /** Longest edge in px. 2000 covers a full-bleed hero on a retina display. */
  maxEdge?: number
  /** Skip files already below this many bytes. */
  skipBelowBytes?: number
  /** Encoder quality, 0..1. */
  quality?: number
  /** Output format. Web surfaces take WebP; email clients are safer with JPEG. */
  format?: 'webp' | 'jpeg'
}

const DEFAULTS: Required<CompressOptions> = { maxEdge: 2000, skipBelowBytes: 350 * 1024, quality: 0.82, format: 'webp' }

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read the image')) }
    img.src = url
  })
}

/** Compress a photo for upload. Returns the original when compression is not
    applicable or would not help (so callers can always just upload the result). */
export async function compressPhoto(file: File, opts: CompressOptions = {}): Promise<File> {
  const o = { ...DEFAULTS, ...opts }
  const type = (file.type || '').toLowerCase()
  // Leave vectors, GIFs (animation) and anything not raster alone.
  if (!type.startsWith('image/') || type === 'image/svg+xml' || type === 'image/gif') return file
  if (file.size <= o.skipBelowBytes) return file
  if (typeof document === 'undefined') return file

  let img: HTMLImageElement
  try { img = await loadImage(file) } catch { return file }
  const w = img.naturalWidth, h = img.naturalHeight
  if (!w || !h) return file

  const scale = Math.min(1, o.maxEdge / Math.max(w, h))
  const tw = Math.max(1, Math.round(w * scale)), th = Math.max(1, Math.round(h * scale))

  const canvas = document.createElement('canvas')
  canvas.width = tw; canvas.height = th
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, tw, th)

  const encode = (mime: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, o.quality))
  let out: Blob | null = null
  if (o.format === 'jpeg') {
    // JPEG has no alpha: paint a paper-white ground so transparent PNGs do not go black.
    const flat = document.createElement('canvas')
    flat.width = tw; flat.height = th
    const fctx = flat.getContext('2d')
    if (fctx) { fctx.fillStyle = '#FFFFFF'; fctx.fillRect(0, 0, tw, th); fctx.drawImage(canvas, 0, 0); out = await new Promise((resolve) => flat.toBlob(resolve, 'image/jpeg', o.quality)) }
  } else {
    // Some browsers cannot encode WebP; fall back to JPEG.
    out = (await encode('image/webp')) ?? (await encode('image/jpeg'))
  }
  if (!out) return file
  // Only swap if we actually saved something meaningful.
  if (out.size >= file.size * 0.9 && scale === 1) return file

  const ext = out.type === 'image/webp' ? 'webp' : 'jpg'
  const base = file.name.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return new File([out], `${base}.${ext}`, { type: out.type, lastModified: Date.now() })
}

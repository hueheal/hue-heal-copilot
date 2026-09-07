// ============================================================================
// Imagery: a brand's prompt library (master, modules, surfaces, negatives),
// kept in brand_profiles.knowledge under _imagery_library, and the composer
// that builds one production prompt from a seat's request. The order of
// composition is the library's own: master, module, subject, surface,
// negatives. Seats never write the master or the negatives themselves.
// ============================================================================
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface Surface { ratio: string; min?: string; quiet?: string; note?: string }
export interface Library {
  master: string
  negatives: string
  /** category -> (module key -> module text) or category -> text */
  modules: Record<string, Record<string, string> | string>
  surfaces: Record<string, Surface>
}

export interface ImageRequest { purpose?: string; category?: string; module?: string; subject?: string; surface?: string }

export async function loadLibrary(admin: SupabaseClient, brandId: string | null): Promise<Library | null> {
  if (!brandId) return null
  const { data } = await admin.from('brand_profiles').select('knowledge, image_master_prompt, image_negatives').eq('id', brandId).maybeSingle()
  const row = data as { knowledge?: Record<string, unknown>; image_master_prompt?: string; image_negatives?: string } | null
  const raw = row?.knowledge?._imagery_library
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const lib = JSON.parse(raw) as Partial<Library>
      return { master: lib.master ?? row?.image_master_prompt ?? '', negatives: lib.negatives ?? row?.image_negatives ?? '', modules: lib.modules ?? {}, surfaces: lib.surfaces ?? {} }
    } catch { /* fall through to the plain master prompt */ }
  }
  if (row?.image_master_prompt) return { master: row.image_master_prompt, negatives: row.image_negatives ?? '', modules: {}, surfaces: {} }
  return null
}

/** Ratio string the surface asks for, if any. */
export const surfaceRatio = (lib: Library, surface?: string): string | undefined => (surface && lib.surfaces[surface]?.ratio) || undefined

export function composePrompt(lib: Library, req: ImageRequest): string {
  const cat = lib.modules[req.category ?? '']
  let moduleText = ''
  if (typeof cat === 'string') moduleText = cat
  else if (cat && req.module) moduleText = cat[req.module] ?? cat[Object.keys(cat).find((k) => k.toLowerCase() === (req.module ?? '').toLowerCase()) ?? ''] ?? ''
  const surf = req.surface ? lib.surfaces[req.surface] : undefined
  const surfaceText = surf ? `Made for the ${req.surface} surface${surf.quiet && surf.quiet !== 'none' ? `: keep the ${surf.quiet} of the frame quiet and uncluttered for overlaid type` : ''}${surf.note ? ` (${surf.note})` : ''}.` : ''
  return [lib.master, moduleText, req.subject?.trim() ? `Subject: ${req.subject.trim()}` : '', surfaceText, lib.negatives].filter(Boolean).join(' ')
}

/** What a seat is told it can ask for. */
export function imageryLine(lib: Library | null): string {
  if (!lib) return ''
  const cats = Object.entries(lib.modules).map(([c, m]) => (typeof m === 'string' ? c : `${c} (${Object.keys(m).join(', ')})`))
  const surfs = Object.entries(lib.surfaces).map(([k, s]) => `${k} ${s.ratio}`)
  return [
    'IMAGES: you may request production images in the deliverable\'s images field (at most 3 per deliverable, only when the work genuinely needs them). Each request names a purpose, a category' + (cats.length ? ` from: ${cats.join('; ')}` : '') + ', a subject (the specific everyday scene, object and gesture, in one or two sentences, no style words: the brand\'s master prompt and rules are added for you)' + (surfs.length ? `, and a surface from: ${surfs.join(', ')}` : '') + '.',
    'Images land in the founder\'s review pile; nothing goes on the site or a post until approved.',
  ].join(' ')
}

/** The five parts, kept separately for the sidecar beside a library file. */
export function promptParts(lib: Library, req: ImageRequest): Record<string, string> {
  const cat = lib.modules[req.category ?? '']
  const moduleText = typeof cat === 'string' ? cat : cat && req.module ? cat[req.module] ?? '' : ''
  const surf = req.surface ? lib.surfaces[req.surface] : undefined
  return { master: lib.master, module: moduleText, subject: req.subject ?? '', surface: surf ? `${req.surface}: ${surf.ratio}${surf.quiet ? `, quiet ${surf.quiet}` : ''}` : '', negatives: lib.negatives }
}

/** Where an approved image lives. Site surfaces go to the brand's own
    library; post and email surfaces stay in the studio. */
export function destinationFor(surface?: string): 'studio' | 'remedae' {
  const s = (surface ?? '').toLowerCase()
  if (!s || /^(social|email|story|reel|post)/.test(s)) return 'studio'
  return 'remedae'
}

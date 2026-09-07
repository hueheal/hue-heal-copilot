// ============================================================================
// Imagery: a brand's prompt library (master, modules, surfaces, negatives),
// kept in brand_profiles.knowledge under _imagery_library, and the composer
// that builds one production prompt from a seat's request. The order of
// composition is the library's own: master, module, subject, surface,
// negatives. Seats never write the master or the negatives themselves.
// ============================================================================
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface Surface { ratio: string; min?: string; quiet?: string; note?: string }
export interface ImageRequest { purpose?: string; category?: string; module?: string; subject?: string; surface?: string; shot?: string }

export interface Library {
  master: string
  negatives: string
  /** category -> (module key -> module text) or category -> text */
  modules: Record<string, Record<string, string> | string>
  surfaces: Record<string, Surface>
  /** Order the parts are joined in; the guide's own. */
  order?: string[]
  /** Shot types (macro-body, hands-object, portrait-task, ...) and their prose. */
  shotTypes?: Record<string, string>
  /** Generate this many, the founder keeps one. */
  batch?: number
  /** Public URLs of the calibration frames, when the founder has supplied them. */
  referenceUrls?: string[]
  /** Standing corrections from the founder's recent declines. */
  corrections?: string
}

export interface Verdict { status: string; purpose: string; surface: string; note: string | null; decided_at: string }

/** What the founder said about recent images in this workspace, newest first. */
export async function recentVerdicts(admin: SupabaseClient, owner: string, brandId: string | null, limit = 6): Promise<Verdict[]> {
  if (!brandId) return []
  const { data } = await admin.from('image_assets').select('status, purpose, surface, note, decided_at')
    .eq('owner', owner).eq('brand_id', brandId).in('status', ['approved', 'declined']).order('decided_at', { ascending: false }).limit(limit)
  return (data ?? []) as Verdict[]
}

/** The founder's own words on declined images become a standing correction in
    every prompt until newer verdicts replace them. */
export function correctionsLine(verdicts: Verdict[]): string {
  const notes = [...new Set(verdicts.filter((v) => v.status === 'declined' && v.note?.trim()).map((v) => v.note!.trim()))].slice(0, 3)
  return notes.length ? `The founder's corrections from recent reviews, which override anything above: ${notes.join('. ')}.` : ''
}

export function verdictsLine(verdicts: Verdict[]): string {
  if (!verdicts.length) return ''
  return 'THE FOUNDER\'S VERDICTS ON RECENT IMAGES (learn from these before you write a subject): ' +
    verdicts.map((v) => `${v.status} "${v.purpose}" (${v.surface})${v.note ? `: ${v.note}` : ''}`).join('; ') + '.'
}

const DEFAULT_ORDER = ['master', 'module', 'subject', 'surface', 'negatives']
/** The guide's default shot per category. */
const DEFAULT_SHOT: Record<string, string> = { condition: 'macro-body', tradition: 'hands-object', ingredient: 'hands-object', lifestyle: 'portrait-task' }

/** "hero-card 3:4" or "Hero card" -> the library's own key. */
export function surfaceKey(lib: Library, s?: string): string | undefined {
  if (!s) return undefined
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const keys = Object.keys(lib.surfaces)
  const n = norm(s)
  return keys.find((k) => norm(k) === n) ?? keys.find((k) => n.startsWith(norm(k))) ?? keys.find((k) => n.includes(norm(k)))
}
export function shotKey(lib: Library, req: ImageRequest): string | undefined {
  const types = lib.shotTypes ?? {}
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const want = req.shot ? Object.keys(types).find((k) => norm(k) === norm(req.shot!) || norm(req.shot!).includes(norm(k))) : undefined
  return want ?? (req.category && DEFAULT_SHOT[req.category] && types[DEFAULT_SHOT[req.category]] ? DEFAULT_SHOT[req.category] : undefined)
}

export async function loadLibrary(admin: SupabaseClient, brandId: string | null): Promise<Library | null> {
  if (!brandId) return null
  const { data } = await admin.from('brand_profiles').select('knowledge, image_master_prompt, image_negatives').eq('id', brandId).maybeSingle()
  const row = data as { knowledge?: Record<string, unknown>; image_master_prompt?: string; image_negatives?: string } | null
  const raw = row?.knowledge?._imagery_library
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const lib = JSON.parse(raw) as Partial<Library> & { generation?: { batch?: number }; reference?: { urls?: string[] } }
      return {
        master: lib.master ?? row?.image_master_prompt ?? '', negatives: lib.negatives ?? row?.image_negatives ?? '',
        modules: lib.modules ?? {}, surfaces: lib.surfaces ?? {}, order: lib.order, shotTypes: lib.shotTypes,
        batch: lib.batch ?? lib.generation?.batch, referenceUrls: lib.referenceUrls ?? lib.reference?.urls,
      }
    } catch { /* fall through to the plain master prompt */ }
  }
  if (row?.image_master_prompt) return { master: row.image_master_prompt, negatives: row.image_negatives ?? '', modules: {}, surfaces: {} }
  return null
}

/** Ratio string the surface asks for, if any. */
export const surfaceRatio = (lib: Library, surface?: string): string | undefined => { const k = surfaceKey(lib, surface); return (k && lib.surfaces[k]?.ratio) || undefined }

function moduleText(lib: Library, req: ImageRequest): string {
  const cat = lib.modules[req.category ?? '']
  if (typeof cat === 'string') return cat
  if (!cat || !req.module) return ''
  return cat[req.module] ?? cat[Object.keys(cat).find((k) => k.toLowerCase() === (req.module ?? '').toLowerCase()) ?? ''] ?? ''
}

/** The parts, keyed by the guide's names, so both the prompt and the
    sidecar come from one place. */
export function promptParts(lib: Library, req: ImageRequest): Record<string, string> {
  const sk = surfaceKey(lib, req.surface)
  const surf = sk ? lib.surfaces[sk] : undefined
  const shot = shotKey(lib, req)
  // The shot type goes in as the guide's own prefix ("Portrait mid-task:"),
  // not its full description with example gestures, which the model would
  // paint in. The surface is composition, never an instruction to leave
  // parts of the frame empty: that reads as letterboxing.
  const shotPrefix = shot ? (lib.shotTypes?.[shot] ?? '').split(':')[0].replace(/,.*$/, '').trim() : ''
  const subject = (req.subject ?? '').trim()
  const subjectLine = shotPrefix && !new RegExp(`^${shotPrefix.split(' ')[0]}`, 'i').test(subject) ? `${shotPrefix}: ${subject}` : subject
  const ratio = surf?.ratio ?? ''
  const [rw, rh] = ratio.split(':').map(Number)
  const orientation = rw && rh ? (rw > rh ? 'landscape' : rw < rh ? 'portrait' : 'square') : ''
  // The quiet area is recorded for the sidecar and the reviewer, never
  // described to the model: any talk of space for type produces margins.
  const quiet = ''
  return {
    subject: subjectLine,
    corrections: lib.corrections ?? '',
    shot: '',
    master: lib.master,
    module: moduleText(lib, req),
    surface: surf ? `${orientation ? `${orientation[0].toUpperCase()}${orientation.slice(1)} ${ratio}` : ratio}${orientation === 'portrait' ? ', camera close, the subject fills the height of the frame' : ''}.${quiet}` : '',
    negatives: lib.negatives,
  }
}

/** The prompt sent to the model. Negatives are kept in the parts for the
    sidecar but never put into prompt text: the soul endpoint has no
    negative-prompt field, and naming a fault in a positive prompt paints it. */
export function composePrompt(lib: Library, req: ImageRequest): string {
  const parts = { ...promptParts(lib, req), negatives: '' }
  const order = (lib.order?.length ? lib.order : DEFAULT_ORDER).slice()
  // Shot type and the founder's corrections are not in the guide's order
  // list; they belong right after the subject.
  if (!order.includes('shot')) order.splice(order.indexOf('subject') + 1, 0, 'shot')
  if (!order.includes('corrections')) order.splice(order.indexOf('shot') + 1, 0, 'corrections')
  return order.map((k) => parts[k]).filter(Boolean).join(' ')
}

/** What a seat is told it can ask for. */
export function imageryLine(lib: Library | null): string {
  if (!lib) return ''
  const cats = Object.entries(lib.modules).map(([c, m]) => (typeof m === 'string' ? c : `${c} (${Object.keys(m).join(', ')})`))
  const surfs = Object.keys(lib.surfaces)
  const shots = Object.keys(lib.shotTypes ?? {})
  return [
    'IMAGES: you may request production images in the deliverable\'s images field (at most 3 per deliverable, only when the work genuinely needs them). Each request names a purpose, a category' + (cats.length ? ` from: ${cats.join('; ')}` : '') + ', a subject (one person, one action, at most three objects, in one short front-loaded sentence: who, the gesture, the object, the place; say the number of people; no style or camera words, the brand\'s master prompt and rules are added for you)' + (surfs.length ? `, a surface, exactly one of: ${surfs.join(', ')}` : '') + (shots.length ? `, and optionally a shot, one of: ${shots.join(', ')} (defaults: macro-body for conditions, hands-object for traditions and ingredients, portrait-task for lifestyle)` : '') + '.',
    `Each request renders ${lib.batch ?? 1} candidate${(lib.batch ?? 1) === 1 ? '' : 's'}; the founder keeps one. Nothing goes on the site or a post until approved.`,
  ].join(' ')
}

/** Where an approved image lives. Site surfaces go to the brand's own
    library; post and email surfaces stay in the studio. */
export function destinationFor(surface?: string): 'studio' | 'remedae' {
  const s = (surface ?? '').toLowerCase()
  if (!s || /^(social|email|story|reel|post)/.test(s)) return 'studio'
  return 'remedae'
}

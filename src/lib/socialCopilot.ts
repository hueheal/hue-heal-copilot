import { supabase, isSupabaseConfigured, functionsBase } from './supabase'
import { filterByBrand, withBrandInsert } from './brandScope'
import type { Database, PostFormat, Sector, Accent, PostStatus, Slide } from './database.types'

export type Post = Database['public']['Tables']['social_posts']['Row']
export type NewPost = Database['public']['Tables']['social_posts']['Insert']

export interface Brief {
  topic: string
  format: PostFormat
  sector: Sector
  accent: Accent
}

export interface GeneratedCopy {
  headline: string
  caption: string
  hashtags: string[]
  slides: Slide[]
}

export const SECTOR_LABEL: Record<Sector, string> = {
  hospitality: 'Hospitality',
  food_beverage: 'Food & Beverage',
  health_fitness: 'Health & Fitness',
  education: 'Education',
}

export const FORMAT_LABEL: Record<PostFormat, string> = {
  carousel: 'Carousel',
  square: 'Square',
  portrait: 'Portrait',
  story: 'Story',
  quote: 'Quote',
  newsletter: 'Newsletter',
  linkedin: 'LinkedIn',
  report: 'Report',
}

/* ---------------------------------------------------------------------------
   Generation — calls the Claude edge function when connected, otherwise a
   local template so the copilot still "works" offline.
--------------------------------------------------------------------------- */

async function getBrand(): Promise<{ name?: string; tagline?: string; voice?: string }> {
  if (!supabase) return { name: 'Hue & Heal', tagline: 'Designing the future of wellness' }
  const { data } = await supabase.from('brand_kits').select('name, tokens').limit(1).maybeSingle()
  const tokens = (data?.tokens ?? {}) as Record<string, unknown>
  return {
    name: data?.name ?? 'Hue & Heal',
    tagline: typeof tokens.tagline === 'string' ? tokens.tagline : undefined,
    voice: typeof tokens.voice === 'string' ? tokens.voice : undefined,
  }
}

export function localCopy(brief: Brief): GeneratedCopy {
  const topic = brief.topic.trim() || 'wellness spaces'
  const sector = SECTOR_LABEL[brief.sector]
  const caption =
    `A Hue & Heal guide to ${topic.toLowerCase()} — where ${sector.toLowerCase()} meets the ` +
    `science of feeling well. Swipe for the five principles we design by. ↝`
  const bySector: Record<Sector, string> = {
    hospitality: '#HospitalityDesign',
    food_beverage: '#FnBDesign',
    health_fitness: '#WellnessSpaces',
    education: '#LearningEnvironments',
  }
  const slides: Slide[] =
    brief.format === 'carousel' || brief.format === 'report'
      ? [
          { heading: 'Sense of arrival', body: 'The first threshold sets the nervous system for everything after.' },
          { heading: 'Light as material', body: 'Warm, layered light does the quiet work of making a space feel safe.' },
          { heading: 'Natural texture', body: 'Clay, timber and stone ground the body in the room.' },
          { heading: 'Room to breathe', body: 'Negative space is not empty — it is where calm lives.' },
          { heading: 'A reason to return', body: 'Design one detail people will want to come back for.' },
        ]
      : []
  return {
    headline: topic,
    caption,
    hashtags: ['#HueAndHeal', '#WellnessDesign', '#DesigningTheFutureOfWellness', bySector[brief.sector]],
    slides,
  }
}

export async function generateCopy(brief: Brief): Promise<{ copy: GeneratedCopy; source: 'claude' | 'local' }> {
  if (isSupabaseConfigured && supabase && functionsBase) {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (token) {
      try {
        const brand = await getBrand()
        const res = await fetch(`${functionsBase}/generate-copy`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({ ...brief, brand }),
        })
        if (res.ok) {
          const { post } = await res.json()
          if (post) return { copy: post as GeneratedCopy, source: 'claude' }
        }
      } catch {
        /* fall through to local */
      }
    }
  }
  return { copy: localCopy(brief), source: 'local' }
}

export interface ImageOptions {
  preset?: string
  inspiration?: string
  /** Selected brand's creative direction (overrides the built-in defaults). */
  masterPrompt?: string
  negatives?: string
}

export const IMAGE_PRESETS: { key: string; label: string }[] = [
  { key: 'editorial', label: 'Editorial' },
  { key: 'botanical', label: 'Botanical' },
  { key: 'spa', label: 'Moody spa' },
  { key: 'daylight', label: 'Daylight' },
  { key: 'detail', label: 'Material detail' },
]

/** Claude Vision → art-direction description from a pasted reference image. */
export async function analyzeReference(file: File): Promise<{ description: string | null; error?: string }> {
  if (!(isSupabaseConfigured && supabase && functionsBase)) return { description: null, error: 'Not connected — add Supabase keys' }
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return { description: null, error: 'Sign in first (bottom-left)' }
  const base64 = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = reject
    r.readAsDataURL(file)
  })
  try {
    const res = await fetch(`${functionsBase}/analyze-reference`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64, mediaType: file.type || 'image/jpeg' }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { description: null, error: data?.error ? String(data.error) : `Analyze ${res.status}` }
    return { description: data?.description ?? null }
  } catch (e) {
    return { description: null, error: String(e) }
  }
}

export async function generateImage(postId: string, brief: Brief, opts: ImageOptions = {}): Promise<{ url: string | null; error?: string }> {
  if (!(isSupabaseConfigured && supabase && functionsBase)) return { url: null, error: 'Not connected — add Supabase keys' }
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return { url: null, error: 'Sign in first (bottom-left)' }
  try {
    const res = await fetch(`${functionsBase}/generate-image`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ postId, topic: brief.topic, sector: brief.sector, accent: brief.accent, preset: opts.preset, inspiration: opts.inspiration, masterPrompt: opts.masterPrompt, negatives: opts.negatives }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { url: null, error: data?.error ? `${data.error}${data.detail ? ' · ' + String(data.detail).slice(0, 140) : ''}` : `Image function ${res.status}` }
    return { url: data?.url ?? null, error: data?.url ? undefined : 'No image returned' }
  } catch (e) {
    return { url: null, error: String(e) }
  }
}

/* ---------------------------------------------------------------------------
   Idea generation + backlog
--------------------------------------------------------------------------- */
export type Idea = Database['public']['Tables']['content_ideas']['Row']

export interface GeneratedIdea {
  hook: string
  angle: string
  format: PostFormat
  rationale: string
}

const IDEA_SEED_FORMATS: PostFormat[] = ['carousel', 'square', 'portrait', 'story', 'quote']

export function localIdeas(theme: string): GeneratedIdea[] {
  const t = theme.trim() || 'wellness design'
  const seeds: Omit<GeneratedIdea, 'format'>[] = [
    { hook: `A guide to ${t.toLowerCase()}`, angle: `The five principles we design ${t.toLowerCase()} by.`, rationale: 'Evergreen, saveable, shows expertise.' },
    { hook: 'Before & after', angle: `A space transformed through ${t.toLowerCase()}.`, rationale: 'Transformation posts drive shares.' },
    { hook: 'The science of feeling well', angle: `What the research says about ${t.toLowerCase()}.`, rationale: 'Positions the studio as evidence-led.' },
    { hook: 'One detail, done right', angle: `A single design choice that changes how a space feels.`, rationale: 'Bite-sized, on-brand, easy to schedule.' },
    { hook: 'Behind the studio', angle: `How we approach ${t.toLowerCase()} with clients.`, rationale: 'Builds trust and humanises the brand.' },
    { hook: 'Ask the studio', angle: `Answering a real question about ${t.toLowerCase()}.`, rationale: 'Invites engagement and DMs.' },
  ]
  return seeds.map((s, i) => ({ ...s, format: IDEA_SEED_FORMATS[i % IDEA_SEED_FORMATS.length] }))
}

export async function generateIdeas(theme: string): Promise<{ ideas: GeneratedIdea[]; source: 'claude' | 'local' }> {
  if (isSupabaseConfigured && supabase && functionsBase) {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (token) {
      try {
        const brand = await getBrand()
        const res = await fetch(`${functionsBase}/generate-ideas`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({ theme, count: 6, brand }),
        })
        if (res.ok) {
          const { ideas } = await res.json()
          if (Array.isArray(ideas) && ideas.length) return { ideas: ideas as GeneratedIdea[], source: 'claude' }
        }
      } catch {
        /* fall through */
      }
    }
  }
  return { ideas: localIdeas(theme), source: 'local' }
}

let localIdeaStore: Idea[] = []
let localIdeaSeq = 1

export async function listIdeas(): Promise<Idea[]> {
  if (supabase) {
    const { data, error } = await filterByBrand(supabase.from('content_ideas').select('*')).order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }
  return [...localIdeaStore]
}

export async function saveIdea(theme: string, g: GeneratedIdea): Promise<Idea> {
  if (supabase) {
    const { data, error } = await supabase
      .from('content_ideas')
      .insert(withBrandInsert({ theme, hook: g.hook, angle: g.angle, format: g.format, status: 'backlog' }))
      .select('*')
      .single()
    if (error) throw error
    return data
  }
  const idea: Idea = {
    id: `local-idea-${localIdeaSeq++}`, owner: 'local', theme, hook: g.hook, angle: g.angle,
    format: g.format, platform: 'instagram', status: 'backlog', created_at: nowIso(),
  }
  localIdeaStore = [idea, ...localIdeaStore]
  return idea
}

export async function deleteIdea(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('content_ideas').delete().eq('id', id)
    if (error) throw error
    return
  }
  localIdeaStore = localIdeaStore.filter((i) => i.id !== id)
}

/* ---------------------------------------------------------------------------
   Persistence — Supabase when connected, in-memory otherwise.
--------------------------------------------------------------------------- */

let localStore: Post[] = []
let localSeq = 1
function nowIso() {
  return new Date().toISOString()
}

export async function listPosts(): Promise<Post[]> {
  if (supabase) {
    const { data, error } = await filterByBrand(supabase.from('social_posts').select('*')).order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }
  return [...localStore]
}

export async function getPost(id: string): Promise<Post | null> {
  if (supabase) {
    const { data, error } = await supabase.from('social_posts').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data
  }
  return localStore.find((p) => p.id === id) ?? null
}

export async function savePost(input: NewPost): Promise<Post> {
  if (supabase) {
    const { data, error } = await supabase.from('social_posts').insert(withBrandInsert(input)).select('*').single()
    if (error) throw error
    return data
  }
  const post: Post = {
    id: `local-${localSeq++}`,
    owner: 'local',
    brand_kit_id: input.brand_kit_id ?? null,
    topic: input.topic,
    format: input.format,
    sector: input.sector,
    accent: input.accent,
    status: input.status ?? 'draft',
    scheduled_for: input.scheduled_for ?? null,
    headline: input.headline ?? null,
    caption: input.caption ?? null,
    hashtags: input.hashtags ?? [],
    slides: input.slides ?? [],
    image_url: input.image_url ?? null,
    platform: input.platform ?? 'instagram',
    design: input.design ?? {},
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  localStore = [post, ...localStore]
  return post
}

export async function updatePost(id: string, patch: Database['public']['Tables']['social_posts']['Update']): Promise<Post> {
  if (supabase) {
    const { data, error } = await supabase.from('social_posts').update(patch).eq('id', id).select('*').single()
    if (error) throw error
    return data
  }
  localStore = localStore.map((p) => (p.id === id ? { ...p, ...patch, updated_at: nowIso() } as Post : p))
  return localStore.find((p) => p.id === id)!
}

export async function schedulePost(id: string, whenIso: string): Promise<Post> {
  return updatePost(id, { status: 'scheduled' as PostStatus, scheduled_for: whenIso })
}

export async function deletePost(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('social_posts').delete().eq('id', id)
    if (error) throw error
    return
  }
  localStore = localStore.filter((p) => p.id !== id)
}

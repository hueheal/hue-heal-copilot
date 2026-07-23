import { supabase } from './supabase'
import type { Database } from './database.types'

export type BrandProfile = Database['public']['Tables']['brand_profiles']['Row']
export type NewBrandProfile = Database['public']['Tables']['brand_profiles']['Insert']

/* ---------------------------------------------------------------------------
   Seed creative directions. Written the first time an account has no brands.
   These are editable in Settings — they're starting points, not locked config.
--------------------------------------------------------------------------- */

const HUE_HEAL_MASTER = `Premium editorial lifestyle photography for Hue & Heal, a wellness experience design studio.
Every image should feel like a genuine, quietly beautiful moment inside a thoughtfully designed space — never a staged wellness campaign. Wellbeing is felt, not performed.

Visual identity: the warmth of premium hospitality, the calm of contemporary architecture, the honesty of documentary lifestyle photography. Reference points — Aesop, Kinfolk, Cereal Magazine, Airbnb Editorial, COS, modern luxury hospitality.

Photography: shot on a full-frame camera, 50mm f1.4 or 85mm f1.8, natural shallow depth of field, crisp professional focus, beautiful micro-contrast, subtle film grain, premium editorial colour grading, high dynamic range.

Lighting: warm natural sunlight, golden morning or late-afternoon, directional window light, rich highlights and soft sculptural shadows. Bright and optimistic — never flat, clinical or overexposed.

Colour: a warm material palette that feels alive — clay, terracotta, rust, oak and natural timber, stone, sand, bone, warm white, botanical greens, with a single copper accent. Rich but believable; harmonious rather than colour-matched. Never grey, desaturated or muted.

People (when present) are the hero and occupy 70–80% of the attention: real people, natural skin texture and proportions, relaxed contemporary clothing, emotionally independent (no synchronised smiles or mirrored poses). The space supports the story without competing.

Environment: beautiful, intentionally designed but genuinely lived-in spaces — warm wood, stone, plaster, glass, plants, architectural light. Generous negative space in the centre and lower third for text overlay.

Mood: presence, calm, warmth, belonging, optimism, recovery.`

const HUE_HEAL_NEGATIVES = `No text, words, captions, watermarks, logos, signage or UI. No posed people staring at the camera, no synchronised or mirrored expressions. No plastic/AI-perfect skin, no beauty-filter look, no fashion-shoot posing. No spa/yoga clichés, no sterile minimalism, no clinical wellness imagery, no rustic farmhouse styling, no stock-photo feel. Not oversaturated, not obviously HDR. No grey, desaturated or muted grading. No busy compositions or excessive props.`

const HUE_HEAL_TOV = `Warm, considered and quietly confident. Hue & Heal speaks like a thoughtful design director — never salesy, never clinical. Sentences are calm and unhurried, with a poetic restraint: we let space and stillness do the work. We talk about how a place makes you feel before what it is. British English. First-person plural ("we", "our studio"). Avoid hype, buzzwords, exclamation marks and wellness clichés ("unlock", "elevate", "game-changing", "zen"). Prefer concrete, sensory language over abstract claims.`

const HUE_HEAL_GUIDELINES = `Structure newsletters as: a short evocative opening that sets a feeling, one clear idea developed simply, and a single gentle call to action. Keep paragraphs short. Use the serif for headlines, sentence case for warmth. One idea per email. Sign off with quiet authority, not urgency.`

const REMEDAE_MASTER = `REMEDAE MASTER PROMPT — Modern Lifestyle Meets Everyday Wellbeing.
Create a photorealistic premium editorial lifestyle photograph where modern everyday living naturally intersects with wellbeing. The image should feel like a genuine moment from someone's life rather than a staged wellness campaign. Wellbeing should feel effortless, integrated into contemporary living and never performed. People are always the hero of the image. The environment supports the story without competing for attention.

Visual identity: the warmth of premium hospitality, the simplicity of contemporary architecture, the authenticity of documentary lifestyle photography. Think Apple, COS, Lululemon, Aesop, Zara Home, Kinfolk, Cereal Magazine, Airbnb Editorial, modern luxury hospitality photography. It should belong inside a beautifully art-directed editorial campaign, not a stock library.

Photography: Sony A7R IV or Canon 5D Mark IV, 50mm f1.4 or 85mm f1.8, natural shallow depth of field, crisp professional focus, beautiful micro-contrast, subtle realistic film grain, premium editorial colour grading, high dynamic range, magazine quality.

Lighting: warm natural sunlight, golden morning or late afternoon, directional window light, rich highlights, soft sculptural shadows, natural contrast, bright and optimistic, never flat, never clinical, never overexposed. The room feels naturally flooded with beautiful light.

Colour: warm, fresh, alive, optimistic, rich but believable — naturally vibrant rather than muted. Use colour intentionally across clothing, furniture, artwork, architecture, ceramics, plants and objects. Palette includes forest green, sage, olive, terracotta, rust, mustard, deep blue, clay, warm coral, sand, stone, oak, warm white, natural timber, botanical greens. Harmonious rather than colour-matched; the richness of premium lifestyle campaigns, not minimalist Scandinavian interiors.

Human authenticity: real people (not models/influencers), natural body proportions, visible pores, natural skin texture, fine lines, small asymmetries, individual eyelashes, natural hair texture, flyaway hairs, real clothing wrinkles, natural posture, healthy skin. No plastic perfection, no beauty filters.

Human emotion: emerges naturally. Avoid exaggerated happiness, everyone smiling at once, everyone looking at the same thing, synchronised expressions. Each person is emotionally independent — one laughing, one listening, one reflecting, one speaking. Genuine moment captured, not directed.

Body language: never mirror between people. Vary shoulder angle, torso direction, gaze, hand placement, breathing, expression, posture and interaction timing. Every person an independent human sharing the same space.

Composition: people first, 70–80% of the visual attention. Clean supportive backgrounds, generous negative space, strong foreground subject, softly blurred backgrounds, one clear focal point.

Environment: beautiful contemporary spaces, modern architecture, natural materials — warm wood, stone, concrete, glass, plants, architectural light. Intentionally designed but genuinely lived in. Avoid excessive styling, clutter, overly rustic interiors, spa aesthetics, staged wellness environments.

Styling: contemporary everyday clothing — comfortable, relaxed, timeless. Mix natural textures with occasional richer colours. No obvious branding, luxury logos or overly fashionable styling. Interesting modern humans, not fashion models.

Wellness philosophy: wellness exists naturally within everyday life — preparing tea, cooking together, sharing a meal, breathing, stretching, reading, walking, gardening, playing, laughing, listening, resting, working mindfully, time with family, connecting with nature, quiet reflection. Life first, wellbeing second.

Emotional tone: presence, connection, joy, curiosity, recovery, vitality, warmth, calm, belonging, optimism, hope.

Reduce every image to three layers: (1) hero subject, (2) supporting activity or object, (3) architectural/environmental context. Nothing competes with the story. The viewer should feel "I want to live like this" — because it feels attainable, healthy, warm, modern, beautiful and human.`

const REMEDAE_NEGATIVES = `Avoid: stock photography, spa clichés, yoga clichés, matching smiles, mirrored expressions, artificial happiness, plastic skin, AI-perfect faces, fashion-shoot posing, overly styled interiors, excessive décor, perfect symmetry, clinical wellness imagery, rustic farmhouse styling, influencer aesthetic, busy compositions, too many props, wellness clichés, sterile minimalism, grey desaturated grading, overly muted palettes. No text, logos, watermarks or UI.`

function seedProfiles(): NewBrandProfile[] {
  return [
    {
      name: 'Hue & Heal',
      tone_of_voice: HUE_HEAL_TOV,
      writing_guidelines: HUE_HEAL_GUIDELINES,
      image_master_prompt: HUE_HEAL_MASTER,
      image_negatives: HUE_HEAL_NEGATIVES,
      is_default: true,
    },
    {
      name: 'Remedae',
      tone_of_voice: 'Modern, warm and human. Everyday wellbeing, never preachy or performed.',
      writing_guidelines: '',
      image_master_prompt: REMEDAE_MASTER,
      image_negatives: REMEDAE_NEGATIVES,
      is_default: false,
    },
  ]
}

/* ---------------------------------------------------------------------------
   Persistence (Supabase when connected, in-memory otherwise)
--------------------------------------------------------------------------- */
let localBrands: BrandProfile[] = []
let seq = 1
const iso = () => new Date().toISOString()

function localRow(input: NewBrandProfile): BrandProfile {
  return {
    id: `local-brand${seq++}`,
    owner: 'local',
    created_by: 'local',
    name: input.name,
    tone_of_voice: input.tone_of_voice ?? '',
    writing_guidelines: input.writing_guidelines ?? '',
    image_master_prompt: input.image_master_prompt ?? '',
    image_negatives: input.image_negatives ?? '',
    accent_color: input.accent_color ?? '#B5632F',
    logo_url: input.logo_url ?? null,
    display_font: input.display_font ?? (input.name === 'Hue & Heal' ? 'ivyora' : 'poppins'),
    is_default: input.is_default ?? false,
    created_at: iso(),
    updated_at: iso(),
  }
}

// Brand *worlds* are created server-side (migration 0007) or via createBlankBrand.
// On first load we only backfill the rich creative-direction text into the seeded
// Hue & Heal / Remedae shells if they're still empty — never insert duplicates.
let seedRun: Promise<void> | null = null
function ensureSeeded(): Promise<void> {
  if (!seedRun) seedRun = runSeed()
  return seedRun
}
async function runSeed(): Promise<void> {
  if (supabase) {
    try {
      const { data } = await supabase.from('brand_profiles').select('id, name, image_master_prompt')
      if (!data) return
      for (const seed of seedProfiles()) {
        const existing = data.find((b) => b.name === seed.name)
        if (existing && !(existing.image_master_prompt ?? '').trim()) {
          await supabase.from('brand_profiles').update({
            tone_of_voice: seed.tone_of_voice,
            writing_guidelines: seed.writing_guidelines,
            image_master_prompt: seed.image_master_prompt,
            image_negatives: seed.image_negatives,
          }).eq('id', existing.id)
        }
      }
    } catch { /* table missing / not signed in — ignore */ }
    return
  }
  if (localBrands.length === 0) localBrands = seedProfiles().map(localRow)
}

export async function listBrands(): Promise<BrandProfile[]> {
  await ensureSeeded()
  if (supabase) {
    const { data, error } = await supabase
      .from('brand_profiles')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  }
  return [...localBrands].sort((a, b) => Number(b.is_default) - Number(a.is_default))
}

/** Create a fresh, blank white-label brand world and make the creator its owner. */
export async function createBlankBrand(name: string): Promise<BrandProfile> {
  if (supabase) {
    const { data: u } = await supabase.auth.getUser()
    const uid = u.user?.id ?? null
    const email = u.user?.email ?? ''
    const { data, error } = await supabase
      .from('brand_profiles')
      .insert({ name: name.trim() || 'New brand', display_font: 'poppins', accent_color: '#3E5C4B', created_by: uid, is_default: false })
      .select('*')
      .single()
    if (error) throw error
    if (uid) await supabase.from('brand_members').insert({ brand_id: data.id, user_id: uid, email, role: 'owner' })
    return data
  }
  const row = localRow({ name })
  localBrands = [...localBrands, row]
  return row
}

export async function saveBrand(input: NewBrandProfile): Promise<BrandProfile> {
  if (supabase) {
    const { data, error } = await supabase.from('brand_profiles').insert(input).select('*').single()
    if (error) throw error
    return data
  }
  const row = localRow(input)
  localBrands = [...localBrands, row]
  return row
}

export async function updateBrand(id: string, patch: Database['public']['Tables']['brand_profiles']['Update']): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('brand_profiles').update(patch).eq('id', id)
    if (error) throw error
    return
  }
  localBrands = localBrands.map((b) => (b.id === id ? { ...b, ...patch, updated_at: iso() } as BrandProfile : b))
}

export async function deleteBrand(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('brand_profiles').delete().eq('id', id)
    if (error) throw error
    return
  }
  localBrands = localBrands.filter((b) => b.id !== id)
}

/** Make exactly one profile the default (clears the rest). */
export async function setDefaultBrand(id: string): Promise<void> {
  if (supabase) {
    await supabase.from('brand_profiles').update({ is_default: false }).neq('id', id)
    await supabase.from('brand_profiles').update({ is_default: true }).eq('id', id)
    return
  }
  localBrands = localBrands.map((b) => ({ ...b, is_default: b.id === id }))
}

/* ---- Active-brand selection (per browser) ---- */
const ACTIVE_KEY = 'hh.activeBrandId'
export function getActiveBrandId(): string | null {
  try { return localStorage.getItem(ACTIVE_KEY) } catch { return null }
}
export function setActiveBrandId(id: string): void {
  try { localStorage.setItem(ACTIVE_KEY, id) } catch { /* ignore */ }
}

/** Resolve the brand to use for generation: the stored active one, else the default, else the first. */
export function resolveActiveBrand(brands: BrandProfile[]): BrandProfile | null {
  if (!brands.length) return null
  const activeId = getActiveBrandId()
  return brands.find((b) => b.id === activeId) ?? brands.find((b) => b.is_default) ?? brands[0]
}

/* ---- Per-brand membership (invite people to a brand world) ---- */
export type BrandMember = Database['public']['Tables']['brand_members']['Row']

export async function listBrandMembers(brandId: string): Promise<BrandMember[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('brand_members').select('*').eq('brand_id', brandId).order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function inviteBrandMember(brandId: string, email: string, role: 'admin' | 'member' = 'member'): Promise<void> {
  if (!supabase) return
  const clean = email.trim().toLowerCase()
  if (!/.+@.+\..+/.test(clean)) throw new Error('Enter a valid email')
  const { error } = await supabase.from('brand_members').insert({ brand_id: brandId, email: clean, role })
  if (error) throw error
}

export async function removeBrandMember(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('brand_members').delete().eq('id', id)
  if (error) throw error
}

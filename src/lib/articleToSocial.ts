import { generateCopy, savePost } from './socialCopilot'
import { journalUrl } from './journal'
import type { Block } from './newsletter'
import type { Sector } from './database.types'

/* ============================================================
   Article → Instagram. Turns a finished journal article into a
   complete, editable Social Studio draft: the article hero as the
   cover, article images on the slides they belong to, and a caption
   and hashtags that send readers to the piece. Works in every
   workspace; the article link follows the brand world.
   ============================================================ */

export type SocialFormat = 'portrait' | 'carousel' | 'story'

interface BrandLike { name?: string | null; tone_of_voice?: string | null; writing_guidelines?: string | null; website?: string | null; tagline?: string | null }

/** Sections in reading order, each carrying the images that sit inside it, so
    an image can be placed on the slide whose idea it illustrates. */
function sectionsWithImages(blocks: Block[]): { heading: string; images: string[] }[] {
  const out: { heading: string; images: string[] }[] = []
  let cur: { heading: string; images: string[] } | null = null
  for (const b of blocks) {
    if (b.type === 'heading' && b.text.trim()) { cur = { heading: b.text.trim(), images: [] }; out.push(cur) }
    else if (b.type === 'image' && b.url) { if (!cur) { cur = { heading: '', images: [] }; out.push(cur) } cur.images.push(b.url) }
  }
  return out
}

function words(s: string): Set<string> {
  return new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3))
}

/** For each generated slide, pick the article image whose section is the closest
    match (shared words in the heading), used once. Slides without a good match
    stay clean so you can add your own image in the studio. */
function assignImages(slides: { heading: string; body: string }[], sections: { heading: string; images: string[] }[]): (string | undefined)[] {
  const pool = sections.flatMap((s) => s.images.map((img) => ({ img, words: words(s.heading) })))
  const used = new Set<string>()
  return slides.map((sl) => {
    const sw = words(`${sl.heading} ${sl.body}`)
    let best: { img: string; score: number } | null = null
    for (const p of pool) {
      if (used.has(p.img)) continue
      let score = 0
      for (const w of p.words) if (sw.has(w)) score++
      if (score > (best?.score ?? 0)) best = { img: p.img, score }
    }
    if (best && best.score > 0) { used.add(best.img); return best.img }
    return undefined
  })
}

export async function createPostFromArticle(input: {
  format: SocialFormat
  title: string
  dek: string
  hero: string
  slug: string
  blocks: Block[]
  takeaways: string[]
  bodyText: string
  brand: BrandLike | null | undefined
  sector?: Sector
}): Promise<{ id?: string; error?: string }> {
  const url = journalUrl({ slug: input.slug, title: input.title }, input.brand)
  const { copy } = await generateCopy({
    topic: input.title,
    format: input.format,
    sector: input.sector ?? 'health_fitness',
    accent: 'copper',
    article: { title: input.title, dek: input.dek, body: input.bodyText, url, takeaways: input.takeaways },
    brandOverride: input.brand ? { name: input.brand.name ?? undefined, voice: input.brand.tone_of_voice ?? undefined, guidelines: input.brand.writing_guidelines ?? undefined, tagline: input.brand.tagline ?? undefined } : undefined,
  })

  const isMulti = input.format === 'carousel' || input.format === 'story'
  const gen = (copy.slides ?? []).filter((s) => s.heading?.trim() || s.body?.trim())
  const images = isMulti ? assignImages(gen, sectionsWithImages(input.blocks)) : []
  const slides = isMulti ? gen.map((s, i) => ({ heading: s.heading, body: s.body, ...(images[i] ? { image: images[i] } : {}) })) : []

  try {
    const post = await savePost({
      topic: input.title,
      headline: copy.headline || input.title,
      caption: copy.caption,
      hashtags: copy.hashtags ?? [],
      format: input.format,
      sector: input.sector ?? 'health_fitness',
      accent: 'copper',
      status: 'draft',
      platform: 'instagram',
      image_url: input.hero || null,
      slides,
    })
    return { id: post.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

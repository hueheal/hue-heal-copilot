import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlideCanvas } from './SocialStudio'
import { templatesFor, buildDesign, fontsFor, type TemplateSeed } from '../lib/social/templates'
import { INSTAGRAM_FORMATS, type InstaFormat } from '../lib/social/formats'
import { resolveStyle } from '../lib/social/style'
import { useBrand } from '../lib/brandContext'

/* A contact sheet of every template the current workspace can use, rendered
   at real proportions. /templates?format=carousel&photo=1&w=420
   Handy for reviewing a family end to end, and for QA after template edits. */
export default function TemplateGallery() {
  const [sp] = useSearchParams()
  const { current: brand } = useBrand()
  const brandName = sp.get('brand') || brand?.name
  const format = (sp.get('format') as InstaFormat) || 'portrait'
  const w = Number(sp.get('w') || 400)
  const photo = sp.get('photo') === '1'
  const spec = INSTAGRAM_FORMATS[format] ?? INSTAGRAM_FORMATS.portrait
  const seed: TemplateSeed = useMemo(() => ({
    headline: '',
    accent: 'copper',
    brandName,
    logoUrl: brand?.logo_url ?? undefined,
    style: resolveStyle(brand ?? undefined),
    website: brand?.website ?? undefined,
    coverImage: photo ? 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=1600&q=80' : undefined,
  }), [brand, brandName, photo])
  const list = templatesFor(brandName, format)
  const fonts = fontsFor(brandName)
  const content = [
    { heading: 'Warm water, first thing', body: 'TCM and Ayurveda both start the day the same way: heat in the belly before food.' },
    { heading: 'Eat when the sun is highest', body: 'The biggest meal at midday, when digestion is strongest. Kampo agrees.', image: photo ? 'https://images.unsplash.com/photo-1495195134817-aeb325a55b65?w=1600&q=80' : undefined },
    { heading: 'Bitter before noon', body: 'Bitter herbs land better early. Unani has said so for a thousand years.' },
  ]
  return (
    <div style={{ padding: 32 }}>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
        {brandName ?? 'Hue & Heal'} · {spec.label} · {list.length} templates{photo ? ' · with photo' : ''}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28 }}>
        {list.map((t) => {
          const d = buildDesign(format, t.id, seed, 3, format === 'carousel' ? content : undefined)
          return d.slides.map((s, i) => (
            <div key={`${t.id}-${i}`}>
              <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 6 }}>{t.label}{d.slides.length > 1 ? ` · ${i + 1}/${d.slides.length}` : ''}</div>
              <div style={{ boxShadow: 'var(--shadow-raised)' }}>
                <SlideCanvas slide={s} spec={spec} displayW={w} fonts={fonts} />
              </div>
            </div>
          ))
        })}
      </div>
    </div>
  )
}

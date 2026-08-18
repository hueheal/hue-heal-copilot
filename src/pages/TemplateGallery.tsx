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
  const long = sp.get('long') === '1'
  const spec = INSTAGRAM_FORMATS[format] ?? INSTAGRAM_FORMATS.portrait
  const seed: TemplateSeed = useMemo(() => ({
    accent: 'copper',
    brandName,
    logoUrl: brand?.logo_url ?? undefined,
    style: resolveStyle(brand ?? undefined),
    website: brand?.website ?? undefined,
    coverImage: photo ? 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=1600&q=80' : undefined,
    headline: long ? 'Why the world\'s oldest people all seem to eat the same *quiet breakfast*' : '',
    dek: long ? 'Across thirteen traditions the same small morning keeps reappearing: something warm, something bitter, and nothing in a hurry.' : undefined,
    ...(long ? {
      items: ['Warm water before anything else in the morning', 'Eat the biggest meal when the sun is highest', 'Bitter herbs before noon, never after', 'Twelve quiet hours between the last food and the first', 'Screens off, a small light on, an hour before sleep', 'Walk slowly for ten minutes after dinner'],
      itemBodies: ['TCM and Ayurveda both start the day the same way: heat in the belly before any food, and nothing iced until noon.', 'The biggest meal at midday, when digestion is strongest. Kampo agrees, and so does most of the modern chrononutrition literature.', 'Bitter herbs land better early. Unani has said so for a thousand years and a 2021 trial did not disagree.', 'Modern medicine calls it a fasting window. Kampo just calls it dinner, and then bed.', 'Sleep begins with the eyes; every tradition dims the room before it dims the mind.', 'Ten minutes is enough. It is the walking, not the distance.'],
    } : {}),
  }), [brand, brandName, photo, long])
  const list = templatesFor(brandName, format)
  const fonts = fontsFor(brandName)
  const content = long ? [
    { heading: 'Warm water before anything else in the morning', body: 'TCM and Ayurveda both start the day the same way: heat in the belly before any food, and nothing iced until noon.' },
    { heading: 'Eat the biggest meal when the sun is highest', body: 'The biggest meal at midday, when digestion is strongest. Kampo agrees, and so does most of the modern chrononutrition literature.', image: photo ? 'https://images.unsplash.com/photo-1495195134817-aeb325a55b65?w=1600&q=80' : undefined },
    { heading: 'Bitter herbs before noon, never after', body: 'Bitter herbs land better early. Unani has said so for a thousand years and a 2021 trial did not disagree.' },
    { heading: 'Twelve quiet hours between the last food and the first', body: 'Modern medicine calls it a fasting window. Kampo just calls it dinner, and then bed.' },
  ] : [
    { heading: 'Warm water, first thing', body: 'TCM and Ayurveda both start the day the same way: heat in the belly before food.' },
    { heading: 'Eat when the sun is highest', body: 'The biggest meal at midday, when digestion is strongest. Kampo agrees.', image: photo ? 'https://images.unsplash.com/photo-1495195134817-aeb325a55b65?w=1600&q=80' : undefined },
    { heading: 'Bitter before noon', body: 'Bitter herbs land better early. Unani has said so for a thousand years.' },
  ]
  // Margin audit: every text and pill element must sit inside the 80px margins
  // (7.4% of the 1080 canvas) and the canvas itself. Offenders are listed here
  // so a template edit that bleeds shows up before it ships.
  const designs = list.map((t) => ({ t, d: buildDesign(format, t.id, seed, 3, format === 'carousel' ? content : undefined) }))
  const bleeds: string[] = []
  const M = (80 / 1080) * 100
  designs.forEach(({ t, d }) => d.slides.forEach((s, i) => s.elements.forEach((el) => {
    if (el.type !== 'text' && el.type !== 'pill') return
    const r = el.box.x + el.box.w
    if (el.box.x < M - 0.2 || r > 100 - M + 0.2 || el.box.y < 0 || el.box.y + el.box.h > 100.2) bleeds.push(`${t.label} · slide ${i + 1} · ${el.role ?? el.type} (x ${el.box.x.toFixed(1)}–${r.toFixed(1)}%)`)
  })))
  return (
    <div style={{ padding: 32 }}>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
        {brandName ?? 'Hue & Heal'} · {spec.label} · {list.length} templates{photo ? ' · with photo' : ''}{long ? ' · long content' : ''}
        {' · '}<span style={{ color: bleeds.length ? '#b5632f' : 'var(--text-muted)' }}>{bleeds.length ? `${bleeds.length} margin bleeds` : 'margins clean'}</span>
      </div>
      {bleeds.length > 0 && (
        <ul style={{ fontSize: 12, color: '#b5632f', margin: '0 0 18px', paddingLeft: 18 }}>{bleeds.map((b) => <li key={b}>{b}</li>)}</ul>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28 }}>
        {designs.map(({ t, d }) => {
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

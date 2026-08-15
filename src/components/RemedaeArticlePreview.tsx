import { REMEDAE_CATEGORIES, type RemedaeArticle } from '../lib/remedae'

/* ============================================================
   Faithful preview of a remedae.app journal article, mirroring
   app/journal/[slug] in the remedae repo: full-bleed dark hero
   (category pill, Quando title, dek, byline) over a cream
   reading room with Remedae's exact block styles. Colours are
   Remedae's own, intentionally NOT the copilot's tokens.
   ============================================================ */

const CANVAS = '#050a07'
const CREAM_SURFACE = '#f7f4ea'
const INK = '#131a15'
const INK_2 = 'rgba(19,26,21,.72)'
const FOREST = '#364c3f'
const RULE = 'rgba(19,26,21,.14)'
const QUANDO = "'Quando', Georgia, serif"
const HERO_GRAD = 'linear-gradient(180deg, rgba(5,10,7,.65) 0%, rgba(5,10,7,.15) 22%, rgba(5,10,7,.15) 42%, rgba(5,10,7,.6) 68%, rgba(5,10,7,.92) 100%)'

export default function RemedaeArticlePreview({ article, isMobile }: { article: RemedaeArticle; isMobile: boolean }) {
  const categoryLabel = REMEDAE_CATEGORIES.find((c) => c.key === article.category)?.label ?? 'Journal'
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', maxWidth: 760, border: '1px solid rgba(19,26,21,.08)' }}>
      {/* Full-bleed hero */}
      <div style={{ position: 'relative', background: CANVAS, minHeight: isMobile ? 300 : 380, display: 'flex', alignItems: 'flex-end' }}>
        {article.heroImage && (
          <img src={article.heroImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: HERO_GRAD }} />
        <div style={{ position: 'relative', padding: isMobile ? '80px 22px 28px' : '110px 40px 36px', width: '100%' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, borderRadius: 999, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', padding: '5px 14px', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.9)' }}>
            {categoryLabel}
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>·</span>
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>{article.readMinutes} min read</span>
          </span>
          <h1 style={{ fontFamily: QUANDO, fontWeight: 400, fontSize: isMobile ? 30 : 46, lineHeight: 1.03, letterSpacing: '-0.035em', color: '#fff', textShadow: '0 2px 24px rgba(0,0,0,0.4)', margin: '22px 0 0', maxWidth: '88%' }}>
            {article.title || 'Your article title'}
          </h1>
          {article.dek && (
            <p style={{ fontSize: 15, fontWeight: 300, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', margin: '16px 0 0', maxWidth: 560 }}>{article.dek}</p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 26 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.3)', fontSize: 12, fontWeight: 500, color: '#fff' }}>RE</span>
            <span>
              <span style={{ display: 'block', fontSize: 12.5, color: '#fff' }}>Remedae Editors</span>
              <span style={{ display: 'block', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.6)' }}>The Remedae Journal</span>
            </span>
          </div>
        </div>
      </div>

      {/* Cream reading room */}
      <div style={{ background: CREAM_SURFACE, color: INK, padding: isMobile ? '40px 22px 48px' : '64px 40px 72px' }}>
        <div style={{ maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {article.body.length === 0 && (
            <p style={{ fontSize: 14, color: INK_2 }}>Write your first section and it will appear here, exactly as it reads on remedae.app.</p>
          )}
          {article.body.map((b, i) => {
            if (b.kind === 'lede') return (
              <p key={i} style={{ fontFamily: QUANDO, fontSize: isMobile ? 19 : 22, lineHeight: 1.4, letterSpacing: '-0.015em', color: INK, margin: 0 }}>{b.text}</p>
            )
            if (b.kind === 'h2') return (
              <h2 key={i} style={{ fontFamily: QUANDO, fontWeight: 400, fontSize: isMobile ? 21 : 24, lineHeight: 1.2, letterSpacing: '-0.02em', color: INK, margin: '14px 0 0' }}>
                {b.text}<span style={{ color: FOREST }}>.</span>
              </h2>
            )
            if (b.kind === 'p') return (
              <p key={i} style={{ fontSize: 16.5, lineHeight: 1.75, color: INK_2, margin: 0 }}>{b.text}</p>
            )
            if (b.kind === 'quote') return (
              <figure key={i} style={{ margin: '10px 0', paddingLeft: 20, borderLeft: `2px solid ${FOREST}` }}>
                <blockquote style={{ fontFamily: QUANDO, fontSize: 20, lineHeight: 1.45, color: INK, fontStyle: 'italic', margin: 0 }}>“{b.text}”</blockquote>
                {b.attribution && <figcaption style={{ marginTop: 10, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(19,26,21,.55)' }}>{b.attribution}</figcaption>}
              </figure>
            )
            if (b.kind === 'list') return (
              <ul key={i} style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {b.items.map((item, j) => (
                  <li key={j} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: j === b.items.length - 1 ? 'none' : `1px solid ${RULE}` }}>
                    <span aria-hidden style={{ flexShrink: 0, width: 22, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: FOREST, fontWeight: 600, paddingTop: 4 }}>{String(j + 1).padStart(2, '0')}</span>
                    <span style={{ fontSize: 15.5, lineHeight: 1.65, color: INK_2 }}>{item}</span>
                  </li>
                ))}
              </ul>
            )
            if (b.kind === 'image') return (
              <figure key={i} style={{ margin: '6px 0' }}>
                <div style={{ aspectRatio: '16 / 10', overflow: 'hidden', borderRadius: 14, border: `1px solid ${RULE}`, boxShadow: '0 10px 30px rgba(19,26,21,0.08)' }}>
                  <img src={b.url} alt={b.alt ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
                {b.alt && <figcaption style={{ marginTop: 10, fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(19,26,21,.55)' }}>{b.alt}</figcaption>}
              </figure>
            )
            return null
          })}
        </div>
      </div>
    </div>
  )
}

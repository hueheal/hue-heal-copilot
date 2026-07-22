import { useEffect, useState } from 'react'
import PageHeader, { PillButton } from '../components/PageHeader'
import ConfirmButton from '../components/ConfirmButton'
import {
  type BrandProfile,
  listBrands,
  saveBrand,
  updateBrand,
  deleteBrand,
  setDefaultBrand,
} from '../lib/brand'

const label: React.CSSProperties = { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', margin: '20px 0 8px', display: 'block' }
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 8, padding: '10px 12px', fontSize: 13.5, fontFamily: 'var(--font-sans)' }
const area: React.CSSProperties = { ...inp, lineHeight: 1.55, resize: 'vertical' }
const hint: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.5 }

export default function Settings() {
  const [brands, setBrands] = useState<BrandProfile[]>([])
  const [selId, setSelId] = useState<string | null>(null)
  const [draft, setDraft] = useState<BrandProfile | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function reload(pick?: string) {
    const list = await listBrands()
    setBrands(list)
    const target = pick ?? selId ?? list[0]?.id ?? null
    setSelId(target)
    setDraft(list.find((b) => b.id === target) ?? null)
  }
  useEffect(() => { reload().catch(() => setStatus('Could not load brands')) /* eslint-disable-next-line */ }, [])

  function select(id: string) {
    setSelId(id)
    setDraft(brands.find((b) => b.id === id) ?? null)
    setStatus(null)
  }
  const patch = (p: Partial<BrandProfile>) => setDraft((d) => (d ? { ...d, ...p } : d))

  async function save() {
    if (!draft) return
    setBusy(true); setStatus(null)
    try {
      await updateBrand(draft.id, {
        name: draft.name,
        tone_of_voice: draft.tone_of_voice,
        writing_guidelines: draft.writing_guidelines,
        image_master_prompt: draft.image_master_prompt,
        image_negatives: draft.image_negatives,
      })
      await reload(draft.id)
      setStatus('Saved')
    } catch (e) { setStatus(String(e)) } finally { setBusy(false) }
  }

  async function addBrand() {
    setBusy(true)
    try {
      const b = await saveBrand({ name: 'New brand', tone_of_voice: '', writing_guidelines: '', image_master_prompt: '', image_negatives: '' })
      await reload(b.id)
      setStatus('Brand created')
    } catch (e) { setStatus(String(e)) } finally { setBusy(false) }
  }

  async function makeDefault() {
    if (!draft) return
    await setDefaultBrand(draft.id)
    await reload(draft.id)
    setStatus('Set as default')
  }

  async function remove(id: string) {
    await deleteBrand(id)
    setSelId(null)
    await reload()
    setStatus('Brand deleted')
  }

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Brands & AI"
        subtitle="Each brand carries its voice (for writing) and its creative direction (for image generation). The social studio and newsletter writer use the brand you choose."
        action={<PillButton onClick={addBrand}>+ New brand</PillButton>}
      />

      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
        {/* Brand list */}
        <aside style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--hh-line)', padding: '20px 16px', minHeight: 400 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 10 }}>Brands</div>
          {brands.map((b) => (
            <button
              key={b.id}
              onClick={() => select(b.id)}
              className="hh-btn"
              style={{
                display: 'block', width: '100%', textAlign: 'left', border: 'none', borderRadius: 8,
                padding: '9px 11px', marginBottom: 4, fontSize: 13.5,
                background: b.id === selId ? 'var(--hh-mushroom)' : 'transparent',
                color: b.id === selId ? '#2A211A' : 'var(--text-strong)',
              }}
            >
              {b.name}
              {b.is_default && <span style={{ fontSize: 10, color: 'var(--hh-copper)', marginLeft: 6 }}>· default</span>}
            </button>
          ))}
          {brands.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No brands yet.</div>}
        </aside>

        {/* Editor */}
        <section style={{ flex: 1, minWidth: 0, padding: '20px 40px 60px' }}>
          {!draft ? (
            <div style={{ fontSize: 14, color: 'var(--text-muted)', paddingTop: 30 }}>Select or create a brand to edit.</div>
          ) : (
            <div style={{ maxWidth: 760 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} style={{ ...inp, fontSize: 18, fontWeight: 500, maxWidth: 360 }} />
                {!draft.is_default && <PillButton tone="ghost" onClick={makeDefault}>Set as default</PillButton>}
                {draft.is_default && <span style={{ fontSize: 12, color: 'var(--hh-copper)' }}>Default brand</span>}
              </div>

              <div style={{ borderTop: '1px solid var(--hh-line)', margin: '22px 0 0' }} />
              <div style={{ fontSize: 12.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--hh-copper)', margin: '22px 0 2px' }}>Verbal identity</div>

              <label style={label}>Tone of voice</label>
              <textarea rows={4} value={draft.tone_of_voice} onChange={(e) => patch({ tone_of_voice: e.target.value })} style={area} />
              <p style={hint}>How the brand sounds. Injected into the newsletter & caption writer.</p>

              <label style={label}>Writing guidelines</label>
              <textarea rows={4} value={draft.writing_guidelines} onChange={(e) => patch({ writing_guidelines: e.target.value })} style={area} />
              <p style={hint}>Structure, do's & don'ts, sign-off style — anything the AI should follow when writing.</p>

              <div style={{ fontSize: 12.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--hh-copper)', margin: '30px 0 2px' }}>Visual identity — image generation</div>

              <label style={label}>Creative direction (master prompt)</label>
              <textarea rows={14} value={draft.image_master_prompt} onChange={(e) => patch({ image_master_prompt: e.target.value })} style={{ ...area, fontFamily: 'var(--font-sans)' }} />
              <p style={hint}>Prepended to every image the studio generates for this brand — photography style, lighting, colour, composition.</p>

              <label style={label}>Negatives (things to avoid)</label>
              <textarea rows={4} value={draft.image_negatives} onChange={(e) => patch({ image_negatives: e.target.value })} style={area} />
              <p style={hint}>What the image should never contain — clichés, text, artefacts.</p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 28 }}>
                <PillButton onClick={save}>{busy ? 'Saving…' : 'Save changes'}</PillButton>
                {!draft.is_default && (
                  <ConfirmButton
                    onConfirm={() => remove(draft.id)}
                    style={{ background: 'none', border: '1px solid var(--hh-line)', borderRadius: 999, padding: '11px 22px', fontSize: 13, color: 'var(--text-muted)' }}
                  >
                    Delete brand
                  </ConfirmButton>
                )}
                {status && <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{status}</span>}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

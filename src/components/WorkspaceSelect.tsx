import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { useBrand, textOnColor } from '../lib/brandContext'
import { createBrandWorld } from '../lib/brand'
import { MODULE_OPTIONS, FUNCTION_PRESETS, DEFAULT_MODULES, COMING_SOON } from '../lib/modules'
import { synthesizeBrand, type SynthesisResult } from '../lib/brandSynthesis'
import Logo from './Logo'

const INK = 'var(--hh-ink, #1E1B18)'
const CREAM = 'var(--text-on-ink, #F4F0E7)'
const MUTED = 'var(--text-on-ink-muted, #b8ad9c)'
const LINE = 'var(--hh-line-ink, rgba(244,240,231,0.16))'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', width: '100%', background: INK, color: CREAM, fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', boxSizing: 'border-box', overflowY: 'auto' }}>
      {children}
    </div>
  )
}

/* --------------------------------------------------------- Workspace select */
export default function WorkspaceSelect() {
  const { brands, setCurrent, loading } = useBrand()
  const auth = useAuth()
  const [creating, setCreating] = useState(false)

  if (creating) return <OnboardingWizard onCancel={() => setCreating(false)} />

  return (
    <Shell>
      <div style={{ width: '100%', maxWidth: 820 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}><Logo height={22} /></div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 30, textAlign: 'center', margin: '0 0 6px' }}>Choose a workspace</h1>
        <p style={{ fontSize: 13.5, color: MUTED, textAlign: 'center', margin: '0 0 32px' }}>Each brand world has its own dashboard, content and identity.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {brands.map((b) => (
            <button
              key={b.id}
              onClick={() => setCurrent(b.id)}
              className="hh-btn"
              style={{ textAlign: 'left', background: 'rgba(244,240,231,0.04)', border: `1px solid ${LINE}`, borderRadius: 16, padding: 18, cursor: 'pointer', color: CREAM, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 132 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: b.accent_color || '#B5632F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: textOnColor(b.accent_color || '#B5632F') }}>
                  {b.name.slice(0, 1).toUpperCase()}
                </span>
                {b.is_default && <span style={{ marginLeft: 'auto', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Parent</span>}
              </div>
              <div>
                <div style={{ fontFamily: b.display_font === 'ivyora' ? 'var(--font-serif)' : 'var(--font-sans)', fontSize: 19, marginBottom: 4 }}>{b.name}</div>
                <div style={{ fontSize: 11.5, color: MUTED }}>{(b.modules ?? DEFAULT_MODULES).length} modules · {b.display_font === 'ivyora' ? 'Ivy Ora' : 'Poppins'}</div>
              </div>
            </button>
          ))}

          <button
            onClick={() => setCreating(true)}
            className="hh-btn"
            style={{ background: 'transparent', border: `1px dashed ${LINE}`, borderRadius: 16, padding: 18, cursor: 'pointer', color: MUTED, minHeight: 132, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13.5 }}
          >
            <span style={{ fontSize: 26, lineHeight: 1 }}>＋</span>
            New brand world
          </button>
        </div>

        {loading && <div style={{ textAlign: 'center', color: MUTED, fontSize: 12.5, marginTop: 20 }}>Loading workspaces…</div>}

        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <button onClick={auth.signOut} style={{ background: 'none', border: 'none', color: MUTED, fontSize: 12.5, cursor: 'pointer' }}>
            {auth.email ? `Signed in as ${auth.email} · Sign out` : 'Sign out'}
          </button>
        </div>
      </div>
    </Shell>
  )
}

/* ------------------------------------------------------------- The wizard */
interface Form {
  name: string
  accent_color: string
  display_font: 'ivyora' | 'poppins'
  modules: string[]
  tone_of_voice: string
  writing_guidelines: string
  image_master_prompt: string
  image_negatives: string
}

const STEPS = ['Brand files', 'Name', 'Colour', 'Modules', 'Review'] as const

function OnboardingWizard({ onCancel }: { onCancel: () => void }) {
  const { setCurrent, reload } = useBrand()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [notes, setNotes] = useState('')
  const [form, setForm] = useState<Form>({
    name: '', accent_color: '#3E5C4B', display_font: 'poppins',
    modules: [...DEFAULT_MODULES], tone_of_voice: '', writing_guidelines: '', image_master_prompt: '', image_negatives: '',
  })
  const set = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }))

  async function runSynthesis() {
    if (!files.length && !notes.trim()) { setStep(1); return }
    setBusy(true); setNote('Synthesising your brand with Claude…')
    const { result, error } = await synthesizeBrand(files, notes)
    setBusy(false)
    if (error || !result) { setNote(error ? `Couldn’t synthesise: ${error}` : 'No result — continue manually.'); return }
    applySynthesis(result)
    setNote('Applied — review the details below.')
    setStep(1)
  }
  function applySynthesis(r: SynthesisResult) {
    set({
      name: r.name ?? form.name,
      accent_color: r.accent_color ?? form.accent_color,
      display_font: r.display_font ?? form.display_font,
      tone_of_voice: r.tone_of_voice ?? form.tone_of_voice,
      writing_guidelines: r.writing_guidelines ?? form.writing_guidelines,
      image_master_prompt: r.image_master_prompt ?? form.image_master_prompt,
      image_negatives: r.image_negatives ?? form.image_negatives,
      modules: r.suggested_modules?.length ? r.suggested_modules : form.modules,
    })
  }
  const toggleModule = (k: string) => set({ modules: form.modules.includes(k) ? form.modules.filter((m) => m !== k) : [...form.modules, k] })

  async function create() {
    setBusy(true); setNote(null)
    try {
      const b = await createBrandWorld(form)
      await reload()
      setCurrent(b.id)
    } catch (e) { setNote(String(e)); setBusy(false) }
  }

  const onText = textOnColor(form.accent_color)

  return (
    <Shell>
      <div style={{ width: '100%', maxWidth: 620 }}>
        {/* progress dots (themed by chosen colour) */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 26 }}>
          {STEPS.map((_, i) => (
            <span key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 4, background: i <= step ? form.accent_color : LINE, transition: 'all .2s' }} />
          ))}
        </div>

        <div style={{ background: 'rgba(244,240,231,0.04)', border: `1px solid ${LINE}`, borderRadius: 18, padding: 28 }}>
          {step === 0 && (
            <>
              <H>Start from your brand</H>
              <P>Tell Claude about the brand and/or upload a logo, guidelines (PDF) or a tone-of-voice doc. It’ll draft this world’s colour, voice and creative direction — you review before anything’s applied. Or skip and set it up by hand.</P>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Describe the brand — who it's for, how it should feel, its personality, colours, any references… anything helps."
                style={{ ...inp, resize: 'vertical', lineHeight: 1.55, margin: '4px 0 10px' }}
              />
              <label style={fileBox}>
                <input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.txt,.md" style={{ display: 'none' }} onChange={(e) => setFiles([...(e.target.files ?? [])])} />
                {files.length ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : '＋ Add brand files (optional)'}
              </label>
              {note && <div style={noteStyle}>{note}</div>}
              <Row>
                <Ghost onClick={onCancel}>Cancel</Ghost>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                  <Ghost onClick={() => setStep(1)}>Skip</Ghost>
                  <Primary color={form.accent_color} onText={onText} disabled={busy} onClick={runSynthesis}>{busy ? 'Synthesising…' : (files.length || notes.trim()) ? 'Synthesise' : 'Continue'}</Primary>
                </div>
              </Row>
            </>
          )}

          {step === 1 && (
            <>
              <H>Name this brand world</H>
              <input autoFocus value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Remedae" style={inp} onKeyDown={(e) => { if (e.key === 'Enter' && form.name.trim()) setStep(2) }} />
              <label style={lbl}>Headline font</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['poppins', 'ivyora'] as const).map((f) => (
                  <button key={f} onClick={() => set({ display_font: f })} className="hh-btn" style={chip(form.display_font === f)}>
                    {f === 'poppins' ? 'Poppins (white-label)' : 'Ivy Ora (parent)'}
                  </button>
                ))}
              </div>
              <Row><Ghost onClick={() => setStep(0)}>Back</Ghost><Primary color={form.accent_color} onText={onText} disabled={!form.name.trim()} onClick={() => setStep(2)}>Continue</Primary></Row>
            </>
          )}

          {step === 2 && (
            <>
              <H>Primary colour</H>
              <P>This themes the whole workspace. Text adapts automatically for legibility.</P>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <input type="color" value={form.accent_color} onChange={(e) => set({ accent_color: e.target.value })} style={{ width: 46, height: 40, border: `1px solid ${LINE}`, borderRadius: 10, background: 'none', padding: 2, cursor: 'pointer' }} />
                <input value={form.accent_color} onChange={(e) => set({ accent_color: e.target.value })} style={{ ...inp, margin: 0, width: 130 }} />
                <div style={{ marginLeft: 'auto', background: form.accent_color, color: onText, borderRadius: 10, padding: '10px 18px', fontFamily: form.display_font === 'ivyora' ? 'var(--font-serif)' : 'var(--font-sans)', fontSize: 15 }}>Aa Preview</div>
              </div>
              <Row><Ghost onClick={() => setStep(1)}>Back</Ghost><Primary color={form.accent_color} onText={onText} onClick={() => setStep(3)}>Continue</Primary></Row>
            </>
          )}

          {step === 3 && (
            <>
              <H>What does this brand need?</H>
              <P>Pick a starting point, then tune the modules. The sidebar is built from what you enable.</P>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {FUNCTION_PRESETS.map((p) => (
                  <button key={p.key} onClick={() => set({ modules: [...p.modules] })} className="hh-btn" style={chip(false)}>{p.label}</button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {MODULE_OPTIONS.map((m) => {
                  const on = form.modules.includes(m.key)
                  return (
                    <button key={m.key} onClick={() => toggleModule(m.key)} className="hh-btn" style={{ textAlign: 'left', border: `1px solid ${on ? form.accent_color : LINE}`, background: on ? 'rgba(244,240,231,0.06)' : 'transparent', borderRadius: 12, padding: '11px 13px', color: CREAM, cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 15, height: 15, borderRadius: 4, border: `1px solid ${on ? form.accent_color : LINE}`, background: on ? form.accent_color : 'transparent', flexShrink: 0 }} />
                        <span style={{ fontSize: 13.5 }}>{m.label}</span>
                        {m.comingSoon && <span style={{ marginLeft: 'auto', fontSize: 9.5, color: MUTED, textTransform: 'uppercase' }}>soon</span>}
                      </div>
                      <div style={{ fontSize: 11, color: MUTED, marginTop: 4, paddingLeft: 23 }}>{m.description}</div>
                    </button>
                  )
                })}
              </div>
              <Row><Ghost onClick={() => setStep(2)}>Back</Ghost><Primary color={form.accent_color} onText={onText} onClick={() => setStep(4)}>Continue</Primary></Row>
            </>
          )}

          {step === 4 && (
            <>
              <H>Review</H>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 18px' }}>
                <span style={{ width: 42, height: 42, borderRadius: 12, background: form.accent_color, color: onText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontFamily: form.display_font === 'ivyora' ? 'var(--font-serif)' : 'var(--font-sans)' }}>{(form.name || 'B').slice(0, 1).toUpperCase()}</span>
                <div>
                  <div style={{ fontSize: 18, fontFamily: form.display_font === 'ivyora' ? 'var(--font-serif)' : 'var(--font-sans)' }}>{form.name || 'Untitled brand'}</div>
                  <div style={{ fontSize: 12, color: MUTED }}>{form.accent_color} · {form.display_font === 'ivyora' ? 'Ivy Ora' : 'Poppins'} · {form.modules.length} modules</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
                Modules: {form.modules.map((k) => MODULE_OPTIONS.find((m) => m.key === k)?.label ?? k).join(', ') || 'none'}
                {form.tone_of_voice && <><br />Voice: {form.tone_of_voice.slice(0, 120)}{form.tone_of_voice.length > 120 ? '…' : ''}</>}
              </div>
              {note && <div style={noteStyle}>{note}</div>}
              <Row><Ghost onClick={() => setStep(3)}>Back</Ghost><Primary color={form.accent_color} onText={onText} disabled={busy || !form.name.trim()} onClick={create}>{busy ? 'Creating…' : 'Create brand world'}</Primary></Row>
            </>
          )}
        </div>
        {COMING_SOON.size > 0 && step === 3 && <p style={{ fontSize: 11, color: MUTED, textAlign: 'center', marginTop: 12 }}>“Soon” modules appear in the menu with a preview state.</p>}
      </div>
    </Shell>
  )
}

/* ---- tiny styled helpers ---- */
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'rgba(244,240,231,0.06)', border: `1px solid ${LINE}`, borderRadius: 10, padding: '12px 14px', fontSize: 15, color: CREAM, fontFamily: 'var(--font-sans)', margin: '4px 0 14px' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, margin: '10px 0 8px' }
const fileBox: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px dashed ${LINE}`, borderRadius: 12, padding: '22px', fontSize: 13.5, color: MUTED, cursor: 'pointer', margin: '4px 0 8px' }
const noteStyle: React.CSSProperties = { fontSize: 12.5, color: MUTED, marginTop: 12, lineHeight: 1.5 }
function chip(on: boolean): React.CSSProperties {
  return { border: `1px solid ${on ? 'var(--hh-copper)' : LINE}`, background: on ? 'rgba(244,240,231,0.08)' : 'transparent', color: CREAM, borderRadius: 999, padding: '8px 14px', fontSize: 12.5, cursor: 'pointer' }
}
function H({ children }: { children: React.ReactNode }) { return <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 22, margin: '0 0 6px' }}>{children}</h2> }
function P({ children }: { children: React.ReactNode }) { return <p style={{ fontSize: 13, color: MUTED, margin: '0 0 16px', lineHeight: 1.55 }}>{children}</p> }
function Row({ children }: { children: React.ReactNode }) { return <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 22 }}>{children}</div> }
function Ghost({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="hh-btn" style={{ background: 'none', border: `1px solid ${LINE}`, color: MUTED, borderRadius: 10, padding: '10px 18px', fontSize: 13, cursor: 'pointer' }}>{children}</button>
}
function Primary({ children, onClick, color, onText, disabled }: { children: React.ReactNode; onClick: () => void; color: string; onText: string; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} className="hh-btn" style={{ marginLeft: 'auto', background: color, color: onText, border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13.5, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}>{children}</button>
}

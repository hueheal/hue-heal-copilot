import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PillButton } from '../components/PageHeader'
import ConfirmButton from '../components/ConfirmButton'
import ProposalDocument from '../components/ProposalDocument'
import {
  type Proposal,
  getProposal,
  updateProposal,
  deleteProposal,
  generateProposalDraft,
  phasesTotal,
} from '../lib/studioOps'
import { slugify } from '../lib/pdf'
import type { ProposalPhase } from '../lib/database.types'

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 8,
  padding: '10px 12px', fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--text-strong)',
}
const labelStyle: React.CSSProperties = { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 6, display: 'block' }

export default function ProposalEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const [p, setP] = useState<Proposal | null>(null)
  const [brief, setBrief] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (id) getProposal(id).then(setP).catch(() => setStatus('Could not load proposal'))
  }, [id])

  if (!p) {
    return <div style={{ padding: 40, color: 'var(--text-muted)' }}>{status ?? 'Loading proposal…'}</div>
  }

  const set = (patch: Partial<Proposal>) => setP({ ...p, ...patch } as Proposal)
  const setContent = (k: 'intro' | 'approach' | 'timeline' | 'terms', v: string) =>
    set({ content: { ...p.content, [k]: v } })
  const setPhase = (i: number, patch: Partial<ProposalPhase>) =>
    set({ phases: p.phases.map((ph, j) => (j === i ? { ...ph, ...patch } : ph)) })
  const addPhase = () => set({ phases: [...p.phases, { name: '', detail: '', fee: 0 }] })
  const removePhase = (i: number) => set({ phases: p.phases.filter((_, j) => j !== i) })

  async function draftWithAI() {
    setBusy(true); setStatus(null)
    try {
      const { draft, source } = await generateProposalDraft(p!.client_name, brief)
      set({
        title: draft.title || p!.title,
        phases: draft.phases,
        content: { intro: draft.intro, approach: draft.approach, timeline: draft.timeline, terms: draft.terms },
      })
      setStatus(source === 'claude' ? 'Drafted with Claude — edit anything below' : 'Drafted on-device (connect Supabase for Claude)')
    } finally {
      setBusy(false)
    }
  }

  async function downloadPdf() {
    setBusy(true); setStatus('Preparing PDF…')
    try {
      const { downloadProposalPdf } = await import('../lib/pdfDoc')
      await downloadProposalPdf(p!, `${slugify(p!.client_name)}-proposal.pdf`)
      setStatus('PDF downloaded')
    } catch (e) {
      setStatus(`Couldn’t make PDF: ${e instanceof Error ? e.message : e}`)
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    setBusy(true); setStatus(null)
    try {
      await updateProposal(p!.id, {
        title: p!.title, client_name: p!.client_name, content: p!.content,
        phases: p!.phases, amount_gbp: phasesTotal(p!.phases),
      })
      setStatus('Saved')
    } catch (e) {
      setStatus(`Couldn’t save: ${e instanceof Error ? e.message : e}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {/* Toolbar (hidden in print) */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 40px', borderBottom: '1px solid var(--hh-line)' }}>
        <button onClick={() => nav('/proposals')} className="hh-btn" style={{ background: 'none', border: 'none', color: 'var(--hh-copper)', fontSize: 13 }}>⟵ Proposals</button>
        <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>{p.client_name} · {p.status}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {status && <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{status}</span>}
          <ConfirmButton
            onConfirm={async () => { await deleteProposal(p!.id); nav('/proposals') }}
            confirmLabel="Delete proposal?"
            style={{ background: 'none', border: '1px solid var(--hh-line)', borderRadius: 999, padding: '11px 18px', fontSize: 13, color: 'var(--text-muted)' }}
          >
            Delete
          </ConfirmButton>
          <PillButton tone="ghost" onClick={save}>{busy ? 'Working…' : 'Save'}</PillButton>
          <PillButton tone="ink" onClick={downloadPdf}>↧ Download PDF</PillButton>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 28, padding: '28px 40px', alignItems: 'start' }}>
        {/* Editor (hidden in print) */}
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ background: 'var(--hh-anthracite)', color: 'var(--text-on-ink)', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--hh-ember)', marginBottom: 10 }}>Draft with AI</div>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Describe the scope — e.g. 'Wellness spa concept + interiors for a boutique hotel in the Cotswolds, 8 treatment rooms, opening spring.'"
              rows={4}
              style={{ ...inputStyle, background: 'rgba(244,240,231,0.08)', border: '1px solid var(--hh-line-ink)', color: 'var(--text-on-ink)', resize: 'vertical' }}
            />
            <div style={{ marginTop: 10 }}>
              <PillButton tone="accent" onClick={draftWithAI}>{busy ? 'Drafting…' : '✦ Draft proposal'}</PillButton>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Client</label>
            <input style={inputStyle} value={p.client_name} onChange={(e) => set({ client_name: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Title</label>
            <input style={inputStyle} value={p.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <EditArea label="Introduction" value={p.content.intro ?? ''} onChange={(v) => setContent('intro', v)} />
          <EditArea label="Our approach" value={p.content.approach ?? ''} onChange={(v) => setContent('approach', v)} />

          <div>
            <label style={labelStyle}>Phases &amp; fees · total {phasesTotal(p.phases) ? `£${phasesTotal(p.phases).toLocaleString('en-GB')}` : '£0'}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {p.phases.map((ph, i) => (
                <div key={i} style={{ border: '1px solid var(--hh-line)', borderRadius: 10, padding: 10, background: 'var(--hh-bone)' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...inputStyle, flex: 1 }} placeholder="Phase" value={ph.name} onChange={(e) => setPhase(i, { name: e.target.value })} />
                    <input style={{ ...inputStyle, width: 96 }} placeholder="£" value={ph.fee || ''} onChange={(e) => setPhase(i, { fee: parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0 })} />
                    <button onClick={() => removePhase(i)} className="hh-btn" style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 16 }}>×</button>
                  </div>
                  <input style={{ ...inputStyle, marginTop: 8, fontSize: 13 }} placeholder="What this phase delivers" value={ph.detail ?? ''} onChange={(e) => setPhase(i, { detail: e.target.value })} />
                </div>
              ))}
              <button onClick={addPhase} className="hh-btn" style={{ background: 'none', border: '1px dashed var(--hh-line)', borderRadius: 10, padding: '9px', color: 'var(--text-muted)', fontSize: 13 }}>＋ Add phase</button>
            </div>
          </div>

          <EditArea label="Timeline" value={p.content.timeline ?? ''} onChange={(v) => setContent('timeline', v)} rows={2} />
          <EditArea label="Terms" value={p.content.terms ?? ''} onChange={(v) => setContent('terms', v)} rows={2} />
        </div>

        {/* Live document */}
        <ProposalDocument proposal={p} />
      </div>
    </div>
  )
}

function EditArea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} />
    </div>
  )
}

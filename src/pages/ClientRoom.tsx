import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ConfirmButton from '../components/ConfirmButton'
import { useAuth } from '../lib/auth'
import { useIsMobile } from '../lib/useIsMobile'
import {
  type Client, type Proposal, type Invoice,
  STAGES, listClients, updateClient, listProposals, listInvoices, addProposal, addInvoice, gbpCompact,
} from '../lib/studioOps'
import { type ClientDoc, listClientDocs, addClientDoc, deleteClientDoc } from '../lib/clientDocs'
import { PHASES, phaseOf, blankDeck, blankA4, type Phase, type PhaseTemplate } from '../lib/phases'
import { HUE_HEAL_LOGO_PATH, HUE_HEAL_LOGO_VIEWBOX } from '../lib/logoPath'
import type { ClientStage } from '../lib/database.types'

/* The client room, to the design: hero, the five design phases, documents and
   branded template starting points per phase, engagement facts and activity. */

const railLabel: React.CSSProperties = { fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)' }
const COVER_GRADS = ['linear-gradient(135deg,#2A2620,#14110E)', 'linear-gradient(135deg,#8A4A22,#2A2620)', 'linear-gradient(135deg,#4A3B2E,#1E1B18)']
const DOC_STATUS: Record<string, string> = { draft: 'var(--text-faint)', shared: 'var(--status-positive)' }

export default function ClientRoom() {
  const { id } = useParams()
  const auth = useAuth()
  const nav = useNavigate()
  const isMobile = useIsMobile()
  const gated = auth.mode === 'connected' && !auth.session

  const [client, setClient] = useState<Client | null>(null)
  const [docs, setDocs] = useState<ClientDoc[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [phaseKey, setPhaseKey] = useState<Phase['key']>('engage')
  const [creating, setCreating] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  async function reload() {
    if (gated || !id) return
    const [cs, ds, ps, is] = await Promise.all([
      listClients().catch(() => []),
      listClientDocs(id).catch(() => []),
      listProposals().catch(() => []),
      listInvoices().catch(() => []),
    ])
    const c = cs.find((x) => x.id === id) ?? null
    setClient(c)
    setDocs(ds)
    setProposals(ps.filter((p) => p.client_id === id || (c && p.client_name === c.name)))
    setInvoices(is.filter((i) => i.client_id === id || (c && i.client_name === c.name)))
  }
  useEffect(() => { reload() /* eslint-disable-next-line */ }, [id, auth.session, auth.mode])

  const phase = phaseOf(phaseKey)
  const phaseDocs = useMemo(() => docs.filter((d) => (d.phase ?? 'engage') === phaseKey), [docs, phaseKey])
  const docCountByPhase = useMemo(() => {
    const m: Record<string, number> = {}
    for (const d of docs) m[d.phase ?? 'engage'] = (m[d.phase ?? 'engage'] ?? 0) + 1
    m.engage = (m.engage ?? 0) + proposals.length + invoices.length
    return m
  }, [docs, proposals.length, invoices.length])

  async function setStage(stage: ClientStage) {
    if (!client) return
    await updateClient(client.id, { stage })
    setClient({ ...client, stage })
  }

  async function newFromTemplate(t: PhaseTemplate) {
    if (!client || creating) return
    setCreating(t.title)
    try {
      const doc = await addClientDoc({
        client_id: client.id,
        kind: t.formKind ?? t.kind.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        phase: phase.key,
        format: t.format,
        title: `${t.title} · ${client.name}`,
        is_form: t.format === 'form',
        blocks: t.seed ? (t.seed(client.name) as unknown[]) : [],
      })
      nav(`/clients/${client.id}/doc/${doc.id}`)
    } catch (e) { setStatus(`Couldn’t create: ${e instanceof Error ? e.message : e}`); setCreating(null) }
  }
  async function newBlank(format: 'deck' | 'a4') {
    if (!client || creating) return
    setCreating(`blank-${format}`)
    try {
      const doc = await addClientDoc({
        client_id: client.id, kind: format === 'deck' ? 'presentation' : 'document', phase: phase.key, format,
        title: `Untitled ${format === 'deck' ? 'presentation' : 'document'}`,
        blocks: (format === 'deck' ? blankDeck(client.name) : blankA4(client.name)) as unknown[],
      })
      nav(`/clients/${client.id}/doc/${doc.id}`)
    } catch (e) { setStatus(`Couldn’t create: ${e instanceof Error ? e.message : e}`); setCreating(null) }
  }
  async function newProposal() {
    if (!client || creating) return
    setCreating('proposal')
    try { const p = await addProposal({ client_id: client.id, client_name: client.name, title: `${client.name} · Proposal` }); nav(`/proposals/${p.id}`) }
    catch (e) { setStatus(`Couldn’t create: ${e instanceof Error ? e.message : e}`); setCreating(null) }
  }
  async function newInvoice() {
    if (!client || creating) return
    setCreating('invoice')
    try { const i = await addInvoice({ client_id: client.id, client_name: client.name, title: `${client.name} · Invoice` }); nav(`/invoices/${i.id}`) }
    catch (e) { setStatus(`Couldn’t create: ${e instanceof Error ? e.message : e}`); setCreating(null) }
  }

  /* Activity: everything for this client, newest first. */
  const activity = useMemo(() => {
    const items: { what: string; when: string; ts: number }[] = []
    for (const d of docs) items.push({ what: `${d.title || 'Document'}${d.shared ? ' · shared' : ''}`, when: rel(d.updated_at), ts: Date.parse(d.updated_at) })
    for (const p of proposals) items.push({ what: `${p.title} · ${p.status}`, when: rel(p.updated_at), ts: Date.parse(p.updated_at) })
    for (const i of invoices) items.push({ what: `${i.title} · ${i.status}`, when: rel(i.updated_at), ts: Date.parse(i.updated_at) })
    return items.sort((a, b) => b.ts - a.ts).slice(0, 6)
  }, [docs, proposals, invoices])

  const initials = (client?.name ?? '·').split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  const pad = isMobile ? '18px 16px' : '28px 40px'

  if (gated) return <p style={{ padding: pad, fontSize: 14, color: 'var(--text-muted)' }}>Sign in to open this client.</p>
  if (!client) return <p style={{ padding: pad, fontSize: 14, color: 'var(--text-faint)' }}>Loading client…</p>

  const sharedCount = docs.filter((d) => d.shared).length + proposals.filter((p) => p.shared).length + invoices.filter((i) => i.shared).length

  return (
    <div>
      {/* Breadcrumb + hero */}
      <div style={{ padding: isMobile ? '16px 16px 20px' : '24px 40px 30px', borderBottom: '1px solid var(--hh-line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <button onClick={() => nav('/clients')} className="hh-btn" style={{ background: 'none', border: 'none', color: 'var(--hh-copper)', fontSize: 13, cursor: 'pointer', padding: 0 }}>‹ Clients</button>
          <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>/ {client.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ width: isMobile ? 44 : 54, height: isMobile ? 44 : 54, flexShrink: 0, borderRadius: '50%', background: 'var(--hh-mushroom)', color: '#2A211A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 15 : 18, fontWeight: 600 }}>{initials}</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-accent)' }}>{[client.sector, STAGES.find((s) => s.key === client.stage)?.label].filter(Boolean).join(' · ')}</div>
            <h1 className="hh-serif" style={{ fontWeight: 400, fontSize: isMobile ? 27 : 38, letterSpacing: '-0.01em', margin: '4px 0 0', lineHeight: 1.08 }}>{client.name}</h1>
          </div>
          <div style={{ display: 'flex', gap: 18 }}>
            {[{ num: gbpCompact(client.value_gbp), label: 'Value' }, { num: String(docs.length + proposals.length + invoices.length), label: 'Documents' }, { num: String(sharedCount), label: 'Shared' }].map((f) => (
              <div key={f.label} style={{ textAlign: isMobile ? 'left' : 'right' }}>
                <div className="hh-serif" style={{ fontSize: isMobile ? 20 : 24, color: 'var(--text-accent)', lineHeight: 1 }}>{f.num}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>{f.label}</div>
              </div>
            ))}
          </div>
        </div>
        {client.note && <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: '14px 0 0', maxWidth: '64ch', lineHeight: 1.6 }}>{client.note}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
          {STAGES.map((st) => {
            const active = st.key === client.stage
            return (
              <button key={st.key} className="hh-btn" onClick={() => setStage(st.key)}
                style={{ borderRadius: 999, padding: '7px 13px', fontSize: 11.5, fontWeight: 500, cursor: 'pointer', border: active ? '1px solid var(--hh-anthracite)' : '1px solid var(--hh-line)', background: active ? 'var(--hh-anthracite)' : 'transparent', color: active ? 'var(--text-on-ink)' : 'var(--text-faint)' }}>
                {st.label}
              </button>
            )
          })}
        </div>
        {status && <p style={{ fontSize: 12.5, color: 'var(--hh-terracotta)', margin: '10px 0 0' }}>{status}</p>}
      </div>

      <div style={{ padding: pad, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 300px', gap: 32, alignItems: 'start', maxWidth: 1180 }}>
        <div>
          {/* Design phases */}
          <div style={{ ...railLabel, marginBottom: 12 }}>Design phases</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: 8 }}>
            {PHASES.map((p) => {
              const active = p.key === phaseKey
              const n = docCountByPhase[p.key] ?? 0
              return (
                <button key={p.key} onClick={() => setPhaseKey(p.key)}
                  style={{ textAlign: 'left', padding: '12px 13px', borderRadius: 12, cursor: 'pointer', border: active ? '1px solid var(--hh-anthracite)' : '1px solid var(--hh-line-card)', background: active ? 'var(--hh-anthracite)' : 'var(--hh-bone)', color: active ? 'var(--text-on-ink)' : 'var(--text-strong)' }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.14em', color: active ? 'var(--text-on-ink-faint)' : 'var(--text-faint)' }}>{p.num}</div>
                  <div style={{ fontSize: 13.5, fontWeight: active ? 600 : 500, marginTop: 3 }}>{p.label}</div>
                  <div style={{ fontSize: 10.5, marginTop: 3, color: active ? 'var(--text-on-ink-faint)' : 'var(--text-faint)' }}>{n} doc{n === 1 ? '' : 's'}</div>
                </button>
              )
            })}
          </div>
          <div style={{ fontFamily: 'var(--font-voice)', fontStyle: 'italic', fontSize: 16.5, color: 'var(--text-muted)', margin: '14px 0 0' }}>{phase.blurb}</div>

          {/* Documents in this phase */}
          <div style={{ ...railLabel, margin: '26px 0 12px' }}>{phase.label} documents</div>
          {phaseDocs.length === 0 && (phaseKey !== 'engage' || (proposals.length === 0 && invoices.length === 0)) && (
            <div style={{ fontSize: 13.5, color: 'var(--text-faint)', padding: '4px 0 8px' }}>Nothing yet — start from a template below.</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 10 }}>
            {phaseDocs.map((d, i) => (
              <div key={d.id} style={{ display: 'flex', gap: 12, alignItems: 'stretch', background: 'var(--hh-lotus)', border: '1px solid var(--hh-line-card)', borderRadius: 12, overflow: 'hidden' }}>
                <button onClick={() => nav(`/clients/${client.id}/doc/${d.id}`)} style={{ width: 64, flexShrink: 0, border: 'none', cursor: 'pointer', background: COVER_GRADS[i % COVER_GRADS.length], display: 'flex', alignItems: 'flex-end', padding: 8 }}>
                  <svg viewBox={HUE_HEAL_LOGO_VIEWBOX} style={{ width: 40, display: 'block', color: '#F4EFE2', opacity: 0.92 }} fill="none"><path fill="currentColor" d={HUE_HEAL_LOGO_PATH} /></svg>
                </button>
                <button onClick={() => nav(`/clients/${client.id}/doc/${d.id}`)} style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: '12px 0' }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title || 'Untitled'}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{d.format === 'a4' ? 'A4' : d.format === 'form' ? 'Form' : 'Deck'}{d.is_form ? ' · step-by-step' : ''}</span>
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', padding: '12px 12px' }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: d.shared ? DOC_STATUS.shared : DOC_STATUS.draft }}>{d.shared ? 'Shared' : 'Private'}</span>
                  <ConfirmButton onConfirm={async () => { await deleteClientDoc(d.id); reload() }} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 14, lineHeight: 1, cursor: 'pointer', padding: 0 }}>×</ConfirmButton>
                </div>
              </div>
            ))}
            {phaseKey === 'engage' && proposals.map((p) => (
              <button key={p.id} onClick={() => nav(`/proposals/${p.id}`)} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--hh-lotus)', border: '1px solid var(--hh-line-card)', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Proposal · {gbpCompact(p.amount_gbp)}</span>
                </span>
                <span style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{p.status}</span>
              </button>
            ))}
            {phaseKey === 'engage' && invoices.map((i) => (
              <button key={i.id} onClick={() => nav(`/invoices/${i.id}`)} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--hh-lotus)', border: '1px solid var(--hh-line-card)', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Invoice · {gbpCompact(i.amount_gbp)}</span>
                </span>
                <span style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{i.status}</span>
              </button>
            ))}
          </div>

          {/* Templates */}
          <div style={{ ...railLabel, margin: '26px 0 4px' }}>Templates</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginBottom: 12 }}>Branded starting points for {phase.label}</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 10 }}>
            {phase.templates.map((t, i) => (
              <button key={t.title} onClick={() => newFromTemplate(t)} disabled={creating !== null}
                style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--hh-lotus)', border: '1px solid var(--hh-line-card)', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', opacity: creating && creating !== t.title ? 0.6 : 1 }}>
                <span style={{ width: t.format === 'a4' ? 26 : 44, height: t.format === 'a4' ? 36 : 26, flexShrink: 0, borderRadius: 4, background: COVER_GRADS[i % COVER_GRADS.length] }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500, color: 'var(--text-strong)' }}>{creating === t.title ? 'Opening…' : t.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t.desc}</span>
                </span>
                <span style={{ fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{t.format === 'a4' ? 'A4' : t.format === 'form' ? 'Form' : '1920×1080'}</span>
              </button>
            ))}
            {phaseKey === 'engage' && (
              <>
                <button onClick={newProposal} disabled={creating !== null} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--hh-lotus)', border: '1px dashed var(--hh-line)', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ width: 44, height: 26, flexShrink: 0, borderRadius: 4, border: '1px dashed var(--hh-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>＋</span>
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-strong)' }}>Priced proposal (PDF)</span>
                </button>
                <button onClick={newInvoice} disabled={creating !== null} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--hh-lotus)', border: '1px dashed var(--hh-line)', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ width: 44, height: 26, flexShrink: 0, borderRadius: 4, border: '1px dashed var(--hh-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>＋</span>
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-strong)' }}>Invoice (PDF)</span>
                </button>
              </>
            )}
            <button onClick={() => newBlank('deck')} disabled={creating !== null} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'none', border: '1px dashed var(--hh-line)', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ width: 44, height: 26, flexShrink: 0, borderRadius: 4, border: '1px dashed var(--hh-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>＋</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500, color: 'var(--text-strong)' }}>New presentation</span>
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Blank · 1920×1080</span>
              </span>
            </button>
            <button onClick={() => newBlank('a4')} disabled={creating !== null} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'none', border: '1px dashed var(--hh-line)', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ width: 26, height: 36, flexShrink: 0, borderRadius: 4, border: '1px dashed var(--hh-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>＋</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500, color: 'var(--text-strong)' }}>New document</span>
                <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Blank · A4 portrait</span>
              </span>
            </button>
          </div>
        </div>

        {/* Right rail: engagement + activity */}
        <div>
          <div style={{ background: 'var(--hh-bone)', border: '1px solid var(--hh-line-card)', borderRadius: 14, padding: 18 }}>
            <div style={{ ...railLabel, marginBottom: 10 }}>Engagement</div>
            {[
              { k: 'Stage', v: STAGES.find((s) => s.key === client.stage)?.label ?? '—' },
              { k: 'Sector', v: client.sector || '—' },
              { k: 'Value', v: gbpCompact(client.value_gbp) },
              { k: 'Documents', v: String(docs.length + proposals.length + invoices.length) },
              { k: 'Shared to space', v: String(sharedCount) },
            ].map((f) => (
              <div key={f.k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderTop: '1px solid var(--hh-line)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-faint)' }}>{f.k}</span>
                <span style={{ color: 'var(--text-strong)', fontWeight: 500, textAlign: 'right' }}>{f.v}</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--hh-bone)', border: '1px solid var(--hh-line-card)', borderRadius: 14, padding: 18, marginTop: 14 }}>
            <div style={{ ...railLabel, marginBottom: 10 }}>Activity</div>
            {activity.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Nothing yet.</div>}
            {activity.map((a, i) => (
              <div key={i} style={{ padding: '8px 0', borderTop: '1px solid var(--hh-line)' }}>
                <div style={{ fontSize: 12.5, color: 'var(--text-strong)', lineHeight: 1.4 }}>{a.what}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{a.when}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function rel(iso: string): string {
  const d = Date.now() - Date.parse(iso)
  const mins = Math.round(d / 60000)
  if (mins < 60) return mins <= 1 ? 'Just now' : `${mins} minutes ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return hrs === 1 ? '1 hour ago' : `${hrs} hours ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return days === 1 ? 'Yesterday' : `${days} days ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

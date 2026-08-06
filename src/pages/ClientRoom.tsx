import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ConfirmButton from '../components/ConfirmButton'
import { useAuth } from '../lib/auth'
import { useIsMobile } from '../lib/useIsMobile'
import {
  type Client, type Proposal, type Invoice,
  STAGES, listClients, updateClient, listProposals, listInvoices, addProposal, addInvoice, gbpCompact,
} from '../lib/studioOps'
import { type ClientDoc, listClientDocs, addClientDoc, deleteClientDoc, spaceLink } from '../lib/clientDocs'
import { PHASES, phaseOf, blankDeck, blankA4, type Phase, type PhaseTemplate } from '../lib/phases'
import { USER } from '../data/studio'
import type { ClientStage } from '../lib/database.types'

/* ============================================================
   The client room, to the design: immersive gradient hero with
   the engagement palette, the five design phases as a progress
   timeline, cover-art document cards, branded template starting
   points, and the Engagement / Activity rail.
   ============================================================ */

const CREAM = '#F4EFE2'
const DOC_COVERS = ['linear-gradient(135deg,#2A2620,#14110E)', 'linear-gradient(135deg,#8A4A22,#2A2620)', 'linear-gradient(135deg,#4A3B2E,#1E1B18)']

/* Engagement palettes (from onboarding in the design). Until a client picks
   one, assignment is deterministic by name so a room always keeps its look. */
const PALETTES = [
  { accent: '#D8894E', hero: 'linear-gradient(120deg,#2A2620,#4A3B2E)', chips: [{ n: 'Stone', h: '#C6B7A2' }, { n: 'Teak', h: '#8A6A52' }, { n: 'Ink', h: '#2A2620' }, { n: 'Ember', h: '#D8894E' }] },
  { accent: '#F0CBA6', hero: 'linear-gradient(120deg,#3A1E12,#8A4A22)', chips: [{ n: 'Ember', h: '#D8894E' }, { n: 'Clay', h: '#B5632F' }, { n: 'Char', h: '#2A2620' }, { n: 'Bone', h: '#F4EFE2' }] },
  { accent: '#D2DC4E', hero: 'linear-gradient(120deg,#1E1B18,#3A2E25)', chips: [{ n: 'Moss', h: '#6E7A3E' }, { n: 'Mushroom', h: '#C6B7A2' }, { n: 'Anthracite', h: '#1E1B18' }, { n: 'Lime', h: '#D2DC4E' }] },
  { accent: '#C6B7A2', hero: 'linear-gradient(120deg,#4A4238,#1E1B18)', chips: [{ n: 'Bone', h: '#B7AE9A' }, { n: 'Ash', h: '#6E6456' }, { n: 'Char', h: '#2A2620' }, { n: 'Lotus', h: '#ECE6DA' }] },
]
function paletteFor(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PALETTES[h % PALETTES.length]
}

const DOT = {
  positive: 'var(--status-positive)', copper: 'var(--hh-copper)', ember: 'var(--hh-ember)',
  faint: 'var(--text-faint)', off: 'var(--hh-line-card)', warn: 'var(--hh-terracotta)',
}
const PROPOSAL_DOT: Record<string, string> = { draft: DOT.faint, sent: DOT.ember, viewed: DOT.copper, accepted: DOT.positive, declined: DOT.warn }
const INVOICE_DOT: Record<string, string> = { draft: DOT.faint, sent: DOT.ember, paid: DOT.positive, overdue: DOT.warn }

const eyebrow: React.CSSProperties = { fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-faint)' }

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

  /* Phase progress: the furthest phase with documents is in progress,
     everything before it is complete, everything after upcoming. */
  const currentIdx = useMemo(() => {
    let idx = 0
    PHASES.forEach((p, i) => { if ((docCountByPhase[p.key] ?? 0) > 0) idx = i })
    return idx
  }, [docCountByPhase])

  async function setStage(stage: ClientStage) {
    if (!client) return
    await updateClient(client.id, { stage })
    setClient({ ...client, stage })
  }

  async function shareSpace() {
    const token = (client as (Client & { share_token?: string }) | null)?.share_token
    if (!token) { setStatus('The space link appears once this client is synced.'); return }
    try {
      await navigator.clipboard.writeText(spaceLink(token))
      setStatus('Private space link copied.')
    } catch { setStatus(spaceLink(token)) }
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

  if (gated) return <p style={{ padding: isMobile ? '18px 16px' : '28px 40px', fontSize: 14, color: 'var(--text-muted)' }}>Sign in to open this client.</p>
  if (!client) return <p style={{ padding: isMobile ? '18px 16px' : '28px 40px', fontSize: 14, color: 'var(--text-faint)' }}>Loading client…</p>

  const pal = paletteFor(client.name)
  const sharedCount = docs.filter((d) => d.shared).length + proposals.filter((p) => p.shared).length + invoices.filter((i) => i.shared).length
  const totalDocs = docs.length + proposals.length + invoices.length
  const stageLabel = STAGES.find((s) => s.key === client.stage)?.label ?? '—'

  const heroStats = [
    { num: gbpCompact(client.value_gbp), label: 'Value' },
    { num: String(totalDocs), label: 'Documents' },
    { num: String(sharedCount), label: 'Shared' },
  ]
  const facts = [
    { k: 'Owner', v: USER.name },
    { k: 'Started', v: client.created_at ? new Date(client.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
    { k: 'Sector', v: client.sector || '—' },
    { k: 'Fee', v: gbpCompact(client.value_gbp) },
    { k: 'Shared to space', v: String(sharedCount) },
  ]

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14, padding: isMobile ? '12px 16px' : '14px 28px', borderBottom: '1px solid var(--hh-line)', background: 'rgba(236,230,218,0.72)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 6 }}>
        <button onClick={() => nav('/clients')} className="hh-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, flexShrink: 0, borderRadius: '50%', border: '1px solid var(--hh-line-card)', background: 'var(--hh-bone)', fontSize: 14, cursor: 'pointer', color: 'var(--text-strong)' }}>‹</button>
        {!isMobile && <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Clients</span>}
        {!isMobile && <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>/</span>}
        <span style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.name}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={shareSpace} className="hh-btn" style={{ background: 'var(--hh-bone)', border: '1px solid var(--hh-line-card)', borderRadius: 999, padding: '8px 16px', fontSize: 12.5, cursor: 'pointer', color: 'var(--text-strong)' }}>Share</button>
          <button onClick={() => newBlank('deck')} className="hh-btn" style={{ background: 'var(--hh-copper)', color: '#F6EFE4', border: 'none', borderRadius: 999, padding: '9px 18px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>＋ New document</button>
        </div>
      </div>

      {/* Immersive hero */}
      <div style={{ position: 'relative', background: pal.hero, color: CREAM, padding: isMobile ? '30px 20px 26px' : '44px 40px 36px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, rgba(16,15,13,0.86), rgba(16,15,13,0.42))' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ minWidth: isMobile ? 0 : 280, flex: 1 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: pal.accent }}>{[client.sector, stageLabel].filter(Boolean).join(' · ')}</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: isMobile ? 38 : 60, lineHeight: 0.98, margin: '14px 0 0', letterSpacing: '-0.01em' }}>{client.name}</div>
            <p style={{ fontSize: 14.5, lineHeight: 1.7, color: 'rgba(244,239,226,0.72)', maxWidth: '52ch', margin: '16px 0 0', textWrap: 'pretty' }}>
              {client.note || 'Engagement brief not written yet. Add the scope, the spaces in play, and what success looks like.'}
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
              {pal.chips.map((c) => (
                <span key={c.n} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(244,239,226,0.1)', border: '1px solid rgba(244,239,226,0.22)', borderRadius: 999, padding: '7px 13px', fontSize: 11, letterSpacing: '0.04em' }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: c.h }} />{c.n}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(96px, 1fr))', gap: 26 }}>
            {heroStats.map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: isMobile ? 32 : 40, lineHeight: 1, color: pal.accent }}>{s.num}</div>
                <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(244,239,226,0.55)', marginTop: 8 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phase timeline */}
      <div style={{ padding: isMobile ? '22px 16px 6px' : '26px 40px 6px' }}>
        <div style={{ ...eyebrow, marginBottom: 14 }}>Design phases</div>
        <div style={isMobile
          ? { display: 'flex', gap: 10, overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '0 -16px', padding: '0 16px 6px' }
          : { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {PHASES.map((p, i) => {
            const active = p.key === phaseKey
            const state = i < currentIdx ? 'Complete' : i === currentIdx ? 'In progress' : 'Upcoming'
            const n = docCountByPhase[p.key] ?? 0
            const pct = state === 'Complete' ? 100 : state === 'Upcoming' ? 0 : Math.min(88, 24 + n * 16)
            const dot = state === 'Complete' ? DOT.positive : pct === 0 ? DOT.off : DOT.copper
            const metaFg = active ? 'var(--text-on-ink-faint)' : 'var(--text-faint)'
            return (
              <button key={p.key} onClick={() => setPhaseKey(p.key)} className="hh-card-hover"
                style={{ textAlign: 'left', cursor: 'pointer', minWidth: isMobile ? 150 : 0, flexShrink: 0, background: active ? 'var(--hh-anthracite)' : 'var(--hh-bone)', border: `1px solid ${active ? 'var(--hh-anthracite)' : 'var(--hh-line-card)'}`, borderRadius: 13, padding: '14px 15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
                  <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: metaFg }}>{p.num}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: active ? 600 : 500, color: active ? 'var(--text-on-ink)' : 'var(--text-strong)', marginTop: 10 }}>{p.label}</div>
                <div style={{ fontSize: 11, color: metaFg, marginTop: 4 }}>{state}</div>
                <div style={{ height: 3, borderRadius: 2, background: active ? 'rgba(244,240,231,0.18)' : 'var(--hh-line)', marginTop: 12, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: dot }} />
                </div>
              </button>
            )
          })}
        </div>
        {status && <p style={{ fontSize: 12.5, color: 'var(--hh-terracotta)', margin: '12px 0 0' }}>{status}</p>}
      </div>

      {/* Phase body */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 300px', gap: 22, padding: isMobile ? '22px 16px 40px' : '26px 40px 48px', alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: 26, lineHeight: 1 }}>{phase.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{phase.blurb}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(232px, 1fr))', gap: 14 }}>
            {phaseDocs.map((d, i) => (
              <DocCard key={d.id}
                onOpen={() => nav(`/clients/${client.id}/doc/${d.id}`)}
                cover={DOC_COVERS[i % DOC_COVERS.length]}
                coverTitle={/contract|agreement/.test(d.kind ?? '') ? 'Agreement' : phase.label}
                tag={d.format === 'a4' ? 'A4' : d.format === 'form' ? 'Form' : 'Deck'}
                title={d.title || 'Untitled'}
                statusLabel={d.shared ? 'Shared' : 'Draft'}
                dot={d.shared ? DOT.positive : DOT.faint}
                meta={`${d.format === 'a4' ? 'A4' : d.format === 'form' ? 'Form' : 'Deck'}${Array.isArray(d.blocks) && d.blocks.length ? ` · ${d.blocks.length}pp` : ''}`}
                justify={i % 2 === 0 ? 'flex-end' : 'center'}
                onDelete={async () => { await deleteClientDoc(d.id); reload() }}
              />
            ))}
            {phaseKey === 'engage' && proposals.map((p, i) => (
              <DocCard key={p.id}
                onOpen={() => nav(`/proposals/${p.id}`)}
                cover={DOC_COVERS[(phaseDocs.length + i) % DOC_COVERS.length]}
                coverTitle="Proposal" tag="Proposal"
                title={p.title}
                statusLabel={cap(p.status)} dot={PROPOSAL_DOT[p.status] ?? DOT.faint}
                meta={gbpCompact(p.amount_gbp)}
                justify={(phaseDocs.length + i) % 2 === 0 ? 'flex-end' : 'center'}
              />
            ))}
            {phaseKey === 'engage' && invoices.map((inv, i) => (
              <DocCard key={inv.id}
                onOpen={() => nav(`/invoices/${inv.id}`)}
                cover={DOC_COVERS[(phaseDocs.length + proposals.length + i) % DOC_COVERS.length]}
                coverTitle="Invoice" tag="Invoice"
                title={inv.title}
                statusLabel={cap(inv.status)} dot={INVOICE_DOT[inv.status] ?? DOT.faint}
                meta={gbpCompact(inv.amount_gbp)}
                justify={(phaseDocs.length + proposals.length + i) % 2 === 0 ? 'flex-end' : 'center'}
              />
            ))}
            <button onClick={() => newBlank('deck')} disabled={creating !== null} className="hh-btn"
              style={{ cursor: 'pointer', background: 'none', border: '1px dashed var(--hh-line-card)', borderRadius: 14, minHeight: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-faint)' }}>
              <span style={{ fontSize: 22 }}>＋</span>
              <span style={{ fontSize: 12.5 }}>New {phase.docWord}</span>
            </button>
          </div>

          {/* Templates */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '34px 0 14px', flexWrap: 'wrap' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: 22, lineHeight: 1 }}>Templates</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Branded starting points for {phase.label}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
            {phase.templates.map((t, i) => (
              <button key={t.title} onClick={() => newFromTemplate(t)} disabled={creating !== null} className="hh-card-hover"
                style={{ cursor: 'pointer', background: 'var(--hh-bone)', border: '1px solid var(--hh-line-card)', borderRadius: 13, padding: 13, display: 'flex', gap: 12, textAlign: 'left', opacity: creating && creating !== t.title ? 0.6 : 1 }}>
                <span style={{ width: t.format === 'a4' ? 26 : 44, height: t.format === 'a4' ? 36 : 26, borderRadius: 4, background: DOC_COVERS[i % DOC_COVERS.length], flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 3, padding: 6 }}>
                  <span style={{ width: '76%', height: 3, borderRadius: 2, background: 'rgba(244,239,226,0.85)' }} />
                  <span style={{ width: '46%', height: 3, borderRadius: 2, background: 'rgba(244,239,226,0.45)' }} />
                </span>
                <span style={{ minWidth: 0, lineHeight: 1.4 }}>
                  <span style={{ display: 'block', fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--hh-copper)' }}>{t.format === 'a4' ? 'A4 · portrait' : t.format === 'form' ? 'Form · step-by-step' : '1920×1080 · deck'}</span>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginTop: 4, color: 'var(--text-strong)', textWrap: 'pretty' }}>{creating === t.title ? 'Opening…' : t.title}</span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--text-faint)', marginTop: 3, textWrap: 'pretty' }}>{t.desc}</span>
                </span>
              </button>
            ))}
            {phaseKey === 'engage' && (
              <>
                <BlankCard onClick={newProposal} disabled={creating !== null} thumbW={44} thumbH={26} eyebrowText="Priced · PDF" title="New proposal" />
                <BlankCard onClick={newInvoice} disabled={creating !== null} thumbW={44} thumbH={26} eyebrowText="Priced · PDF" title="New invoice" />
              </>
            )}
            <BlankCard onClick={() => newBlank('deck')} disabled={creating !== null} thumbW={44} thumbH={26} eyebrowText="Blank · 1920×1080" title="New presentation" />
            <BlankCard onClick={() => newBlank('a4')} disabled={creating !== null} thumbW={26} thumbH={36} eyebrowText="Blank · A4 portrait" title="New document" />
          </div>
        </div>

        {/* Client rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--hh-bone)', border: '1px solid var(--hh-line-card)', borderRadius: 14, padding: 16 }}>
            <div style={{ ...eyebrow, letterSpacing: '0.16em', marginBottom: 12 }}>Engagement</div>
            {facts.map((f) => (
              <div key={f.k} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '8px 0', borderTop: '1px solid var(--hh-line)' }}>
                <span style={{ fontSize: 11.5, color: 'var(--text-faint)', width: 82, flexShrink: 0 }}>{f.k}</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-body)', textAlign: 'right', flex: 1 }}>{f.v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 12, borderTop: '1px solid var(--hh-line)', marginTop: 4 }}>
              {STAGES.map((st) => {
                const active = st.key === client.stage
                return (
                  <button key={st.key} className="hh-btn" onClick={() => setStage(st.key)}
                    style={{ borderRadius: 999, padding: '6px 11px', fontSize: 11, fontWeight: 500, cursor: 'pointer', border: `1px solid ${active ? 'var(--hh-anthracite)' : 'var(--hh-line-card)'}`, background: active ? 'var(--hh-anthracite)' : 'transparent', color: active ? 'var(--text-on-ink)' : 'var(--text-faint)' }}>
                    {st.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ background: 'var(--hh-bone)', border: '1px solid var(--hh-line-card)', borderRadius: 14, padding: 16 }}>
            <div style={{ ...eyebrow, letterSpacing: '0.16em', marginBottom: 12 }}>Activity</div>
            {activity.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Nothing yet.</div>}
            {activity.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 11, padding: '9px 0', borderTop: '1px solid var(--hh-line)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--hh-copper)', marginTop: 6, flexShrink: 0 }} />
                <div style={{ lineHeight: 1.45, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5 }}>{a.what}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{a.when}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* Cover-art document card, to the design. */
function DocCard({ onOpen, cover, coverTitle, tag, title, statusLabel, dot, meta, justify, onDelete }: {
  onOpen: () => void
  cover: string
  coverTitle: string
  tag: string
  title: string
  statusLabel: string
  dot: string
  meta: string
  justify: 'flex-end' | 'center'
  onDelete?: () => Promise<void>
}) {
  return (
    <div className="hh-card-hover" style={{ background: 'var(--hh-bone)', border: '1px solid var(--hh-line-card)', borderRadius: 14, overflow: 'hidden' }}>
      <button onClick={onOpen} style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', padding: 0, cursor: 'pointer', background: 'none' }}>
        <div style={{ height: 116, background: cover, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: justify, padding: 14 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: 19, lineHeight: 1.1, color: CREAM, maxWidth: '88%' }}>{coverTitle}</div>
          <div style={{ position: 'absolute', top: 12, right: 14, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(244,239,226,0.6)' }}>{tag}</div>
        </div>
        <div style={{ padding: '13px 14px 0' }}>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-strong)', textWrap: 'pretty' }}>{title}</div>
        </div>
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 13px' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
        <span style={{ fontSize: 11.5, color: 'var(--text-body)' }}>{statusLabel}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-faint)' }}>{meta}</span>
        {onDelete && (
          <ConfirmButton onConfirm={onDelete} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 14, lineHeight: 1, cursor: 'pointer', padding: '0 0 0 4px' }}>×</ConfirmButton>
        )}
      </div>
    </div>
  )
}

/* Dashed "start blank" template card. */
function BlankCard({ onClick, disabled, thumbW, thumbH, eyebrowText, title }: {
  onClick: () => void
  disabled: boolean
  thumbW: number
  thumbH: number
  eyebrowText: string
  title: string
}) {
  return (
    <button onClick={onClick} disabled={disabled} className="hh-btn"
      style={{ cursor: 'pointer', background: 'none', border: '1px dashed var(--hh-line-card)', borderRadius: 13, padding: 13, display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)', textAlign: 'left' }}>
      <span style={{ width: thumbW, height: thumbH, borderRadius: 4, border: '1px dashed var(--hh-line-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>＋</span>
      <span style={{ lineHeight: 1.4, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>{eyebrowText}</span>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginTop: 4, color: 'var(--text-strong)' }}>{title}</span>
      </span>
    </button>
  )
}

function cap(s: string): string { return s ? s[0].toUpperCase() + s.slice(1) : s }

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

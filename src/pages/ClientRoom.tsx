import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ConfirmButton from '../components/ConfirmButton'
import { useAuth } from '../lib/auth'
import { useIsMobile } from '../lib/useIsMobile'
import {
  type Client, type Proposal, type Invoice,
  STAGES, listClients, updateClient, listProposals, listInvoices, addProposal, addInvoice, gbpCompact, statusTone,
} from '../lib/studioOps'
import { type ClientDoc, DOC_KINDS, docKind, listClientDocs, addClientDoc, deleteClientDoc } from '../lib/clientDocs'
import { deckTemplate } from '../lib/decks'
import type { ClientStage } from '../lib/database.types'

/* The client room: one place for a client's pipeline stage and every document
   in the relationship — design docs, forms, proposals and invoices. */

const rail: React.CSSProperties = { fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)', margin: '26px 0 12px' }
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', borderTop: '1px solid var(--hh-line)' }

const STATUS_TONE: Record<string, string> = { draft: 'var(--status-neutral)', shared: 'var(--status-positive)' }

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
  const [picking, setPicking] = useState(false)
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

  const stageIdx = useMemo(() => STAGES.findIndex((s) => s.key === client?.stage), [client?.stage])

  async function setStage(stage: ClientStage) {
    if (!client) return
    await updateClient(client.id, { stage })
    setClient({ ...client, stage })
  }

  async function newDoc(kindKey: string) {
    if (!client || creating) return
    setCreating(kindKey)
    try {
      const k = docKind(kindKey)
      const doc = await addClientDoc({
        client_id: client.id, kind: k.key, title: `${k.label} · ${client.name}`, is_form: !!k.form,
        // Deck kinds arrive with their inbuilt structure ready to fill.
        blocks: k.deck ? (deckTemplate(k.key, client.name) as unknown[]) : [],
      })
      nav(`/clients/${client.id}/doc/${doc.id}`)
    } catch (e) { setStatus(`Couldn’t create: ${e instanceof Error ? e.message : e}`); setCreating(null) }
  }
  async function newProposal() {
    if (!client || creating) return
    setCreating('proposal')
    try {
      const p = await addProposal({ client_id: client.id, client_name: client.name, title: `${client.name} · Proposal` })
      nav(`/proposals/${p.id}`)
    } catch (e) { setStatus(`Couldn’t create: ${e instanceof Error ? e.message : e}`); setCreating(null) }
  }
  async function newInvoice() {
    if (!client || creating) return
    setCreating('invoice')
    try {
      const i = await addInvoice({ client_id: client.id, client_name: client.name, title: `${client.name} · Invoice` })
      nav(`/invoices/${i.id}`)
    } catch (e) { setStatus(`Couldn’t create: ${e instanceof Error ? e.message : e}`); setCreating(null) }
  }

  const initials = (client?.name ?? '·').split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  const pad = isMobile ? '18px 16px' : '28px 40px'

  if (gated) return <p style={{ padding: pad, fontSize: 14, color: 'var(--text-muted)' }}>Sign in to open this client.</p>
  if (!client) return <p style={{ padding: pad, fontSize: 14, color: 'var(--text-faint)' }}>Loading client…</p>

  return (
    <div>
      {/* Header */}
      <div style={{ padding: isMobile ? '18px 16px' : '30px 40px', borderBottom: '1px solid var(--hh-line)' }}>
        <button onClick={() => nav('/clients')} className="hh-btn" style={{ background: 'none', border: 'none', color: 'var(--hh-copper)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 14 }}>‹ Client pipeline</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: isMobile ? 44 : 54, height: isMobile ? 44 : 54, flexShrink: 0, borderRadius: '50%', background: 'var(--hh-mushroom)', color: '#2A211A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 15 : 18, fontWeight: 600 }}>{initials}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="hh-serif" style={{ fontWeight: 400, fontSize: isMobile ? 26 : 36, letterSpacing: '-0.01em', margin: 0, lineHeight: 1.1 }}>{client.name}</h1>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
              {[client.sector, gbpCompact(client.value_gbp)].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>
        {/* Stage stepper */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 18 }}>
          {STAGES.map((s, i) => {
            const active = s.key === client.stage
            const passed = i < stageIdx
            return (
              <button key={s.key} className="hh-btn" onClick={() => setStage(s.key)}
                style={{ borderRadius: 999, padding: '8px 15px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  border: active ? '1px solid var(--hh-anthracite)' : '1px solid var(--hh-line)',
                  background: active ? 'var(--hh-anthracite)' : 'transparent',
                  color: active ? 'var(--text-on-ink)' : passed ? 'var(--text-body)' : 'var(--text-faint)' }}>
                {passed ? '✓ ' : ''}{s.label}
              </button>
            )
          })}
        </div>
        {client.note && <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: '14px 0 0', maxWidth: '60ch', lineHeight: 1.6 }}>{client.note}</p>}
        {status && <p style={{ fontSize: 12.5, color: 'var(--hh-terracotta)', margin: '10px 0 0' }}>{status}</p>}
      </div>

      <div style={{ padding: pad, maxWidth: 860 }}>
        {/* Documents */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ ...rail, margin: 0, flex: 1 }}>Documents · {docs.length}</div>
          <button className="hh-btn" onClick={() => setPicking((v) => !v)}
            style={{ background: picking ? 'var(--hh-anthracite)' : 'var(--hh-copper)', color: picking ? 'var(--text-on-ink)' : 'var(--hh-on-accent, #F6EFE4)', border: 'none', borderRadius: 999, padding: '9px 18px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>
            {picking ? 'Close' : '＋ New document'}
          </button>
        </div>

        {picking && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 10, marginTop: 14 }}>
            {DOC_KINDS.map((k) => (
              <button key={k.key} onClick={() => newDoc(k.key)} disabled={creating !== null}
                style={{ textAlign: 'left', display: 'flex', gap: 12, alignItems: 'center', padding: '14px 16px', background: 'var(--hh-lotus)', border: '1px solid var(--hh-line-card)', borderRadius: 14, cursor: 'pointer', opacity: creating && creating !== k.key ? 0.6 : 1 }}>
                <span style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10, background: 'var(--hh-bone)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, color: 'var(--text-accent)' }}>{k.icon}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16.5, color: 'var(--text-strong)' }}>{creating === k.key ? 'Opening…' : k.label}</span>
                    {k.form && <span style={{ fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-accent)', border: '1px solid var(--hh-copper)', borderRadius: 999, padding: '2px 7px' }}>Form</span>}
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{k.blurb}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: 8 }}>
          {docs.length === 0 && !picking && (
            <div style={{ fontSize: 13.5, color: 'var(--text-faint)', padding: '12px 0' }}>No documents yet — create the first one for {client.name}.</div>
          )}
          {docs.map((d) => {
            const k = docKind(d.kind)
            return (
              <div key={d.id} style={rowStyle}>
                <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 9, background: 'var(--hh-bone)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: 'var(--text-accent)' }}>{k.icon}</span>
                <button onClick={() => nav(`/clients/${client.id}/doc/${d.id}`)} style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title || k.label}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{k.label}{d.is_form ? ' · form' : ''}</span>
                </button>
                <span style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: d.shared ? STATUS_TONE.shared : STATUS_TONE.draft }}>
                  {d.shared ? 'Shared' : 'Private'}
                </span>
                <ConfirmButton onConfirm={async () => { await deleteClientDoc(d.id); reload() }} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 15, lineHeight: 1, cursor: 'pointer' }}>×</ConfirmButton>
              </div>
            )
          })}
        </div>

        {/* Proposals */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ ...rail, flex: 1 }}>Proposals · {proposals.length}</div>
          <button className="hh-btn" onClick={newProposal} style={{ background: 'none', border: '1px solid var(--hh-line)', borderRadius: 999, padding: '7px 14px', fontSize: 12, color: 'var(--text-body)', cursor: 'pointer' }}>＋ New</button>
        </div>
        {proposals.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-faint)', padding: '6px 0' }}>None yet.</div>}
        {proposals.map((p) => (
          <div key={p.id} style={rowStyle}>
            <button onClick={() => nav(`/proposals/${p.id}`)} style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
              <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{gbpCompact(p.amount_gbp)}</span>
            </button>
            <span style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: `var(--status-${statusTone(p.status) === 'accent' ? 'warning' : statusTone(p.status) === 'positive' ? 'positive' : 'neutral'})` }}>{p.status}</span>
          </div>
        ))}

        {/* Invoices */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ ...rail, flex: 1 }}>Invoices · {invoices.length}</div>
          <button className="hh-btn" onClick={newInvoice} style={{ background: 'none', border: '1px solid var(--hh-line)', borderRadius: 999, padding: '7px 14px', fontSize: 12, color: 'var(--text-body)', cursor: 'pointer' }}>＋ New</button>
        </div>
        {invoices.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-faint)', padding: '6px 0' }}>None yet.</div>}
        {invoices.map((i) => (
          <div key={i.id} style={rowStyle}>
            <button onClick={() => nav(`/invoices/${i.id}`)} style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.title}</span>
              <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{gbpCompact(i.amount_gbp)}{i.due_date ? ` · due ${i.due_date}` : ''}</span>
            </button>
            <span style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: `var(--status-${statusTone(i.status) === 'accent' ? 'warning' : statusTone(i.status) === 'positive' ? 'positive' : 'neutral'})` }}>{i.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

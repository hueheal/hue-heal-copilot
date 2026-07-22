import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ConfirmButton from '../components/ConfirmButton'
import { useAuth } from '../lib/auth'
import {
  type Proposal,
  type Invoice,
  PROPOSAL_STATUSES,
  INVOICE_STATUSES,
  listProposals,
  listInvoices,
  addProposal,
  addInvoice,
  updateProposal,
  updateInvoice,
  deleteProposal,
  deleteInvoice,
  seedSampleData,
  gbpFull,
  statusTone,
} from '../lib/studioOps'
import type { ProposalStatus, InvoiceStatus } from '../lib/database.types'

function toneColor(t: ReturnType<typeof statusTone>) {
  return t === 'warning' || t === 'accent' ? 'var(--hh-copper)' : t === 'positive' ? 'var(--status-positive)' : 'var(--text-muted)'
}
function fmtDate(d: string | null): string {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''
}

interface Row {
  id: string
  client: string
  title: string
  amount: number
  status: string
  date: string
}

function StatusSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
      style={{ fontSize: 11, color: toneColor(statusTone(value as ProposalStatus | InvoiceStatus)), background: 'transparent', border: '1px solid var(--hh-line)', borderRadius: 6, padding: '3px 6px', fontFamily: 'var(--font-sans)', textTransform: 'capitalize' }}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function Table({
  title, rows, kind, statuses, onStatus, onOpen, onNew, onDelete,
}: {
  title: string
  rows: Row[]
  kind: string
  statuses: string[]
  onStatus: (id: string, status: string) => void
  onOpen: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}) {
  return (
    <div style={{ background: 'var(--hh-bone)', border: '1px solid var(--hh-line-card)', borderRadius: 16, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="hh-serif" style={{ fontSize: 22 }}>{title}</div>
        <button onClick={onNew} className="hh-btn" style={{ fontSize: 12, background: 'none', border: 'none', color: 'var(--hh-copper)', borderBottom: '1px solid var(--hh-copper)', paddingBottom: 2 }}>
          New {kind} ⟶
        </button>
      </div>
      {rows.map((r) => (
        <div
          key={r.id}
          onClick={() => onOpen(r.id)}
          className="hh-btn"
          style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '15px 4px', borderTop: '1px solid var(--hh-line)', cursor: 'pointer' }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{r.client}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{r.title}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <StatusSelect value={r.status} options={statuses} onChange={(v) => onStatus(r.id, v)} />
            {r.date && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{r.date}</div>}
          </div>
          <div className="hh-serif" style={{ fontSize: 20, color: 'var(--hh-copper)', minWidth: 96, textAlign: 'right' }}>{gbpFull(r.amount)}</div>
          <ConfirmButton
            onConfirm={() => onDelete(r.id)}
            title={`Delete ${kind}`}
            style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 16, lineHeight: 1 }}
          >
            ×
          </ConfirmButton>
        </div>
      ))}
      {rows.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-faint)', margin: '12px 0 0' }}>None yet — hit “New {kind}”.</p>}
    </div>
  )
}

export default function Proposals() {
  const auth = useAuth()
  const nav = useNavigate()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [err, setErr] = useState<string | null>(null)
  const gated = auth.mode === 'connected' && !auth.session
  const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

  async function load() {
    if (gated) { setProposals([]); setInvoices([]); return }
    try { await seedSampleData() } catch { /* not signed in / race */ }
    setProposals(await listProposals())
    setInvoices(await listInvoices())
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.session, auth.mode])

  const proposalRows: Row[] = proposals.map((p) => ({
    id: p.id, client: p.client_name || '—', title: p.title, amount: p.amount_gbp,
    status: p.status, date: p.sent_at ? `Sent · ${fmtDate(p.sent_at)}` : fmtDate(p.created_at),
  }))
  const invoiceRows: Row[] = invoices.map((i) => ({
    id: i.id, client: i.client_name || '—', title: i.title, amount: i.amount_gbp,
    status: i.status,
    date: i.status === 'overdue' && i.due_date ? `Due · ${fmtDate(i.due_date)}` : fmtDate(i.issued_at ?? i.created_at),
  }))

  return (
    <>
      <PageHeader
        eyebrow="Revenue"
        title="Proposals & Invoices"
        subtitle="Draft a proposal with AI in your brand voice, then send it as a branded PDF. Turn it into an invoice in one click."
      />
      <div style={{ padding: '30px 40px' }}>
        {err && (
          <div style={{ background: '#F6E7DD', border: '1px solid var(--hh-copper)', color: 'var(--hh-terracotta)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13.5 }}>{err}</div>
        )}
        {gated ? (
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Sign in on the <strong>Social Copilot</strong> page to load your proposals and invoices.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Table
              title="Proposals" rows={proposalRows} kind="proposal" statuses={PROPOSAL_STATUSES}
              onOpen={(id) => nav(`/proposals/${id}`)}
              onStatus={async (id, status) => {
                try {
                  const patch: { status: ProposalStatus; sent_at?: string } = { status: status as ProposalStatus }
                  if (status === 'sent') patch.sent_at = new Date().toISOString()
                  await updateProposal(id, patch); setErr(null); setProposals(await listProposals())
                } catch (e) { setErr(`Couldn’t update proposal: ${msg(e)}`) }
              }}
              onNew={async () => {
                try {
                  const p = await addProposal({ client_name: 'New client', title: 'Untitled proposal', status: 'draft' })
                  nav(`/proposals/${p.id}`)
                } catch (e) { setErr(`Couldn’t create proposal: ${msg(e)}`) }
              }}
              onDelete={async (id) => {
                try { await deleteProposal(id); setErr(null); setProposals(await listProposals()) }
                catch (e) { setErr(`Couldn’t delete proposal: ${msg(e)}`) }
              }}
            />
            <Table
              title="Invoices" rows={invoiceRows} kind="invoice" statuses={INVOICE_STATUSES}
              onOpen={(id) => nav(`/invoices/${id}`)}
              onStatus={async (id, status) => {
                try {
                  await updateInvoice(id, { status: status as InvoiceStatus }); setErr(null); setInvoices(await listInvoices())
                } catch (e) { setErr(`Couldn’t update invoice: ${msg(e)}`) }
              }}
              onNew={async () => {
                try {
                  const i = await addInvoice({ client_name: 'New client', title: 'Untitled invoice', status: 'draft', issued_at: new Date().toISOString().slice(0, 10) })
                  nav(`/invoices/${i.id}`)
                } catch (e) { setErr(`Couldn’t create invoice: ${msg(e)}`) }
              }}
              onDelete={async (id) => {
                try { await deleteInvoice(id); setErr(null); setInvoices(await listInvoices()) }
                catch (e) { setErr(`Couldn’t delete invoice: ${msg(e)}`) }
              }}
            />
          </div>
        )}
      </div>
    </>
  )
}

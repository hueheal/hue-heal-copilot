import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PillButton } from '../components/PageHeader'
import ConfirmButton from '../components/ConfirmButton'
import InvoiceDocument from '../components/InvoiceDocument'
import { type Invoice, getInvoice, updateInvoice, deleteInvoice, INVOICE_STATUSES } from '../lib/studioOps'
import { slugify } from '../lib/pdf'
import type { LineItem, InvoiceStatus } from '../lib/database.types'

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 8,
  padding: '10px 12px', fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--text-strong)',
}
const labelStyle: React.CSSProperties = { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 6, display: 'block' }

export default function InvoiceEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const [inv, setInv] = useState<Invoice | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (id) getInvoice(id).then(setInv).catch(() => setStatus('Could not load invoice'))
  }, [id])

  if (!inv) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>{status ?? 'Loading invoice…'}</div>

  const set = (patch: Partial<Invoice>) => setInv({ ...inv, ...patch } as Invoice)
  const items: LineItem[] = inv.line_items.length ? inv.line_items : [{ description: inv.title, amount: inv.amount_gbp }]
  const setItem = (i: number, patch: Partial<LineItem>) => set({ line_items: items.map((li, j) => (j === i ? { ...li, ...patch } : li)) })
  const addItem = () => set({ line_items: [...items, { description: '', amount: 0 }] })
  const removeItem = (i: number) => set({ line_items: items.filter((_, j) => j !== i) })
  const total = items.reduce((s, li) => s + (Number(li.amount) || 0), 0)

  async function downloadPdf() {
    setBusy(true); setStatus('Preparing PDF…')
    try {
      const { downloadInvoicePdf } = await import('../lib/pdfDoc')
      await downloadInvoicePdf(inv!, `${slugify(inv!.client_name)}-invoice.pdf`)
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
      await updateInvoice(inv!.id, {
        client_name: inv!.client_name, title: inv!.title, status: inv!.status, due_date: inv!.due_date,
        issued_at: inv!.issued_at, line_items: items, notes: inv!.notes, amount_gbp: total,
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
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 40px', borderBottom: '1px solid var(--hh-line)' }}>
        <button onClick={() => nav('/proposals')} className="hh-btn" style={{ background: 'none', border: 'none', color: 'var(--hh-copper)', fontSize: 13 }}>⟵ Proposals &amp; Invoices</button>
        <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>{inv.client_name} · {inv.status}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {status && <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{status}</span>}
          <ConfirmButton
            onConfirm={async () => { await deleteInvoice(inv!.id); nav('/proposals') }}
            confirmLabel="Delete invoice?"
            style={{ background: 'none', border: '1px solid var(--hh-line)', borderRadius: 999, padding: '11px 18px', fontSize: 13, color: 'var(--text-muted)' }}
          >
            Delete
          </ConfirmButton>
          <PillButton tone="ghost" onClick={save}>{busy ? 'Working…' : 'Save'}</PillButton>
          <PillButton tone="ink" onClick={downloadPdf}>↧ Download PDF</PillButton>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 28, padding: '28px 40px', alignItems: 'start' }}>
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={labelStyle}>Client</label>
            <input style={inputStyle} value={inv.client_name} onChange={(e) => set({ client_name: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Title / reference</label>
            <input style={inputStyle} value={inv.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Issued</label>
              <input type="date" style={inputStyle} value={inv.issued_at ?? ''} onChange={(e) => set({ issued_at: e.target.value || null })} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Due</label>
              <input type="date" style={inputStyle} value={inv.due_date ?? ''} onChange={(e) => set({ due_date: e.target.value || null })} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={inv.status} onChange={(e) => set({ status: e.target.value as InvoiceStatus })}>
              {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Line items · total £{total.toLocaleString('en-GB')}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((li, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inputStyle, flex: 1 }} placeholder="Description" value={li.description} onChange={(e) => setItem(i, { description: e.target.value })} />
                  <input style={{ ...inputStyle, width: 96 }} placeholder="£" value={li.amount || ''} onChange={(e) => setItem(i, { amount: parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0 })} />
                  <button onClick={() => removeItem(i)} className="hh-btn" style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 16 }}>×</button>
                </div>
              ))}
              <button onClick={addItem} className="hh-btn" style={{ background: 'none', border: '1px dashed var(--hh-line)', borderRadius: 10, padding: '9px', color: 'var(--text-muted)', fontSize: 13 }}>＋ Add line item</button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Notes / payment terms</label>
            <textarea style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} rows={3} value={inv.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="e.g. Payment within 14 days. BACS: Hue & Heal Ltd · 00-00-00 · 12345678" />
          </div>
        </div>

        <InvoiceDocument invoice={inv} />
      </div>
    </div>
  )
}

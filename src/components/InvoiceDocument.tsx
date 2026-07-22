import type { Invoice } from '../lib/studioOps'
import { gbpFull } from '../lib/studioOps'
import Logo from './Logo'

function lineTotal(inv: Invoice): number {
  const sum = inv.line_items.reduce((s, li) => s + (Number(li.amount) || 0), 0)
  return sum || inv.amount_gbp
}
function fmt(d: string | null): string {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
}

/* Branded A4 invoice document. Carries `.print-doc` for Download PDF. */
export default function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const total = lineTotal(invoice)
  const number = `HH-${invoice.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`
  const items = invoice.line_items.length > 0 ? invoice.line_items : [{ description: invoice.title, amount: invoice.amount_gbp }]

  return (
    <article
      className="print-doc"
      style={{
        width: 794, maxWidth: '100%', margin: '0 auto', background: '#FFFFFF', color: 'var(--hh-anthracite)',
        border: '1px solid var(--hh-line-card)', borderRadius: 12, boxShadow: 'var(--shadow-card)',
        padding: '56px 64px', fontFamily: 'var(--font-sans)',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '1px solid var(--hh-line)', paddingBottom: 22 }}>
        <Logo height={22} style={{ color: 'var(--hh-anthracite)' }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--hh-copper)' }}>Invoice</div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>{number}</div>
        </div>
      </header>

      {/* Meta grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, margin: '30px 0 26px' }}>
        <div>
          <Label>Billed to</Label>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 6 }}>{invoice.client_name || '—'}</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 2 }}>{invoice.title}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24 }}>
            <div><Label>Issued</Label><div style={{ fontSize: 13.5, marginTop: 6 }}>{fmt(invoice.issued_at)}</div></div>
            <div><Label>Due</Label><div style={{ fontSize: 13.5, marginTop: 6 }}>{fmt(invoice.due_date)}</div></div>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: invoice.status === 'overdue' ? 'var(--hh-copper)' : invoice.status === 'paid' ? 'var(--status-positive)' : 'var(--text-faint)' }}>
            {invoice.status}
          </div>
        </div>
      </div>

      {/* Line items */}
      <div style={{ display: 'flex', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', paddingBottom: 8, borderBottom: '1px solid var(--hh-line)' }}>
        <span style={{ flex: 1 }}>Description</span>
        <span style={{ minWidth: 120, textAlign: 'right' }}>Amount</span>
      </div>
      {items.map((li, i) => (
        <div key={i} style={{ display: 'flex', padding: '14px 0', borderBottom: '1px solid var(--hh-line)', fontSize: 14 }}>
          <span style={{ flex: 1 }}>{li.description || '—'}</span>
          <span className="hh-serif" style={{ minWidth: 120, textAlign: 'right', fontSize: 16 }}>{gbpFull(li.amount)}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '16px 0 0' }}>
        <span style={{ fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Total due</span>
        <span className="hh-serif" style={{ fontSize: 30, color: 'var(--hh-copper)' }}>{gbpFull(total)}</span>
      </div>

      {invoice.notes && (
        <section style={{ marginTop: 30 }}>
          <Label>Notes</Label>
          <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body)', margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{invoice.notes}</p>
        </section>
      )}

      <footer style={{ marginTop: 44, paddingTop: 20, borderTop: '1px solid var(--hh-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="hh-voice" style={{ fontStyle: 'italic', fontSize: 15, color: 'var(--text-muted)' }}>Thank you.</span>
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>hueandheal.com</span>
      </footer>
    </article>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--hh-copper)' }}>{children}</div>
}

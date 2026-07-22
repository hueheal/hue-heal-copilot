import type { Proposal } from '../lib/studioOps'
import { gbpFull, phasesTotal } from '../lib/studioOps'
import Logo from './Logo'

/* Branded A4 proposal document. Carries `.print-doc` so Download PDF (window.print)
   captures just this, on white, with the studio's real fonts. */
export default function ProposalDocument({ proposal }: { proposal: Proposal }) {
  const total = phasesTotal(proposal.phases)
  const c = proposal.content
  const dated = new Date(proposal.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <article
      className="print-doc"
      style={{
        width: 794,
        maxWidth: '100%',
        margin: '0 auto',
        background: '#FFFFFF',
        color: 'var(--hh-anthracite)',
        border: '1px solid var(--hh-line-card)',
        borderRadius: 12,
        boxShadow: 'var(--shadow-card)',
        padding: '56px 64px',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '1px solid var(--hh-line)', paddingBottom: 22 }}>
        <Logo height={22} style={{ color: 'var(--hh-anthracite)' }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--hh-copper)' }}>Proposal</div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>{dated}</div>
        </div>
      </header>

      {/* Title block */}
      <div style={{ margin: '34px 0 28px' }}>
        <div style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
          Prepared for {proposal.client_name || '—'}
        </div>
        <h1 className="hh-serif" style={{ fontWeight: 400, fontSize: 38, letterSpacing: '-0.01em', lineHeight: 1.1, margin: '10px 0 0' }}>
          {proposal.title}
        </h1>
      </div>

      {c.intro && <Section body={c.intro} />}
      {c.approach && <Section title="Our approach" body={c.approach} />}

      {/* Phases + fees */}
      {proposal.phases.length > 0 && (
        <section style={{ marginTop: 30 }}>
          <SectionHeading>Scope &amp; investment</SectionHeading>
          <div style={{ marginTop: 12 }}>
            {proposal.phases.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 20, padding: '14px 0', borderTop: '1px solid var(--hh-line)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{p.name}</div>
                  {p.detail && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.55 }}>{p.detail}</div>}
                </div>
                <div className="hh-serif" style={{ fontSize: 18, color: 'var(--hh-copper)', minWidth: 100, textAlign: 'right' }}>{gbpFull(p.fee)}</div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '16px 0 0', borderTop: '2px solid var(--hh-anthracite)', marginTop: 4 }}>
              <div style={{ fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Total</div>
              <div className="hh-serif" style={{ fontSize: 28 }}>{gbpFull(total)}</div>
            </div>
          </div>
        </section>
      )}

      {c.timeline && <Section title="Timeline" body={c.timeline} />}
      {c.terms && <Section title="Terms" body={c.terms} />}

      <footer style={{ marginTop: 44, paddingTop: 20, borderTop: '1px solid var(--hh-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="hh-voice" style={{ fontStyle: 'italic', fontSize: 15, color: 'var(--text-muted)' }}>Designing the future of wellness</span>
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>hueandheal.com</span>
      </footer>
    </article>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--hh-copper)' }}>{children}</div>
}

function Section({ title, body }: { title?: string; body: string }) {
  return (
    <section style={{ marginTop: title ? 30 : 20 }}>
      {title && <SectionHeading>{title}</SectionHeading>}
      <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-body)', margin: title ? '12px 0 0' : 0, whiteSpace: 'pre-wrap' }}>{body}</p>
    </section>
  )
}

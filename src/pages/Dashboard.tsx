import { Link } from 'react-router-dom'
import { METRICS, ATTENTION, USER, greeting, longDate } from '../data/studio'

const now = new Date()

export default function Dashboard() {
  const firstName = USER.name.split(' ')[0]

  return (
    <>
      {/* ---- Header ---- */}
      <header style={{ padding: '34px 40px', borderBottom: '1px solid var(--hh-line)' }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--hh-copper)',
          }}
        >
          {longDate(now)}
        </div>
        <h1
          className="hh-serif"
          style={{
            fontWeight: 400,
            fontSize: 'clamp(30px, 4vw, 52px)',
            letterSpacing: '-0.01em',
            margin: '8px 0 0',
          }}
        >
          {greeting(now)}, {firstName}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-muted)', margin: '14px 0 0' }}>
          2 proposals awaiting reply, 5 posts scheduled this week, and one invoice is overdue.
        </p>
      </header>

      <div style={{ padding: '30px 40px' }}>
        {/* ---- Metric row ---- */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            marginBottom: 28,
          }}
        >
          {METRICS.map((m) => (
            <div
              key={m.label}
              className="hh-card-hover"
              style={{
                background: 'var(--hh-bone)',
                border: '1px solid var(--hh-line-card)',
                borderRadius: 14,
                padding: 22,
              }}
            >
              <div
                className="hh-serif"
                style={{ fontWeight: 300, fontSize: 48, lineHeight: 1, color: 'var(--hh-copper)' }}
              >
                {m.value}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* ---- Two-column body ---- */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Social Copilot hero */}
            <Link
              to="/social"
              className="hh-atmos hh-card-hover"
              style={{
                display: 'block',
                color: 'var(--text-on-ink)',
                borderRadius: 16,
                padding: 30,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'var(--text-on-ink-faint)',
                  }}
                >
                  Social Copilot
                </div>
                <div
                  className="hh-serif"
                  style={{
                    fontWeight: 300,
                    fontSize: 32,
                    lineHeight: 1.1,
                    margin: '12px 0',
                    maxWidth: '20ch',
                  }}
                >
                  Draft this week’s “guide to” in a minute
                </div>
                <span
                  className="hh-btn"
                  style={{
                    display: 'inline-flex',
                    background: 'var(--hh-copper)',
                    color: '#F6EFE4',
                    borderRadius: 999,
                    padding: '11px 22px',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  ✦ Open
                </span>
              </div>
            </Link>

            {/* Proposals & Invoices */}
            <Link
              to="/proposals"
              className="hh-card-hover"
              style={{
                display: 'block',
                background: 'var(--hh-bone)',
                border: '1px solid var(--hh-line-card)',
                borderRadius: 16,
                padding: 30,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--hh-copper)',
                }}
              >
                Proposals &amp; Invoices
              </div>
              <div
                className="hh-serif"
                style={{
                  fontWeight: 400,
                  fontSize: 28,
                  lineHeight: 1.12,
                  margin: '12px 0 10px',
                  maxWidth: '24ch',
                }}
              >
                Brief a scope, get a priced proposal
              </div>
              <p
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.65,
                  color: 'var(--text-muted)',
                  margin: 0,
                  maxWidth: '44ch',
                }}
              >
                Phases and fees follow your standard rates. Convert to an invoice in one click.
              </p>
              <span className="hh-link-underline" style={{ marginTop: 16 }}>
                Open ⟶
              </span>
            </Link>
          </div>

          {/* Right column — Needs attention */}
          <div
            style={{
              background: 'var(--hh-bone)',
              border: '1px solid var(--hh-line-card)',
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: '0.04em', color: 'var(--text-faint)', marginBottom: 16 }}>
              Needs attention
            </div>
            {ATTENTION.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 0',
                  borderTop: '1px solid var(--hh-line)',
                }}
              >
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: item.chipBg,
                    color: item.chipFg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {item.glyph}
                </span>
                <div style={{ lineHeight: 1.3, flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{item.meta}</div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color:
                      item.actionTone === 'accent'
                        ? 'var(--hh-copper)'
                        : item.actionTone === 'positive'
                        ? 'var(--status-positive)'
                        : 'var(--text-muted)',
                  }}
                >
                  {item.action}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

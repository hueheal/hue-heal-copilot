import PageHeader, { PillButton } from '../components/PageHeader'

const KPIS = [
  { value: '10', label: 'Projects live' },
  { value: '261', label: 'Content pieces shipped' },
  { value: '15', label: 'Sectors served' },
]

const CHANNELS = [
  { name: 'Instagram', reach: '48.2k', delta: '+12%', bar: 0.86 },
  { name: 'LinkedIn', reach: '21.7k', delta: '+34%', bar: 0.58 },
  { name: 'Newsletter', reach: '9.4k', delta: '+8%', bar: 0.32 },
  { name: 'Journal', reach: '6.1k', delta: '+5%', bar: 0.22 },
]

export default function Reports() {
  return (
    <>
      <PageHeader
        eyebrow="Insight"
        title="Reports"
        subtitle="Studio performance and social reach, wrapped in the Hue & Heal brand — ready to export for a client or the monthly review."
        action={<PillButton tone="ink">↧ Export report</PillButton>}
      />
      <div style={{ padding: '30px 40px' }}>
        {/* KPI band */}
        <div
          className="hh-atmos"
          style={{ borderRadius: 18, padding: '36px 32px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 16, color: 'var(--text-on-ink)' }}
        >
          {KPIS.map((k) => (
            <div key={k.label}>
              <div className="hh-serif" style={{ fontWeight: 300, fontSize: 64, lineHeight: 1, color: 'var(--hh-ember)' }}>
                {k.value}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-on-ink-muted)', marginTop: 10 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Channels */}
        <div style={{ background: 'var(--hh-bone)', border: '1px solid var(--hh-line-card)', borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 12, letterSpacing: '0.04em', color: 'var(--text-faint)', marginBottom: 18 }}>
            Reach by channel · last 30 days
          </div>
          {CHANNELS.map((c) => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderTop: '1px solid var(--hh-line)' }}>
              <div style={{ width: 120, fontSize: 14, fontWeight: 500 }}>{c.name}</div>
              <div style={{ flex: 1, height: 8, background: 'var(--hh-monterey)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${c.bar * 100}%`, height: '100%', background: 'var(--hh-copper)', borderRadius: 999 }} />
              </div>
              <div className="hh-serif" style={{ fontSize: 18, minWidth: 72, textAlign: 'right' }}>{c.reach}</div>
              <div style={{ fontSize: 12, color: 'var(--status-positive)', minWidth: 48, textAlign: 'right' }}>{c.delta}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

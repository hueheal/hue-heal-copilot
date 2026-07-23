import PageHeader from '../components/PageHeader'

/* Placeholder for modules a brand can enable but that aren't built yet
   (Research, LinkedIn). Keeps the module-driven menu honest — the item is
   selectable and navigable, with a clear preview state instead of a dead link. */
export default function ComingSoon({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div>
      <PageHeader eyebrow="Module" title={title} subtitle={blurb} />
      <div style={{ padding: '48px 40px' }}>
        <div style={{ maxWidth: 520, border: '1px dashed var(--hh-line)', borderRadius: 16, padding: '40px 32px', textAlign: 'center', background: 'var(--hh-lotus)' }}>
          <div style={{ fontSize: 34, marginBottom: 12, opacity: 0.5 }}>✦</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, marginBottom: 8 }}>Coming soon</div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
            {title} is enabled for this brand and will appear here once it ships. We surface it in the menu now so your workspace is set up the way you want.
          </p>
        </div>
      </div>
    </div>
  )
}

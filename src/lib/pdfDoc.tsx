import { Document, Page, View, Text, StyleSheet, Font, Svg, Path, pdf } from '@react-pdf/renderer'
import type { Proposal, Invoice } from './studioOps'
import { phasesTotal } from './studioOps'
import { HUE_HEAL_LOGO_PATH, HUE_HEAL_LOGO_RATIO } from './logoPath'

/* ---------------------------------------------------------------------------
   Vector, selectable-text PDF documents (accessible) built natively with
   @react-pdf/renderer — no raster capture. Brand fonts: Poppins (sans) +
   Prata (a high-contrast editorial serif standing in for the display serif).
   This whole module is dynamically imported, so @react-pdf only loads on export.
--------------------------------------------------------------------------- */

Font.register({
  family: 'Poppins',
  fonts: [
    { src: '/fonts/pdf/Poppins-Light.ttf', fontWeight: 300 },
    { src: '/fonts/pdf/Poppins-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/pdf/Poppins-Medium.ttf', fontWeight: 500 },
    { src: '/fonts/pdf/Poppins-SemiBold.ttf', fontWeight: 600 },
  ],
})
Font.register({ family: 'Prata', src: '/fonts/pdf/Prata-Regular.ttf' })
Font.registerHyphenationCallback((w) => [w]) // no mid-word breaks

const C = {
  ink: '#1E1B18',
  copper: '#B5632F',
  body: '#4A4039',
  muted: '#6E6456',
  faint: '#8C8170',
  line: '#DAD1C0',
}

const gbp = (n: number) => `£${(Number(n) || 0).toLocaleString('en-GB')}`
const longDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

const s = StyleSheet.create({
  page: { paddingVertical: 54, paddingHorizontal: 56, fontFamily: 'Poppins', color: C.ink, fontSize: 10.5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.line },
  wordmark: { fontFamily: 'Prata', fontSize: 20 },
  eyebrow: { fontFamily: 'Poppins', fontWeight: 500, fontSize: 8, letterSpacing: 1.6, color: C.copper },
  meta: { fontSize: 9, color: C.faint, marginTop: 3 },
  preparedFor: { fontSize: 8, letterSpacing: 1.2, color: C.faint, textTransform: 'uppercase', marginTop: 26 },
  title: { fontFamily: 'Prata', fontSize: 30, marginTop: 8, lineHeight: 1.1 },
  sectionHead: { fontFamily: 'Poppins', fontWeight: 500, fontSize: 8, letterSpacing: 1.4, color: C.copper, textTransform: 'uppercase', marginTop: 24, marginBottom: 8 },
  body: { fontSize: 10.5, lineHeight: 1.7, color: C.body, marginTop: 14 },
  phaseRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderTopWidth: 1, borderTopColor: C.line },
  phaseName: { fontFamily: 'Poppins', fontWeight: 600, fontSize: 11.5 },
  phaseDetail: { fontSize: 9.5, color: C.muted, marginTop: 3, lineHeight: 1.5, maxWidth: 340 },
  fee: { fontFamily: 'Prata', fontSize: 14, color: C.copper },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 14, marginTop: 4, borderTopWidth: 1.5, borderTopColor: C.ink },
  totalLabel: { fontSize: 9, letterSpacing: 1, color: C.faint, textTransform: 'uppercase' },
  totalValue: { fontFamily: 'Prata', fontSize: 22 },
  footer: { position: 'absolute', bottom: 40, left: 56, right: 56, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12 },
  footerTag: { fontFamily: 'Prata', fontSize: 12, color: C.muted },
  footerUrl: { fontSize: 9, color: C.faint },
})

function Section({ title, body }: { title?: string; body?: string }) {
  if (!body) return null
  return (
    <View>
      {title ? <Text style={s.sectionHead}>{title}</Text> : null}
      <Text style={[s.body, title ? { marginTop: 0 } : {}]}>{body}</Text>
    </View>
  )
}

function Footer({ tagline }: { tagline: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerTag}>{tagline}</Text>
      <Text style={s.footerUrl}>hueandheal.com</Text>
    </View>
  )
}

const LOGO_H = 15
function PdfHeader({ label, meta }: { label: string; meta: string }) {
  return (
    <View style={s.header} fixed>
      <Svg width={LOGO_H * HUE_HEAL_LOGO_RATIO} height={LOGO_H} viewBox="0 0 975 107">
        <Path d={HUE_HEAL_LOGO_PATH} fill={C.ink} />
      </Svg>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={s.eyebrow}>{label}</Text>
        <Text style={s.meta}>{meta}</Text>
      </View>
    </View>
  )
}

export function ProposalPdf({ proposal }: { proposal: Proposal }) {
  const total = phasesTotal(proposal.phases)
  const c = proposal.content
  return (
    <Document title={`${proposal.client_name} — ${proposal.title}`} author="Hue & Heal">
      <Page size="A4" style={s.page}>
        <PdfHeader label="PROPOSAL" meta={longDate(proposal.created_at)} />

        <Text style={s.preparedFor}>Prepared for {proposal.client_name || '—'}</Text>
        <Text style={s.title}>{proposal.title}</Text>

        <Section body={c.intro} />
        <Section title="Our approach" body={c.approach} />

        {proposal.phases.length > 0 && (
          <View wrap={false}>
            <Text style={s.sectionHead}>Scope &amp; investment</Text>
            {proposal.phases.map((p, i) => (
              <View key={i} style={s.phaseRow}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={s.phaseName}>{p.name}</Text>
                  {p.detail ? <Text style={s.phaseDetail}>{p.detail}</Text> : null}
                </View>
                <Text style={s.fee}>{gbp(p.fee)}</Text>
              </View>
            ))}
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalValue}>{gbp(total)}</Text>
            </View>
          </View>
        )}

        <Section title="Timeline" body={c.timeline} />
        <Section title="Terms" body={c.terms} />

        <Footer tagline="Designing the future of wellness" />
      </Page>
    </Document>
  )
}

export function InvoicePdf({ invoice }: { invoice: Invoice }) {
  const items = invoice.line_items.length ? invoice.line_items : [{ description: invoice.title, amount: invoice.amount_gbp }]
  const total = items.reduce((sum, li) => sum + (Number(li.amount) || 0), 0)
  const number = `HH-${invoice.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`
  return (
    <Document title={`Invoice ${number} — ${invoice.client_name}`} author="Hue & Heal">
      <Page size="A4" style={s.page}>
        <PdfHeader label="INVOICE" meta={number} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 26 }}>
          <View>
            <Text style={s.preparedFor}>Billed to</Text>
            <Text style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 15, marginTop: 6 }}>{invoice.client_name || '—'}</Text>
            <Text style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>{invoice.title}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', gap: 24 }}>
              <View><Text style={s.preparedFor}>Issued</Text><Text style={{ fontSize: 10.5, marginTop: 6 }}>{longDate(invoice.issued_at)}</Text></View>
              <View><Text style={s.preparedFor}>Due</Text><Text style={{ fontSize: 10.5, marginTop: 6 }}>{longDate(invoice.due_date)}</Text></View>
            </View>
            <Text style={{ fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', marginTop: 10, color: invoice.status === 'overdue' ? C.copper : C.faint }}>{invoice.status}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 26, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.line }}>
          <Text style={s.preparedFor}>Description</Text>
          <Text style={s.preparedFor}>Amount</Text>
        </View>
        {items.map((li, i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <Text style={{ fontSize: 11, flex: 1, paddingRight: 16 }}>{li.description || '—'}</Text>
            <Text style={s.fee}>{gbp(li.amount)}</Text>
          </View>
        ))}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 14 }}>
          <Text style={s.totalLabel}>Total due</Text>
          <Text style={{ fontFamily: 'Prata', fontSize: 24, color: C.copper }}>{gbp(total)}</Text>
        </View>

        <Section title="Notes" body={invoice.notes} />

        <Footer tagline="Thank you." />
      </Page>
    </Document>
  )
}

/* ---- Blob + download helpers ---- */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadProposalPdf(proposal: Proposal, filename: string) {
  const blob = await pdf(<ProposalPdf proposal={proposal} />).toBlob()
  triggerDownload(blob, filename)
}

export async function downloadInvoicePdf(invoice: Invoice, filename: string) {
  const blob = await pdf(<InvoicePdf invoice={invoice} />).toBlob()
  triggerDownload(blob, filename)
}

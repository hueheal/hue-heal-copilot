import { useEffect, useMemo, useState } from 'react'
import PageHeader, { PillButton } from '../components/PageHeader'
import ConfirmButton from '../components/ConfirmButton'
import { useAuth } from '../lib/auth'
import {
  type Block,
  type Newsletter,
  type Subscriber,
  TEMPLATES,
  bid,
  renderEmailHtml,
  listNewsletters,
  saveNewsletter,
  updateNewsletter,
  deleteNewsletter,
  listSubscribers,
  addSubscribers,
  deleteSubscriber,
  sendNewsletter,
} from '../lib/newsletter'

const inp: React.CSSProperties = { width: '100%', border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 8, padding: '9px 11px', fontSize: 13.5, fontFamily: 'var(--font-sans)' }
const rail: React.CSSProperties = { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', margin: '18px 0 8px' }

export default function NewsletterPage() {
  const auth = useAuth()
  const gated = auth.mode === 'connected' && !auth.session

  const [subject, setSubject] = useState('This month from Hue & Heal')
  const [preheader, setPreheader] = useState('A short note from the studio.')
  const [templateId, setTemplateId] = useState('journal')
  const [eyebrow, setEyebrow] = useState('The Journal')
  const [blocks, setBlocks] = useState<Block[]>(() => TEMPLATES[0].blocks())
  const [currentId, setCurrentId] = useState<string | null>(null)

  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [subs, setSubs] = useState<Subscriber[]>([])
  const [subInput, setSubInput] = useState('')
  const [testEmail, setTestEmail] = useState(auth.email ?? '')
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function reload() {
    if (gated) return
    try { setNewsletters(await listNewsletters()); setSubs(await listSubscribers()) } catch { /* ignore */ }
  }
  useEffect(() => { reload(); if (auth.email) setTestEmail(auth.email) /* eslint-disable-next-line */ }, [auth.session, auth.mode])

  const html = useMemo(() => renderEmailHtml({ subject, preheader, eyebrow, blocks }), [subject, preheader, eyebrow, blocks])

  function applyTemplate(id: string) {
    const t = TEMPLATES.find((x) => x.id === id) ?? TEMPLATES[0]
    setTemplateId(id); setEyebrow(t.eyebrow); setBlocks(t.blocks()); setCurrentId(null)
  }
  const setBlock = (id: string, patch: Partial<Block>) => setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } as Block : b)))
  const removeBlock = (id: string) => setBlocks((bs) => bs.filter((b) => b.id !== id))
  const moveBlock = (i: number, dir: -1 | 1) => setBlocks((bs) => { const j = i + dir; if (j < 0 || j >= bs.length) return bs; const c = [...bs]; [c[i], c[j]] = [c[j], c[i]]; return c })
  function addBlock(type: Block['type']) {
    const b: Block =
      type === 'heading' ? { id: bid(), type, text: 'Heading' }
      : type === 'text' ? { id: bid(), type, text: 'Write something…' }
      : type === 'image' ? { id: bid(), type, url: '', alt: '' }
      : type === 'button' ? { id: bid(), type, label: 'Read more', href: 'https://www.hueandheal.com' }
      : { id: bid(), type: 'divider' }
    setBlocks((bs) => [...bs, b])
  }

  async function save() {
    setBusy(true); setStatus(null)
    try {
      const payload = { subject, preheader, template: templateId, blocks: blocks as unknown[] }
      if (currentId) { await updateNewsletter(currentId, payload); setStatus('Saved') }
      else { const nl = await saveNewsletter(payload); setCurrentId(nl.id); setStatus('Saved to drafts') }
      await reload()
    } catch (e) { setStatus(`Couldn’t save: ${e instanceof Error ? e.message : e}`) } finally { setBusy(false) }
  }
  function openNl(nl: Newsletter) {
    setCurrentId(nl.id); setSubject(nl.subject); setPreheader(nl.preheader); setTemplateId(nl.template)
    setEyebrow(TEMPLATES.find((t) => t.id === nl.template)?.eyebrow ?? '')
    setBlocks((nl.blocks as unknown as Block[]) ?? [])
  }
  async function delNl(id: string) { await deleteNewsletter(id); if (currentId === id) setCurrentId(null); await reload() }

  async function onAddSubs() {
    const n = await addSubscribers(subInput.split(/[\n,]/))
    setSubInput(''); setStatus(n ? `Added ${n} subscriber${n > 1 ? 's' : ''}` : 'No valid emails'); await reload()
  }

  async function testSend() {
    if (!testEmail) { setStatus('Enter a test email'); return }
    setBusy(true); setStatus('Sending test…')
    try { const { sent, error } = await sendNewsletter(subject, html, [testEmail]); setStatus(sent ? `Test sent to ${testEmail}` : `Test failed: ${error}`) }
    finally { setBusy(false) }
  }
  async function sendToList() {
    const recipients = subs.filter((s) => s.status === 'subscribed').map((s) => s.email)
    if (!recipients.length) { setStatus('No subscribers yet'); return }
    setBusy(true); setStatus(`Sending to ${recipients.length}…`)
    try {
      const { sent, error } = await sendNewsletter(subject, html, recipients)
      if (sent) { if (currentId) await updateNewsletter(currentId, { status: 'sent', sent_at: new Date().toISOString(), recipients_count: sent }); setStatus(`Sent to ${sent} subscriber${sent > 1 ? 's' : ''}`); await reload() }
      else setStatus(`Send failed: ${error}`)
    } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader
        eyebrow="Broadcast"
        title="Newsletter"
        subtitle="Compose an on-brand newsletter, manage your list, and send it end-to-end through Resend."
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {status && <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{status}</span>}
            <PillButton tone="ghost" onClick={save}>{busy ? '…' : 'Save'}</PillButton>
            <PillButton tone="ink" onClick={sendToList}>Send to list ⟶</PillButton>
          </div>
        }
      />

      <div style={{ padding: '24px 40px' }}>
        {gated ? (
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Sign in (bottom-left) to compose and send.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start' }}>
            {/* ---- Editor ---- */}
            <div>
              <label style={rail}>Subject</label>
              <input style={inp} value={subject} onChange={(e) => setSubject(e.target.value)} />
              <label style={rail}>Preheader</label>
              <input style={inp} value={preheader} onChange={(e) => setPreheader(e.target.value)} />

              <label style={rail}>Template</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TEMPLATES.map((t) => (
                  <button key={t.id} className="hh-btn" onClick={() => applyTemplate(t.id)}
                    style={{ borderRadius: 999, padding: '7px 13px', fontSize: 12, border: templateId === t.id ? '1px solid var(--hh-anthracite)' : '1px solid var(--hh-line)', background: templateId === t.id ? 'var(--hh-anthracite)' : 'transparent', color: templateId === t.id ? 'var(--text-on-ink)' : 'var(--text-body)' }}>{t.label}</button>
                ))}
              </div>

              <label style={rail}>Blocks</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {blocks.map((b, i) => (
                  <div key={b.id} style={{ border: '1px solid var(--hh-line)', borderRadius: 10, padding: 10, background: 'var(--hh-bone)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: b.type === 'divider' ? 0 : 6 }}>
                      <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', flex: 1 }}>{b.type}</span>
                      <button className="hh-btn" onClick={() => moveBlock(i, -1)} style={miniBtn}>↑</button>
                      <button className="hh-btn" onClick={() => moveBlock(i, 1)} style={miniBtn}>↓</button>
                      <ConfirmButton onConfirm={() => removeBlock(b.id)} style={{ ...miniBtn, border: 'none' }}>×</ConfirmButton>
                    </div>
                    {b.type === 'heading' && <input style={inp} value={b.text} onChange={(e) => setBlock(b.id, { text: e.target.value })} />}
                    {b.type === 'text' && <textarea style={{ ...inp, resize: 'vertical' }} rows={3} value={b.text} onChange={(e) => setBlock(b.id, { text: e.target.value })} />}
                    {b.type === 'image' && <input style={inp} placeholder="Image URL" value={b.url} onChange={(e) => setBlock(b.id, { url: e.target.value })} />}
                    {b.type === 'button' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input style={{ ...inp, flex: 1 }} placeholder="Label" value={b.label} onChange={(e) => setBlock(b.id, { label: e.target.value })} />
                        <input style={{ ...inp, flex: 1.4 }} placeholder="Link" value={b.href} onChange={(e) => setBlock(b.id, { href: e.target.value })} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {(['heading', 'text', 'image', 'button', 'divider'] as const).map((t) => (
                  <button key={t} className="hh-btn" onClick={() => addBlock(t)} style={{ ...miniBtn, width: 'auto', padding: '6px 10px', fontSize: 11.5 }}>＋ {t}</button>
                ))}
              </div>

              {/* Subscribers */}
              <label style={rail}>Subscribers · {subs.length}</label>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={2} placeholder="Add emails (comma or newline separated)" value={subInput} onChange={(e) => setSubInput(e.target.value)} />
              <button className="hh-btn" onClick={onAddSubs} style={{ ...miniBtn, width: 'auto', padding: '7px 12px', marginTop: 6 }}>＋ Add subscribers</button>
              <div style={{ marginTop: 8, maxHeight: 140, overflowY: 'auto' }}>
                {subs.map((s) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderTop: '1px solid var(--hh-line)', fontSize: 12.5 }}>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.email}</span>
                    <ConfirmButton onConfirm={async () => { await deleteSubscriber(s.id); await reload() }} style={{ ...miniBtn, border: 'none' }}>×</ConfirmButton>
                  </div>
                ))}
              </div>

              <label style={rail}>Test send</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input style={{ ...inp, flex: 1 }} placeholder="you@studio.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
                <PillButton tone="accent" onClick={testSend}>Send test</PillButton>
              </div>
            </div>

            {/* ---- Live preview + drafts ---- */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 8 }}>Preview</div>
              <iframe title="preview" srcDoc={html} style={{ width: '100%', height: 620, border: '1px solid var(--hh-line-card)', borderRadius: 12, background: '#fff' }} />

              {newsletters.length > 0 && (
                <div style={{ marginTop: 16, background: 'var(--hh-bone)', border: '1px solid var(--hh-line-card)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, letterSpacing: '0.04em', color: 'var(--text-faint)', marginBottom: 6 }}>Drafts &amp; sent · {newsletters.length}</div>
                  {newsletters.map((n) => (
                    <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: '1px solid var(--hh-line)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{n.subject || 'Untitled'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{n.status === 'sent' && n.sent_at ? `Sent · ${new Date(n.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${n.recipients_count}` : 'Draft'}</div>
                      </div>
                      <button className="hh-btn" onClick={() => openNl(n)} style={{ background: 'none', border: 'none', color: 'var(--hh-copper)', fontSize: 12 }}>Open</button>
                      <ConfirmButton onConfirm={() => delNl(n.id)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 15, lineHeight: 1 }}>×</ConfirmButton>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

const miniBtn: React.CSSProperties = { background: 'none', border: '1px solid var(--hh-line)', borderRadius: 6, width: 24, height: 22, color: 'var(--text-faint)', fontSize: 12, lineHeight: 1 }

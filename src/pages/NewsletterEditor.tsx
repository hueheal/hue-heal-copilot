import { useEffect, useMemo, useState } from 'react'
import { knowledgeDigest } from '../lib/knowledge'
import VersionHistory from '../components/chrome/VersionHistory'
import { saveVersion } from '../lib/assets'
import { useSearchParams } from 'react-router-dom'
import EditorShell from '../components/EditorShell'
import ConfirmButton from '../components/ConfirmButton'
import { useAuth } from '../lib/auth'
import { useBrand } from '../lib/brandContext'
import { useDraft } from '../lib/useDraft'
import { useIsMobile } from '../lib/useIsMobile'
import { TYPE_ROLES, EMAIL_TYPE_SIZE } from '../lib/typeScale'
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
  uploadNewsletterImage,
  generateNewsletter,
  subscribeLink,
  subscriberGroups,
} from '../lib/newsletter'

/* Content Studio · Newsletter editor. The composer inside the unified shell:
   brief, template, sections, send + audience in the rail; the rendered email
   as the canvas. */

const inp: React.CSSProperties = { width: '100%', border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }
const rail: React.CSSProperties = { fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)', margin: '20px 0 10px' }
const miniBtn: React.CSSProperties = { background: 'none', border: '1px solid var(--hh-line)', borderRadius: 6, width: 26, height: 24, color: 'var(--text-faint)', fontSize: 12, lineHeight: 1, cursor: 'pointer' }
const chip = (active: boolean): React.CSSProperties => ({ borderRadius: 999, padding: '8px 15px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: active ? '1px solid var(--hh-anthracite)' : '1px solid var(--hh-line)', background: active ? 'var(--hh-anthracite)' : 'transparent', color: active ? 'var(--text-on-ink)' : 'var(--text-body)' })

export default function NewsletterEditor() {
  const auth = useAuth()
  const { current: brand } = useBrand()
  const [params, setParams] = useSearchParams()
  const isMobile = useIsMobile()
  const gated = auth.mode === 'connected' && !auth.session

  const [subject, setSubject] = useState('This month from the studio')
  const [preheader, setPreheader] = useState('A short note from the studio.')

  // Personalise the default subject once the brand world resolves (untouched only).
  useEffect(() => {
    if (brand?.name) setSubject((s) => (s === 'This month from the studio' ? `This month from ${brand.name}` : s))
  }, [brand?.name])
  const [templateId, setTemplateId] = useState('journal')
  const [eyebrow, setEyebrow] = useState('The Journal')
  const [blocks, setBlocks] = useState<Block[]>(() => TEMPLATES[0].blocks())
  const [currentId, setCurrentId] = useState<string | null>(null)

  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [subs, setSubs] = useState<Subscriber[]>([])
  const [subInput, setSubInput] = useState('')
  const [testEmail, setTestEmail] = useState(auth.email ?? '')
  const [sendGroup, setSendGroup] = useState<string>('__all')
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [mView, setMView] = useState<'edit' | 'preview'>('edit')
  const [aiTopic, setAiTopic] = useState(() => params.get('topic') ?? '')
  const [aiNotes, setAiNotes] = useState('')
  const [aiBusy, setAiBusy] = useState(false)

  async function reload() {
    if (gated) return
    try { setNewsletters(await listNewsletters()); setSubs(await listSubscribers()) } catch { /* ignore */ }
  }
  useEffect(() => { reload(); if (auth.email) setTestEmail(auth.email) /* eslint-disable-next-line */ }, [auth.session, auth.mode, brand?.id])

  // Arriving with ?open= (journal teaser bridge, digest links) opens that draft.
  useEffect(() => {
    const openId = params.get('open')
    if (!openId || !newsletters.length) return
    const nl = newsletters.find((n) => n.id === openId)
    if (nl) { openNl(nl); setParams({}, { replace: true }) }
    /* eslint-disable-next-line */
  }, [newsletters])

  // Autosave (same key as the previous composer so in-flight drafts survive).
  useDraft(
    `hh-newsletter-draft:${brand?.id ?? 'x'}`,
    { currentId, subject, preheader, templateId, eyebrow, blocks },
    (v) => {
      setCurrentId(v.currentId ?? null); setSubject(v.subject ?? ''); setPreheader(v.preheader ?? '')
      setTemplateId(v.templateId ?? 'journal'); setEyebrow(v.eyebrow ?? ''); setBlocks(Array.isArray(v.blocks) ? v.blocks : [])
    },
    !gated && !params.get('open'),
  )

  // Render in the current brand world's identity.
  const emailBrand = useMemo(
    () =>
      brand
        ? {
            name: brand.name,
            accent_color: brand.accent_color,
            logo_url: brand.logo_url,
            tagline: brand.tagline || (brand.name === 'Hue & Heal' ? 'Designing the future of wellness' : undefined),
            website: brand.website || (brand.name === 'Hue & Heal' ? 'hueandheal.com' : undefined),
          }
        : undefined,
    [brand?.id, brand?.name, brand?.accent_color, brand?.logo_url],
  )
  const html = useMemo(
    () => renderEmailHtml({ subject, preheader, eyebrow, blocks }, emailBrand),
    [subject, preheader, eyebrow, blocks, emailBrand],
  )

  async function draftWithAI() {
    if (!aiTopic.trim()) return
    setAiBusy(true); setStatus(null)
    const { result, error } = await generateNewsletter({
      topic: aiTopic,
      notes: aiNotes,
      brandName: brand?.name,
      toneOfVoice: brand?.tone_of_voice,
      writingGuidelines: brand?.writing_guidelines,
      template: TEMPLATES.find((t) => t.id === templateId)?.label,
      knowledge: knowledgeDigest(brand?.knowledge) || undefined,
    })
    setAiBusy(false)
    if (error || !result) { setStatus(error ?? 'Could not draft'); return }
    setSubject(result.subject)
    setPreheader(result.preheader)
    if (result.eyebrow) setEyebrow(result.eyebrow)
    setBlocks(result.blocks)
    setCurrentId(null)
    setStatus('Draft ready — edit anything below.')
    if (isMobile) setMView('preview')
  }

  function applyTemplate(id: string) {
    const t = TEMPLATES.find((x) => x.id === id) ?? TEMPLATES[0]
    setTemplateId(id); setEyebrow(t.eyebrow); setBlocks(t.blocks()); setCurrentId(null)
  }
  function blank() {
    setCurrentId(null); setSubject(`This month from ${brand?.name ?? 'the studio'}`); setPreheader('A short note from the studio.')
    applyTemplate('journal'); setStatus(null)
  }
  const setBlock = (id: string, patch: Partial<Block>) => setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } as Block : b)))
  const removeBlock = (id: string) => setBlocks((bs) => bs.filter((b) => b.id !== id))
  const moveBlock = (i: number, dir: -1 | 1) => setBlocks((bs) => { const j = i + dir; if (j < 0 || j >= bs.length) return bs; const c = [...bs]; [c[i], c[j]] = [c[j], c[i]]; return c })
  async function uploadBlockImage(id: string, file: File) {
    setUploadingId(id); setStatus('Uploading image…')
    const { url, error } = await uploadNewsletterImage(file)
    setUploadingId(null)
    if (error || !url) { setStatus(`Upload failed: ${error ?? 'unknown error'}`); return }
    setBlock(id, { url }); setStatus('Image added')
  }
  // Shared type-scale presets for heading/text blocks (email px).
  function sizeRow(b: Extract<Block, { type: 'heading' | 'text' }>, def: number) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
        {TYPE_ROLES.map((r) => {
          const size = EMAIL_TYPE_SIZE[r]
          const active = (b.size ?? def) === size
          return (
            <button key={r} className="hh-btn" title={`${size}px`} onClick={() => setBlock(b.id, { size })}
              style={{ ...miniBtn, width: 'auto', padding: '4px 8px', fontSize: 10.5, border: active ? '1px solid var(--hh-anthracite)' : '1px solid var(--hh-line)', background: active ? 'var(--hh-anthracite)' : 'transparent', color: active ? 'var(--text-on-ink)' : 'var(--text-faint)' }}>
              {r}
            </button>
          )
        })}
      </div>
    )
  }
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
      if (currentId) { await updateNewsletter(currentId, payload); void saveVersion('newsletter', currentId, payload as unknown as Record<string, unknown>, subject) ; setStatus('Saved') }
      else { const nl = await saveNewsletter(payload); setCurrentId(nl.id); setStatus('Saved to drafts') }
      await reload()
    } catch (e) { setStatus(`Couldn’t save: ${e instanceof Error ? e.message : e}`) } finally { setBusy(false) }
  }
  function openNl(nl: Newsletter) {
    setCurrentId(nl.id); setSubject(nl.subject); setPreheader(nl.preheader); setTemplateId(nl.template)
    setEyebrow(TEMPLATES.find((t) => t.id === nl.template)?.eyebrow ?? '')
    setBlocks((nl.blocks as unknown as Block[]) ?? [])
    if (isMobile) setMView('preview')
  }
  async function delNl(id: string) { await deleteNewsletter(id); if (currentId === id) setCurrentId(null); await reload() }

  async function onAddSubs() {
    const n = await addSubscribers(subInput.split(/[\n,]/))
    setSubInput(''); setStatus(n ? `Added ${n} subscriber${n > 1 ? 's' : ''}` : 'No valid emails'); await reload()
  }

  async function testSend() {
    if (sending) return
    if (!testEmail) { setStatus('Enter a test email'); return }
    setSending(true); setStatus('Sending test…')
    try { const { sent, error } = await sendNewsletter(subject, html, [testEmail], brand?.sender_email); setStatus(sent ? `Test sent to ${testEmail}` : `Test failed: ${error}`) }
    finally { setSending(false) }
  }
  async function sendToList() {
    if (sending) return
    const audience = subs
      .filter((s) => s.status === 'subscribed')
      .filter((s) => sendGroup === '__all' || (s.groups ?? []).includes(sendGroup))
    const recipients = audience.map((s) => ({ email: s.email, token: s.unsub_token }))
    if (!recipients.length) { setStatus(sendGroup === '__all' ? 'No subscribers yet' : `No subscribers in “${sendGroup}”`); return }
    setSending(true); setStatus(`Sending to ${recipients.length}…`)
    try {
      const { sent, error } = await sendNewsletter(subject, html, recipients, brand?.sender_email)
      if (sent) { if (currentId) await updateNewsletter(currentId, { status: 'sent', sent_at: new Date().toISOString(), recipients_count: sent }); setStatus(`Sent to ${sent} subscriber${sent > 1 ? 's' : ''}`); await reload() }
      else setStatus(`Send failed: ${error}`)
    } finally { setSending(false) }
  }

  if (gated) {
    return (
      <EditorShell ctype="Edition" subline="Sign in to compose and send" onDone={() => {}} doneDisabled
        rail={<p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Sign in (bottom-left) to compose and send.</p>} canvas={<div />} />
    )
  }

  return (
    <EditorShell
      ctype="Edition"
      subline={`${brand?.name ?? 'Hue & Heal'} · autosaved`}
      headerExtra={<VersionHistory kind="newsletter" assetId={currentId} onRestore={(sn) => {
        setSubject(String(sn.subject ?? '')); setPreheader(String(sn.preheader ?? ''))
        if (sn.template) setTemplateId(String(sn.template))
        setBlocks((sn.blocks as Block[]) ?? [])
        setStatus('Restored — Save to keep it')
      }} />}
      status={status}
      busy={busy}
      onNew={blank}
      onDone={save}
      doneDisabled={!subject.trim()}
      view={mView}
      onViewChange={setMView}
      editLabel="Compose"
      rail={
        <div>
          {/* Brief the copilot */}
          <div style={{ border: '1px solid var(--hh-line)', borderRadius: 14, padding: 16, background: 'var(--hh-bone)' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-accent)', marginBottom: 10 }}>✦ Brief the copilot</div>
            <input style={{ ...inp, marginBottom: 8 }} value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="Topic — e.g. designing for stillness" onKeyDown={(e) => { if (e.key === 'Enter') draftWithAI() }} />
            <textarea style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} rows={2} value={aiNotes} onChange={(e) => setAiNotes(e.target.value)} placeholder="Notes, points to cover, links (optional)" />
            <button className="hh-btn" onClick={draftWithAI} disabled={aiBusy || !aiTopic.trim()}
              style={{ marginTop: 10, width: '100%', background: 'var(--hh-copper)', color: 'var(--hh-on-accent, #F6EFE4)', border: 'none', borderRadius: 999, padding: '11px 18px', fontSize: 13, fontWeight: 500, cursor: aiBusy || !aiTopic.trim() ? 'default' : 'pointer', opacity: aiBusy || !aiTopic.trim() ? 0.55 : 1 }}>
              {aiBusy ? 'Writing…' : '✦ Generate'}
            </button>
          </div>

          <div style={rail}>Template · Newsletter</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TEMPLATES.map((t) => <button key={t.id} className="hh-btn" onClick={() => applyTemplate(t.id)} style={chip(templateId === t.id)}>{t.label}</button>)}
          </div>

          <div style={rail}>Subject</div>
          <input style={inp} value={subject} onChange={(e) => setSubject(e.target.value)} />
          <div style={rail}>Preheader</div>
          <input style={inp} value={preheader} onChange={(e) => setPreheader(e.target.value)} />

          <div style={rail}>Sections</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {blocks.map((b, i) => (
              <div key={b.id} style={{ border: '1px solid var(--hh-line)', borderRadius: 10, padding: 10, background: 'var(--hh-bone)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: b.type === 'divider' ? 0 : 6 }}>
                  <span style={{ color: 'var(--text-faint)', fontSize: 11, cursor: 'default' }}>⋮⋮</span>
                  <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', flex: 1 }}>{b.type}</span>
                  <button className="hh-btn" onClick={() => moveBlock(i, -1)} style={miniBtn}>↑</button>
                  <button className="hh-btn" onClick={() => moveBlock(i, 1)} style={miniBtn}>↓</button>
                  <ConfirmButton onConfirm={() => removeBlock(b.id)} style={{ ...miniBtn, border: 'none' }}>×</ConfirmButton>
                </div>
                {b.type === 'heading' && (<><input style={inp} value={b.text} onChange={(e) => setBlock(b.id, { text: e.target.value })} />{sizeRow(b, 28)}</>)}
                {b.type === 'text' && (<><textarea style={{ ...inp, resize: 'vertical' }} rows={3} value={b.text} onChange={(e) => setBlock(b.id, { text: e.target.value })} />{sizeRow(b, 15)}</>)}
                {b.type === 'image' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {b.url && <img src={b.url} alt="" style={{ height: 40, width: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--hh-line)' }} />}
                      <label className="hh-btn" style={{ ...miniBtn, width: 'auto', padding: '9px 12px', cursor: uploadingId === b.id ? 'default' : 'pointer', opacity: uploadingId === b.id ? 0.6 : 1, flex: 1, textAlign: 'center' }}>
                        {uploadingId === b.id ? 'Uploading…' : b.url ? 'Replace image' : '⭱ Upload image'}
                        <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingId === b.id}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBlockImage(b.id, f); e.currentTarget.value = '' }} />
                      </label>
                    </div>
                    <input style={{ ...inp, marginTop: 6, fontSize: 12.5 }} placeholder="or paste an image URL" value={b.url} onChange={(e) => setBlock(b.id, { url: e.target.value })} />
                  </div>
                )}
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
              <button key={t} className="hh-btn" onClick={() => addBlock(t)} style={{ ...miniBtn, width: 'auto', padding: '7px 12px', fontSize: 11.5 }}>＋ {t}</button>
            ))}
          </div>

          <div style={rail}>Send</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input style={{ ...inp, flex: 1 }} placeholder="you@studio.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
            <button className="hh-btn" onClick={testSend} disabled={sending}
              style={{ background: 'none', border: '1px solid var(--hh-copper)', color: 'var(--text-accent)', borderRadius: 999, padding: '9px 16px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', opacity: sending ? 0.55 : 1, whiteSpace: 'nowrap' }}>
              {sending ? 'Sending…' : 'Send test'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <select value={sendGroup} onChange={(e) => setSendGroup(e.target.value)} style={{ ...inp, flex: 1 }}>
              <option value="__all">All subscribed ({subs.filter((s) => s.status === 'subscribed').length})</option>
              {subscriberGroups(subs).map((g) => (
                <option key={g} value={g}>{g} ({subs.filter((s) => s.status === 'subscribed' && (s.groups ?? []).includes(g)).length})</option>
              ))}
            </select>
            <button className="hh-btn" onClick={sendToList} disabled={sending}
              style={{ background: 'var(--hh-copper)', color: 'var(--hh-on-accent, #F6EFE4)', border: '1px solid var(--hh-copper)', borderRadius: 999, padding: '9px 16px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', opacity: sending ? 0.55 : 1, whiteSpace: 'nowrap' }}>
              {sending ? 'Sending…' : 'Send to list ⟶'}
            </button>
          </div>

          {brand && (
            <>
              <div style={rail}>Audience</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input readOnly style={{ ...inp, flex: 1, fontSize: 12 }} value={subscribeLink(brand.id, brand.name)} onFocus={(e) => e.currentTarget.select()} />
                <button className="hh-btn" style={{ ...miniBtn, width: 'auto', padding: '7px 12px' }}
                  onClick={() => { navigator.clipboard?.writeText(subscribeLink(brand.id, brand.name)); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', margin: '4px 0 10px' }}>Share this — people who open it join {brand.name}’s list.</div>
            </>
          )}
          <textarea style={{ ...inp, resize: 'vertical' }} rows={2} placeholder="Add emails manually (comma or newline separated)" value={subInput} onChange={(e) => setSubInput(e.target.value)} />
          <button className="hh-btn" onClick={onAddSubs} style={{ ...miniBtn, width: 'auto', padding: '8px 12px', marginTop: 6 }}>＋ Add subscribers</button>
          <div style={{ marginTop: 8, maxHeight: 140, overflowY: 'auto' }}>
            {subs.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderTop: '1px solid var(--hh-line)', fontSize: 12.5 }}>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.email}
                  {s.status === 'unsubscribed' && <span style={{ color: 'var(--hh-ember)', marginLeft: 6, fontSize: 10.5 }}>unsubscribed</span>}
                  {(s.groups ?? []).length > 0 && <span style={{ color: 'var(--text-faint)', marginLeft: 6, fontSize: 10.5 }}>· {(s.groups ?? []).join(', ')}</span>}
                </span>
                <ConfirmButton onConfirm={async () => { await deleteSubscriber(s.id); await reload() }} style={{ ...miniBtn, border: 'none' }}>×</ConfirmButton>
              </div>
            ))}
          </div>

          {newsletters.length > 0 && (
            <>
              <div style={rail}>Editions · {newsletters.length}</div>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {newsletters.map((n) => (
                  <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid var(--hh-line)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.subject || 'Untitled'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{n.status === 'sent' && n.sent_at ? `Sent · ${new Date(n.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${n.recipients_count}` : 'Draft'}</div>
                    </div>
                    <button className="hh-btn" onClick={() => openNl(n)} style={{ background: 'none', border: 'none', color: 'var(--hh-copper)', fontSize: 12, cursor: 'pointer' }}>Open</button>
                    <ConfirmButton onConfirm={() => delNl(n.id)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 15, lineHeight: 1, cursor: 'pointer' }}>×</ConfirmButton>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      }
      canvas={<iframe title="preview" srcDoc={html} style={{ width: '100%', height: isMobile ? 560 : 680, border: '1px solid var(--hh-line-card)', borderRadius: 12, background: '#fff' }} />}
    />
  )
}

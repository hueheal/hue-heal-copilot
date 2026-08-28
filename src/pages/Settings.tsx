import { useEffect, useState } from 'react'
import PageHeader, { PillButton } from '../components/PageHeader'
import ConfirmButton from '../components/ConfirmButton'
import ConfirmModal from '../components/ConfirmModal'
import { useAuth } from '../lib/auth'
import { useBrand } from '../lib/brandContext'
import { supabase } from '../lib/supabase'
import {
  type BrandProfile,
  type BrandMember,
  listBrands,
  createBlankBrand,
  updateBrand,
  deleteBrand,
  setDefaultBrand,
  listBrandMembers,
  inviteBrandMember,
  removeBrandMember,
} from '../lib/brand'
import { KNOWLEDGE_FIELDS, type Knowledge } from '../lib/knowledge'
import { getChannel, startPairing, setPush, unlinkChannel, type OrgChannel } from '../lib/channel'
import { listRoles, type Role } from '../lib/roles'
import { startInstagramConnect, finishInstagramConnect, refreshInstagramToken } from '../lib/instagramConnect'
import {
  type AppMember,
  checkMembership,
  listMembers,
  addMember,
  setMemberRole,
  removeMember,
} from '../lib/members'

const label: React.CSSProperties = { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ck-faint)', margin: '20px 0 8px', display: 'block' }
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1px solid var(--ck-line)', background: 'var(--ck-surface)', borderRadius: 8, padding: '10px 12px', fontSize: 13.5, fontFamily: 'var(--ck-font)' }
const area: React.CSSProperties = { ...inp, lineHeight: 1.55, resize: 'vertical' }
const hint: React.CSSProperties = { fontSize: 12, color: 'var(--ck-muted)', margin: '4px 0 0', lineHeight: 1.5 }

export default function Settings() {
  const [tab, setTab] = useState<'brands' | 'knowledge' | 'channel' | 'team'>('brands')

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Brands & Team"
        subtitle="Manage your brand worlds (voice + creative direction) and who's allowed into the studio workspace."
      />
      <div style={{ display: 'flex', gap: 4, padding: '14px 40px 0', borderBottom: '1px solid var(--ck-line)' }}>
        {(['brands', 'knowledge', 'channel', 'team'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="hh-btn"
            style={{
              border: 'none', background: 'none', padding: '8px 14px 14px', fontSize: 14, textTransform: 'capitalize',
              color: tab === t ? 'var(--ck-ink)' : 'var(--ck-muted)',
              borderBottom: tab === t ? '2px solid var(--hh-copper)' : '2px solid transparent', marginBottom: -1,
            }}
          >
            {t === 'brands' ? 'Brand' : t === 'knowledge' ? 'Knowledge' : t === 'channel' ? 'Channel' : 'Team'}
          </button>
        ))}
      </div>
      {tab === 'brands' ? <BrandsPanel /> : tab === 'knowledge' ? <KnowledgePanel /> : tab === 'channel' ? <ChannelPanel /> : <TeamPanel />}
    </div>
  )
}

/* ------------------------------------------------------------------ Brands */
function BrandsPanel() {
  const brandCtx = useBrand()
  const [brands, setBrands] = useState<BrandProfile[]>([])
  const [selId, setSelId] = useState<string | null>(null)
  const [draft, setDraft] = useState<BrandProfile | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [delBusy, setDelBusy] = useState(false)
  const [igCheck, setIgCheck] = useState<{ ok: boolean; text: string } | null>(null)

  async function reload(pick?: string) {
    const list = await listBrands()
    setBrands(list)
    const target = pick ?? selId ?? list[0]?.id ?? null
    setSelId(target)
    setDraft(list.find((b) => b.id === target) ?? null)
  }
  useEffect(() => {
    // Coming back from Instagram's consent screen? Finish the connection for
    // the brand named in ?state=, then load (and select) that brand.
    (async () => {
      const done = await finishInstagramConnect()
      if (done) {
        await reload(done.brandId).catch(() => setStatus('Could not load brands'))
        const canPost = !done.permissions || done.permissions.includes('instagram_business_content_publish')
        setIgCheck(done.error
          ? { ok: false, text: done.error }
          : canPost
            ? { ok: true, text: `Connected. Posts as @${done.username ?? 'instagram'}${done.expiresAt ? `, token valid until ${new Date(done.expiresAt).toLocaleDateString()}` : ''}. Granted: ${(done.permissions ?? []).join(', ') || 'unknown'}.` }
            : { ok: false, text: `Connected as @${done.username ?? 'instagram'} but Instagram did not grant instagram_business_content_publish (granted: ${(done.permissions ?? []).join(', ') || 'none'}). Enable that permission on the Meta app (Permissions and features → Ready for testing), then Reconnect.` })
      } else {
        await reload().catch(() => setStatus('Could not load brands'))
      }
    })()
    /* eslint-disable-next-line */
  }, [])

  function select(id: string) { setSelId(id); setDraft(brands.find((b) => b.id === id) ?? null); setStatus(null) }
  const patch = (p: Partial<BrandProfile>) => setDraft((d) => (d ? { ...d, ...p } : d))

  async function save() {
    if (!draft) return
    setBusy(true); setStatus(null)
    try {
      await updateBrand(draft.id, {
        name: draft.name, tone_of_voice: draft.tone_of_voice, writing_guidelines: draft.writing_guidelines,
        image_master_prompt: draft.image_master_prompt, image_negatives: draft.image_negatives,
        accent_color: draft.accent_color, display_font: draft.display_font, logo_url: draft.logo_url,
        sender_email: draft.sender_email ?? '', tagline: draft.tagline ?? '', website: draft.website ?? '',
        instagram: draft.instagram ?? {},
      })
      await reload(draft.id); await brandCtx.reload(); setStatus('Saved')
    } catch (e) { setStatus(String(e)) } finally { setBusy(false) }
  }
  async function addBrand() {
    setBusy(true)
    try { const b = await createBlankBrand('New brand'); await reload(b.id); await brandCtx.reload(); setStatus('Brand created') }
    catch (e) { setStatus(String(e)) } finally { setBusy(false) }
  }
  async function makeDefault() { if (!draft) return; await setDefaultBrand(draft.id); await reload(draft.id); await brandCtx.reload(); setStatus('Set as default') }

  async function uploadLogo(file: File) {
    if (!supabase || !draft) { patch({ logo_url: '' }); return }
    setBusy(true); setStatus('Uploading logo…')
    try {
      const { data: u } = await supabase.auth.getUser()
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '')
      const path = `${u.user?.id ?? 'anon'}/brand-logos/${draft.id}-${Date.now()}-${safe}`
      const { error } = await supabase.storage.from('social-assets').upload(path, file, { upsert: true, contentType: file.type || 'image/png' })
      if (error) throw error
      const { data } = supabase.storage.from('social-assets').getPublicUrl(path)
      patch({ logo_url: data.publicUrl })
      setStatus('Logo uploaded — Save changes to apply')
    } catch (e) { setStatus(`Upload failed: ${e instanceof Error ? e.message : e}`) } finally { setBusy(false) }
  }
  /** Hand off to Instagram's consent screen; Settings finishes the job on return. */
  async function connectInstagram() {
    if (!draft) return
    setBusy(true); setIgCheck(null)
    const r = await startInstagramConnect(draft.id)
    if (r.error) { setIgCheck({ ok: false, text: r.error }); setBusy(false) }
    // On success the page navigates away; busy stays on until then.
  }
  async function renewInstagram() {
    if (!draft) return
    setBusy(true); setIgCheck(null)
    const r = await refreshInstagramToken(draft.id)
    if (r.error) setIgCheck({ ok: false, text: r.error })
    else { await reload(draft.id); setIgCheck({ ok: true, text: `Token renewed${r.expiresAt ? `, valid until ${new Date(r.expiresAt).toLocaleDateString()}` : ''}.` }) }
    setBusy(false)
  }
  /** Ask the Graph API who this token posts as. Fills or corrects the account
      ID (a Page ID is resolved to its linked Instagram account) and confirms the
      publish permission is on the token, so a bad paste shows up here rather
      than on the first post. */
  async function checkInstagram() {
    const token = draft?.instagram?.access_token?.trim()
    if (!token) { setIgCheck({ ok: false, text: 'Paste the access token first' }); return }
    setBusy(true); setIgCheck(null)
    // Instagram Login tokens (IG…) live on graph.instagram.com and need no
    // Facebook Page; Facebook Login tokens (EAA…) live on graph.facebook.com.
    const viaInstagram = token.startsWith('IG')
    const G = viaInstagram ? 'https://graph.instagram.com/v21.0' : 'https://graph.facebook.com/v21.0'
    const get = async (path: string) => {
      const res = await fetch(`${G}/${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.error) throw new Error(data?.error?.message ?? `Graph ${res.status}`)
      return data as Record<string, unknown>
    }
    try {
      if (viaInstagram) {
        const me = await get('me?fields=user_id,username,name,account_type')
        const id = String(me.user_id ?? me.id ?? '')
        const username = String(me.username ?? '')
        if (!id) throw new Error('The token did not return an Instagram account. Generate it again from the app dashboard (Instagram → API setup with Instagram login).')
        const type = String(me.account_type ?? '')
        patch({ instagram: { ...(draft?.instagram ?? {}), user_id: id, username: username || draft?.instagram?.username || '', access_token: token, connected_at: new Date().toISOString() } })
        setIgCheck(type && !/business|creator|media_creator/i.test(type)
          ? { ok: false, text: `Found @${username} but it is a ${type.toLowerCase()} account. Switch it to Professional (Business or Creator) in Instagram, then check again.` }
          : { ok: true, text: `Posts as @${username || id}${me.name ? ` (${String(me.name)})` : ''} via Instagram Login (no Facebook Page needed). Save changes to keep it.` })
        return
      }
      let id = draft?.instagram?.user_id?.trim() ?? ''
      let username = ''
      let name = ''
      if (id) {
        const me = await get(`${id}?fields=username,name,instagram_business_account{id,username,name}`).catch(() => null)
        const linked = me?.instagram_business_account as { id?: string; username?: string; name?: string } | undefined
        if (me && typeof me.username === 'string') { username = me.username; name = String(me.name ?? '') }
        else if (linked?.id) { id = linked.id; username = linked.username ?? ''; name = linked.name ?? '' }
        else id = ''
      }
      if (!id) {
        const pages = await get('me/accounts?fields=name,instagram_business_account{id,username,name}')
        const list = (pages.data as Array<{ name?: string; instagram_business_account?: { id?: string; username?: string; name?: string } }> | undefined) ?? []
        const hit = list.find((p) => p.instagram_business_account?.id)
        if (!hit?.instagram_business_account?.id) throw new Error(list.length ? `The token can see ${list.length} Page(s) but none has an Instagram account linked. Link @remedae to the Page (Page settings → Linked accounts) and generate the token again.` : 'The token cannot see any Facebook Page. Generate it with pages_show_list ticked and the Remedae Page selected.')
        id = hit.instagram_business_account.id
        username = hit.instagram_business_account.username ?? ''
        name = hit.instagram_business_account.name ?? hit.name ?? ''
      }
      const perms = await get('me/permissions').catch(() => null)
      const granted = new Set(((perms?.data as Array<{ permission: string; status: string }> | undefined) ?? []).filter((p) => p.status === 'granted').map((p) => p.permission))
      const missing = ['instagram_basic', 'instagram_content_publish'].filter((p) => perms && !granted.has(p))
      patch({ instagram: { ...(draft?.instagram ?? {}), user_id: id, username: username || draft?.instagram?.username || '', access_token: token, connected_at: new Date().toISOString() } })
      setIgCheck(missing.length
        ? { ok: false, text: `Found @${username || id}${name ? ` (${name})` : ''} but the token is missing ${missing.join(' and ')}. Regenerate it with those permissions ticked.` }
        : { ok: true, text: `Posts as @${username || id}${name ? ` (${name})` : ''}. Publish permission granted. Save changes to keep it.` })
    } catch (e) {
      setIgCheck({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally { setBusy(false) }
  }
  async function remove(id: string) {
    setDelBusy(true)
    try {
      await deleteBrand(id)
      setSelId(null); setConfirmDelete(false)
      await reload(); await brandCtx.reload()
      setStatus('Workspace deleted')
    } catch (e) { setStatus(String(e)) } finally { setDelBusy(false) }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'stretch' }}>
      <aside style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--ck-line)', padding: '20px 16px', minHeight: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ck-faint)' }}>Brands</div>
          <button className="hh-btn" onClick={addBrand} style={{ border: 'none', background: 'none', color: 'var(--ck-accent)', fontSize: 18, lineHeight: 1, padding: 0 }} title="New brand">+</button>
        </div>
        {brands.map((b) => (
          <button key={b.id} onClick={() => select(b.id)} className="hh-btn"
            style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', borderRadius: 8, padding: '9px 11px', marginBottom: 4, fontSize: 13.5,
              background: b.id === selId ? 'var(--hh-mushroom)' : 'transparent', color: b.id === selId ? '#2A211A' : 'var(--ck-ink)' }}>
            {b.name}{b.is_default && <span style={{ fontSize: 10, color: 'var(--ck-accent)', marginLeft: 6 }}>· default</span>}
          </button>
        ))}
        {brands.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--ck-muted)' }}>No brands yet.</div>}
      </aside>

      <section style={{ flex: 1, minWidth: 0, padding: '20px 40px 60px' }}>
        {!draft ? (
          <div style={{ fontSize: 14, color: 'var(--ck-muted)', paddingTop: 30 }}>Select or create a brand to edit.</div>
        ) : (
          <div style={{ maxWidth: 760 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} style={{ ...inp, fontSize: 18, fontWeight: 500, maxWidth: 360 }} />
              {!draft.is_default && <PillButton tone="ghost" onClick={makeDefault}>Set as default</PillButton>}
              {draft.is_default && <span style={{ fontSize: 12, color: 'var(--ck-accent)' }}>Default brand</span>}
            </div>

            <div style={{ fontSize: 12.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ck-accent)', margin: '26px 0 2px' }}>Workspace identity</div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 12 }}>
              <div>
                <label style={{ ...label, margin: '0 0 8px' }}>Accent colour</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="color" value={draft.accent_color || '#B5632F'} onChange={(e) => patch({ accent_color: e.target.value })} style={{ width: 38, height: 34, border: '1px solid var(--ck-line)', borderRadius: 8, background: 'none', padding: 2, cursor: 'pointer' }} />
                  <input value={draft.accent_color || ''} onChange={(e) => patch({ accent_color: e.target.value })} style={{ ...inp, width: 110 }} />
                </div>
              </div>
              <div>
                <label style={{ ...label, margin: '0 0 8px' }}>Headline font</label>
                <select value={draft.display_font} onChange={(e) => patch({ display_font: e.target.value })} style={{ ...inp, width: 180 }}>
                  <option value="poppins">Poppins (white-label)</option>
                  <option value="ivyora">Ivy Ora (Hue &amp; Heal)</option>
                  <option value="quando">Quando (Remedae)</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <label style={{ ...label, margin: '0 0 8px' }}>Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {draft.logo_url
                    ? <img src={draft.logo_url} alt="" style={{ height: 34, maxWidth: 90, objectFit: 'contain', background: 'var(--ck-ink)', borderRadius: 6, padding: 4 }} />
                    : <div style={{ height: 34, width: 60, borderRadius: 6, border: '1px dashed var(--hh-line)' }} />}
                  <label className="hh-btn" style={{ cursor: 'pointer', border: '1px solid var(--ck-line)', borderRadius: 8, padding: '9px 14px', fontSize: 12.5, color: 'var(--ck-ink)' }}>
                    {draft.logo_url ? 'Replace' : 'Upload'}
                    <input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                  </label>
                  {draft.logo_url && <button className="hh-btn" onClick={() => patch({ logo_url: '' })} style={{ background: 'none', border: 'none', color: 'var(--ck-accent)', fontSize: 12 }}>Remove</button>}
                </div>
                <input value={draft.logo_url || ''} onChange={(e) => patch({ logo_url: e.target.value })} placeholder="…or paste a logo URL" style={{ ...inp, marginTop: 8 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 18 }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <label style={{ ...label, margin: '0 0 8px' }}>Newsletter sender</label>
                <input value={draft.sender_email || ''} onChange={(e) => patch({ sender_email: e.target.value })} placeholder="Remedae <news@remedae.app>" style={inp} />
                <p style={hint}>Verified Resend address emails send from. Empty = the default sender.</p>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ ...label, margin: '0 0 8px' }}>Tagline</label>
                <input value={draft.tagline || ''} onChange={(e) => patch({ tagline: e.target.value })} placeholder="The world's healing knowledge. Now yours." style={inp} />
                <p style={hint}>Shown in the email footer.</p>
              </div>
              <div style={{ minWidth: 160 }}>
                <label style={{ ...label, margin: '0 0 8px' }}>Website</label>
                <input value={draft.website || ''} onChange={(e) => patch({ website: e.target.value })} placeholder="remedae.app" style={inp} />
                <p style={hint}>Shown in the email footer.</p>
              </div>
            </div>

            <div style={{ fontSize: 12.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ck-accent)', margin: '30px 0 2px' }}>Instagram · this workspace posts as</div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 12 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ ...label, margin: '0 0 8px' }}>Instagram account ID</label>
                <input value={draft.instagram?.user_id ?? ''} onChange={(e) => patch({ instagram: { ...(draft.instagram ?? {}), user_id: e.target.value.trim() } })} placeholder="17841400000000000" style={inp} />
                <p style={hint}>The numeric IG Business / Creator account ID (from Meta Business Suite or the Graph API explorer).</p>
              </div>
              <div style={{ flex: 2, minWidth: 260 }}>
                <label style={{ ...label, margin: '0 0 8px' }}>Long-lived access token</label>
                <input type="password" autoComplete="off" value={draft.instagram?.access_token ?? ''} onChange={(e) => patch({ instagram: { ...(draft.instagram ?? {}), access_token: e.target.value.trim(), connected_at: new Date().toISOString() } })} placeholder="EAAB…" style={inp} />
                <p style={hint}>Stored on this workspace only and never shown again in full. Either an Instagram Login token (IG…, from your Meta app's Instagram → API setup with Instagram login → Generate token: no Facebook Page needed) or a Facebook Login token (EAA…, Graph API Explorer with instagram_basic, instagram_content_publish, pages_show_list, extended in the Access Token Debugger). Both last 60 days.</p>
              </div>
              <div style={{ minWidth: 160 }}>
                <label style={{ ...label, margin: '0 0 8px' }}>Handle (optional)</label>
                <input value={draft.instagram?.username ?? ''} onChange={(e) => patch({ instagram: { ...(draft.instagram ?? {}), username: e.target.value.replace(/^@/, '').trim() } })} placeholder="remedae" style={inp} />
                <p style={hint}>{draft.instagram?.user_id && draft.instagram?.access_token ? '● Connected' : '○ Not connected: posting is disabled for this workspace'}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
              <PillButton tone="accent" onClick={connectInstagram} disabled={busy}>{draft.instagram?.access_token ? 'Reconnect Instagram' : 'Connect Instagram'}</PillButton>
              <PillButton onClick={checkInstagram} disabled={busy || !draft.instagram?.access_token}>Check connection</PillButton>
              {draft.instagram?.access_token && draft.instagram?.via === 'instagram_login' && (
                <PillButton onClick={renewInstagram} disabled={busy}>Renew token</PillButton>
              )}
              {igCheck && (
                <span style={{ fontSize: 12.5, lineHeight: 1.5, color: igCheck.ok ? 'var(--ck-accent)' : 'var(--ck-ink)', maxWidth: 640 }}>
                  {igCheck.ok ? '✓ ' : '✕ '}{igCheck.text}
                </span>
              )}
              {!igCheck && (
                <span style={hint}>
                  {draft.instagram?.expires_at
                    ? `Token valid until ${new Date(draft.instagram.expires_at).toLocaleDateString()}. Renew any time after 24h to add another 60 days.`
                    : 'Connect Instagram opens Instagram to approve this workspace (no Facebook Page needed). Or paste a token above and Check connection.'}
                </span>
              )}
            </div>

            <div style={{ fontSize: 12.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ck-accent)', margin: '30px 0 2px' }}>Verbal identity</div>
            <label style={label}>Tone of voice</label>
            <textarea rows={4} value={draft.tone_of_voice} onChange={(e) => patch({ tone_of_voice: e.target.value })} style={area} />
            <p style={hint}>How the brand sounds. Injected into the newsletter & caption writer.</p>
            <label style={label}>Writing guidelines</label>
            <textarea rows={4} value={draft.writing_guidelines} onChange={(e) => patch({ writing_guidelines: e.target.value })} style={area} />
            <p style={hint}>Structure, do's & don'ts, sign-off style.</p>

            <div style={{ fontSize: 12.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ck-accent)', margin: '30px 0 2px' }}>Visual identity — image generation</div>
            <label style={label}>Creative direction (master prompt)</label>
            <textarea rows={14} value={draft.image_master_prompt} onChange={(e) => patch({ image_master_prompt: e.target.value })} style={area} />
            <p style={hint}>Prepended to every image the studio generates for this brand.</p>
            <label style={label}>Negatives (things to avoid)</label>
            <textarea rows={4} value={draft.image_negatives} onChange={(e) => patch({ image_negatives: e.target.value })} style={area} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 28 }}>
              <PillButton onClick={save}>{busy ? 'Saving…' : 'Save changes'}</PillButton>
              {!draft.is_default && (
                <button className="hh-btn" onClick={() => setConfirmDelete(true)} style={{ background: 'none', border: '1px solid var(--ck-line)', borderRadius: 999, padding: '11px 22px', fontSize: 13, color: '#B23B2E', cursor: 'pointer' }}>
                  Delete workspace
                </button>
              )}
              {status && <span style={{ fontSize: 12.5, color: 'var(--ck-muted)' }}>{status}</span>}
            </div>

            <BrandMembersSection brandId={draft.id} />
          </div>
        )}
      </section>

      <ConfirmModal
        open={confirmDelete && !!draft}
        danger
        title={`Delete the ${draft?.name ?? ''} workspace?`}
        confirmLabel="Delete workspace"
        requireText={draft?.name}
        busy={delBusy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => draft && remove(draft.id)}
        body={
          <>
            This permanently deletes the entire <strong>{draft?.name}</strong> brand world and <strong>everything in it</strong> — its clients, proposals, invoices, social posts, newsletters, subscribers and members. This cannot be undone.
          </>
        }
      />
    </div>
  )
}

/* Per-brand members — invite people into this brand world. */
function BrandMembersSection({ brandId }: { brandId: string }) {
  const [members, setMembers] = useState<BrandMember[]>([])
  const [email, setEmail] = useState('')
  const [note, setNote] = useState<string | null>(null)

  async function reload() { try { setMembers(await listBrandMembers(brandId)) } catch { setMembers([]) } }
  useEffect(() => { reload() /* eslint-disable-next-line */ }, [brandId])

  async function invite() {
    setNote(null)
    try { await inviteBrandMember(brandId, email); setEmail(''); await reload(); setNote('Invited') }
    catch (e) { setNote(String(e)) }
  }

  return (
    <div style={{ borderTop: '1px solid var(--ck-line)', marginTop: 34, paddingTop: 22 }}>
      <div style={{ fontSize: 12.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ck-accent)', marginBottom: 4 }}>Brand members</div>
      <p style={hint}>People invited here can access this brand world. They still need product access (Team tab) to sign in.</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', margin: '14px 0 16px' }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@studio.com" style={{ ...inp, maxWidth: 280 }} onKeyDown={(e) => { if (e.key === 'Enter') invite() }} />
        <PillButton tone="ghost" onClick={invite}>Invite</PillButton>
        {note && <span style={{ fontSize: 12.5, color: 'var(--ck-muted)' }}>{note}</span>}
      </div>
      <div style={{ border: '1px solid var(--ck-line)', borderRadius: 10, overflow: 'hidden', maxWidth: 480 }}>
        {members.map((m) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--ck-line)' }}>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</div>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: m.role === 'owner' ? 'var(--ck-accent)' : 'var(--ck-faint)' }}>{m.role}</span>
            {m.role !== 'owner' && <ConfirmButton onConfirm={() => removeBrandMember(m.id).then(reload)} style={{ background: 'none', border: 'none', color: 'var(--ck-accent)', fontSize: 12 }}>Remove</ConfirmButton>}
          </div>
        ))}
        {members.length === 0 && <div style={{ padding: 14, fontSize: 12.5, color: 'var(--ck-muted)' }}>No members yet.</div>}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- Team */
function TeamPanel() {
  const auth = useAuth()
  const [members, setMembers] = useState<AppMember[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [gateActive, setGateActive] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [status, setStatus] = useState<string | null>(null)

  async function reload() {
    const m = await checkMembership(auth.email)
    setIsAdmin(m.role === 'admin'); setGateActive(m.gateActive)
    try { setMembers(await listMembers()) } catch { setMembers([]) }
  }
  useEffect(() => { reload().catch(() => {}) /* eslint-disable-next-line */ }, [auth.email])

  async function add() {
    setStatus(null)
    try { await addMember(email, role); setEmail(''); await reload(); setStatus('Member approved') }
    catch (e) { setStatus(String(e)) }
  }
  async function toggle(m: AppMember) { await setMemberRole(m.id, m.role === 'admin' ? 'member' : 'admin'); await reload() }
  async function remove(id: string) { await removeMember(id); await reload() }

  return (
    <section style={{ padding: '24px 40px 60px', maxWidth: 720 }}>
      {!gateActive && (
        <div style={{ background: 'var(--ck-surface)', border: '1px solid var(--ck-line)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--ck-muted)', marginBottom: 20 }}>
          The approval gate isn’t active yet — run migration&nbsp;0006 in Supabase to switch it on. Until then anyone with a magic link can enter.
        </div>
      )}
      <p style={{ fontSize: 14, color: 'var(--ck-muted)', margin: '4px 0 20px', lineHeight: 1.55 }}>
        Only approved emails can access the workspace. {isAdmin ? 'Add people below.' : 'Ask an admin to add people.'}
      </p>

      {isAdmin && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 22 }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@studio.com" style={{ ...inp, maxWidth: 300 }} onKeyDown={(e) => { if (e.key === 'Enter') add() }} />
          <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'member')} style={{ ...inp, width: 130 }}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <PillButton onClick={add}>Approve</PillButton>
          {status && <span style={{ fontSize: 12.5, color: 'var(--ck-muted)' }}>{status}</span>}
        </div>
      )}

      <div style={{ border: '1px solid var(--ck-line)', borderRadius: 12, overflow: 'hidden' }}>
        {members.map((m) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--ck-line)' }}>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</div>
            <span style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: m.role === 'admin' ? 'var(--ck-accent)' : 'var(--ck-faint)' }}>{m.role}</span>
            {isAdmin && auth.email?.toLowerCase() !== m.email.toLowerCase() && (
              <>
                <button className="hh-btn" onClick={() => toggle(m)} style={{ background: 'none', border: '1px solid var(--ck-line)', borderRadius: 6, padding: '3px 10px', fontSize: 11.5, color: 'var(--ck-muted)' }}>
                  Make {m.role === 'admin' ? 'member' : 'admin'}
                </button>
                <ConfirmButton onConfirm={() => remove(m.id)} style={{ background: 'none', border: 'none', color: 'var(--ck-accent)', fontSize: 12 }}>Remove</ConfirmButton>
              </>
            )}
            {auth.email?.toLowerCase() === m.email.toLowerCase() && <span style={{ fontSize: 11, color: 'var(--ck-faint)' }}>you</span>}
          </div>
        ))}
        {members.length === 0 && <div style={{ padding: '16px', fontSize: 13, color: 'var(--ck-muted)' }}>No members loaded.</div>}
      </div>
    </section>
  )
}


/* ------------------------------------------------------------ Knowledge */
/* Phase 9: structured company context for the ACTIVE workspace. Everything
   here is injected into every generator, so the copilot writes with the
   facts of the business. */
function KnowledgePanel() {
  const { current, reload } = useBrand()
  const [k, setK] = useState<Knowledge>({})
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => { setK((current?.knowledge as Knowledge) ?? {}) }, [current?.id])

  async function save() {
    if (!current) return
    setBusy(true); setStatus(null)
    try {
      await updateBrand(current.id, { knowledge: k as Record<string, string> })
      await reload()
      setStatus('Saved. Every generator now writes with this context.')
    } catch (e) { setStatus(String(e)) } finally { setBusy(false) }
  }

  return (
    <div style={{ padding: '28px 40px 80px', maxWidth: 780 }}>
      <p style={{ fontSize: 13.5, color: 'var(--ck-muted)', lineHeight: 1.6, maxWidth: '62ch' }}>
        What <strong>{current?.name ?? 'this workspace'}</strong> knows about itself. The copilot draws on these facts in journals,
        social, newsletters, proposals and client documents, and never invents beyond them. Leave anything blank; only filled
        sections are used.
      </p>
      {KNOWLEDGE_FIELDS.map((f) => (
        <div key={f.key}>
          <label style={label}>{f.label}</label>
          <textarea rows={3} value={k[f.key] ?? ''} onChange={(e) => setK((prev) => ({ ...prev, [f.key]: e.target.value }))} style={area} />
          <p style={hint}>{f.hint}</p>
        </div>
      ))}
      <div style={{ marginTop: 22, display: 'flex', gap: 12, alignItems: 'center' }}>
        <PillButton tone="accent" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save knowledge'}</PillButton>
        {status && <span style={{ fontSize: 12.5, color: 'var(--ck-muted)' }}>{status}</span>}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- Channel */
/* Link a Telegram chat to this workspace so the org reaches your phone: the
   morning deliverables and the Friday digests arrive there, and you can brief
   a role or approve its requests by replying. The link is per workspace, so a
   chat only ever sees the roles and material of the brand world it is bound
   to. Pairing is a one-time code: nothing is shared until the code is used. */
function ChannelPanel() {
  const { current } = useBrand()
  const [channel, setChannel] = useState<OrgChannel | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  // The studio bot is public, not a secret, so it ships as the default and the
  // env var stays available if the bot is ever replaced.
  const bot = (import.meta.env.VITE_TELEGRAM_BOT as string | undefined)?.replace(/^@/, '') || 'hueandheal_studio_bot'

  useEffect(() => {
    setChannel(null); setStatus(null)
    getChannel().then(setChannel).catch(() => {})
    listRoles().then(setRoles).catch(() => {})
  }, [current?.id])

  async function pair() {
    setBusy(true); setStatus(null)
    try { setChannel(await startPairing()) }
    catch (e) { setStatus(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  const linked = Boolean(channel?.chat_id)
  const code = channel?.pair_code

  return (
    <div style={{ padding: '28px 40px 60px', maxWidth: 720 }}>
      <span style={label}>Talk to your org</span>
      <p style={{ ...hint, marginTop: 0 }}>
        Link a Telegram chat to <strong>{current?.name ?? 'this workspace'}</strong> and your roles reach you where you
        already are: scheduled deliverables and Friday digests arrive as messages, and you can brief a role or approve
        its requests by replying. Each workspace links its own chat, so {current?.name ?? 'this workspace'} and your other
        brand worlds never share a thread.
      </p>

      {linked ? (
        <>
          <div style={{ border: '1px solid var(--ck-line)', borderRadius: 10, padding: '14px 16px', marginTop: 18, background: 'var(--ck-surface)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>Linked{channel?.chat_label ? ` to ${channel.chat_label}` : ''}</div>
            <p style={{ ...hint, marginTop: 4 }}>
              {roles.length ? `${roles.map((r) => r.name).join(', ')} answer in that chat.` : 'Hire a role and it will answer in that chat.'}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <PillButton onClick={() => { if (!channel) return; const next = !channel.push; void setPush(channel.id, next); setChannel({ ...channel, push: next }) }}>
                {channel?.push ? 'Stop sending reports there' : 'Send reports there'}
              </PillButton>
              <ConfirmButton
                onConfirm={async () => { if (channel) { await unlinkChannel(channel.id); setChannel(null) } }}
                confirmLabel="Unlink this chat?"
                style={{ background: 'none', border: '1px solid var(--ck-line)', borderRadius: 999, padding: '6px 14px', fontSize: 13, color: 'var(--ck-muted)', cursor: 'pointer', fontFamily: 'var(--ck-font)' }}
              >
                Unlink
              </ConfirmButton>
            </div>
          </div>
          <span style={label}>In the chat</span>
          <pre style={{ ...area, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, monospace', fontSize: 12.5, lineHeight: 1.7 }}>
{`@cmo plan september        brief a role by name
/roles                     the team and their cadence
/inbox                     what is waiting on your call
/approve a1b2              approve (or /decline)
/digest                    the latest weekly digests
/workspace <name>          point this chat at another workspace`}
          </pre>
        </>
      ) : (
        <>
          <span style={label}>Pair a chat</span>
          {code ? (
            <div style={{ border: '1px solid var(--ck-line)', borderRadius: 10, padding: '16px 18px', background: 'var(--ck-surface)' }}>
              <div style={{ fontSize: 26, letterSpacing: '0.18em', fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>{code}</div>
              <p style={{ ...hint, marginTop: 8 }}>
                Open {bot ? <>the bot <strong>@{bot}</strong></> : 'your studio bot'} in Telegram and send:{' '}
                <strong>/start {code}</strong>
              </p>
              <p style={{ ...hint, marginTop: 6 }}>
                The code works once and only binds that chat to {current?.name ?? 'this workspace'}. Nothing is sent
                until it is used.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {bot && <PillButton onClick={() => window.open(`https://t.me/${bot}?start=${code}`, '_blank', 'noopener')}>Open Telegram</PillButton>}
                <PillButton onClick={() => void pair()} disabled={busy}>New code</PillButton>
                <PillButton onClick={() => { void getChannel().then(setChannel); setStatus('Checked.') }}>I have sent it</PillButton>
              </div>
            </div>
          ) : (
            <PillButton onClick={() => void pair()} disabled={busy}>{busy ? 'Generating…' : 'Generate pairing code'}</PillButton>
          )}
        </>
      )}
      {status && <p style={{ ...hint, marginTop: 12 }}>{status}</p>}
    </div>
  )
}

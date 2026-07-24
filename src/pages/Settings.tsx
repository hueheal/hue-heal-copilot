import { useEffect, useState } from 'react'
import PageHeader, { PillButton } from '../components/PageHeader'
import ConfirmButton from '../components/ConfirmButton'
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
import {
  type AppMember,
  checkMembership,
  listMembers,
  addMember,
  setMemberRole,
  removeMember,
} from '../lib/members'

const label: React.CSSProperties = { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', margin: '20px 0 8px', display: 'block' }
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 8, padding: '10px 12px', fontSize: 13.5, fontFamily: 'var(--font-sans)' }
const area: React.CSSProperties = { ...inp, lineHeight: 1.55, resize: 'vertical' }
const hint: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.5 }

export default function Settings() {
  const [tab, setTab] = useState<'brands' | 'team'>('brands')

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Brands & Team"
        subtitle="Manage your brand worlds (voice + creative direction) and who's allowed into the studio workspace."
      />
      <div style={{ display: 'flex', gap: 4, padding: '14px 40px 0', borderBottom: '1px solid var(--hh-line)' }}>
        {(['brands', 'team'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="hh-btn"
            style={{
              border: 'none', background: 'none', padding: '8px 14px 14px', fontSize: 14, textTransform: 'capitalize',
              color: tab === t ? 'var(--text-strong)' : 'var(--text-muted)',
              borderBottom: tab === t ? '2px solid var(--hh-copper)' : '2px solid transparent', marginBottom: -1,
            }}
          >
            {t === 'brands' ? 'Brand worlds' : 'Team'}
          </button>
        ))}
      </div>
      {tab === 'brands' ? <BrandsPanel /> : <TeamPanel />}
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

  async function reload(pick?: string) {
    const list = await listBrands()
    setBrands(list)
    const target = pick ?? selId ?? list[0]?.id ?? null
    setSelId(target)
    setDraft(list.find((b) => b.id === target) ?? null)
  }
  useEffect(() => { reload().catch(() => setStatus('Could not load brands')) /* eslint-disable-next-line */ }, [])

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
  async function remove(id: string) { await deleteBrand(id); setSelId(null); await reload(); setStatus('Brand deleted') }

  return (
    <div style={{ display: 'flex', alignItems: 'stretch' }}>
      <aside style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--hh-line)', padding: '20px 16px', minHeight: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Brands</div>
          <button className="hh-btn" onClick={addBrand} style={{ border: 'none', background: 'none', color: 'var(--hh-copper)', fontSize: 18, lineHeight: 1, padding: 0 }} title="New brand">+</button>
        </div>
        {brands.map((b) => (
          <button key={b.id} onClick={() => select(b.id)} className="hh-btn"
            style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', borderRadius: 8, padding: '9px 11px', marginBottom: 4, fontSize: 13.5,
              background: b.id === selId ? 'var(--hh-mushroom)' : 'transparent', color: b.id === selId ? '#2A211A' : 'var(--text-strong)' }}>
            {b.name}{b.is_default && <span style={{ fontSize: 10, color: 'var(--hh-copper)', marginLeft: 6 }}>· default</span>}
          </button>
        ))}
        {brands.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No brands yet.</div>}
      </aside>

      <section style={{ flex: 1, minWidth: 0, padding: '20px 40px 60px' }}>
        {!draft ? (
          <div style={{ fontSize: 14, color: 'var(--text-muted)', paddingTop: 30 }}>Select or create a brand to edit.</div>
        ) : (
          <div style={{ maxWidth: 760 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} style={{ ...inp, fontSize: 18, fontWeight: 500, maxWidth: 360 }} />
              {!draft.is_default && <PillButton tone="ghost" onClick={makeDefault}>Set as default</PillButton>}
              {draft.is_default && <span style={{ fontSize: 12, color: 'var(--hh-copper)' }}>Default brand</span>}
            </div>

            <div style={{ fontSize: 12.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--hh-copper)', margin: '26px 0 2px' }}>Workspace identity</div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 12 }}>
              <div>
                <label style={{ ...label, margin: '0 0 8px' }}>Accent colour</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="color" value={draft.accent_color || '#B5632F'} onChange={(e) => patch({ accent_color: e.target.value })} style={{ width: 38, height: 34, border: '1px solid var(--hh-line)', borderRadius: 8, background: 'none', padding: 2, cursor: 'pointer' }} />
                  <input value={draft.accent_color || ''} onChange={(e) => patch({ accent_color: e.target.value })} style={{ ...inp, width: 110 }} />
                </div>
              </div>
              <div>
                <label style={{ ...label, margin: '0 0 8px' }}>Headline font</label>
                <select value={draft.display_font} onChange={(e) => patch({ display_font: e.target.value })} style={{ ...inp, width: 180 }}>
                  <option value="poppins">Poppins (white-label)</option>
                  <option value="ivyora">Ivy Ora (Hue &amp; Heal)</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <label style={{ ...label, margin: '0 0 8px' }}>Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {draft.logo_url
                    ? <img src={draft.logo_url} alt="" style={{ height: 34, maxWidth: 90, objectFit: 'contain', background: 'var(--hh-anthracite)', borderRadius: 6, padding: 4 }} />
                    : <div style={{ height: 34, width: 60, borderRadius: 6, border: '1px dashed var(--hh-line)' }} />}
                  <label className="hh-btn" style={{ cursor: 'pointer', border: '1px solid var(--hh-line)', borderRadius: 8, padding: '9px 14px', fontSize: 12.5, color: 'var(--text-strong)' }}>
                    {draft.logo_url ? 'Replace' : 'Upload'}
                    <input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                  </label>
                  {draft.logo_url && <button className="hh-btn" onClick={() => patch({ logo_url: '' })} style={{ background: 'none', border: 'none', color: 'var(--hh-ember)', fontSize: 12 }}>Remove</button>}
                </div>
                <input value={draft.logo_url || ''} onChange={(e) => patch({ logo_url: e.target.value })} placeholder="…or paste a logo URL" style={{ ...inp, marginTop: 8 }} />
              </div>
            </div>

            <div style={{ fontSize: 12.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--hh-copper)', margin: '30px 0 2px' }}>Verbal identity</div>
            <label style={label}>Tone of voice</label>
            <textarea rows={4} value={draft.tone_of_voice} onChange={(e) => patch({ tone_of_voice: e.target.value })} style={area} />
            <p style={hint}>How the brand sounds. Injected into the newsletter & caption writer.</p>
            <label style={label}>Writing guidelines</label>
            <textarea rows={4} value={draft.writing_guidelines} onChange={(e) => patch({ writing_guidelines: e.target.value })} style={area} />
            <p style={hint}>Structure, do's & don'ts, sign-off style.</p>

            <div style={{ fontSize: 12.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--hh-copper)', margin: '30px 0 2px' }}>Visual identity — image generation</div>
            <label style={label}>Creative direction (master prompt)</label>
            <textarea rows={14} value={draft.image_master_prompt} onChange={(e) => patch({ image_master_prompt: e.target.value })} style={area} />
            <p style={hint}>Prepended to every image the studio generates for this brand.</p>
            <label style={label}>Negatives (things to avoid)</label>
            <textarea rows={4} value={draft.image_negatives} onChange={(e) => patch({ image_negatives: e.target.value })} style={area} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 28 }}>
              <PillButton onClick={save}>{busy ? 'Saving…' : 'Save changes'}</PillButton>
              {!draft.is_default && (
                <ConfirmButton onConfirm={() => remove(draft.id)} style={{ background: 'none', border: '1px solid var(--hh-line)', borderRadius: 999, padding: '11px 22px', fontSize: 13, color: 'var(--text-muted)' }}>
                  Delete brand
                </ConfirmButton>
              )}
              {status && <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{status}</span>}
            </div>

            <BrandMembersSection brandId={draft.id} />
          </div>
        )}
      </section>
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
    <div style={{ borderTop: '1px solid var(--hh-line)', marginTop: 34, paddingTop: 22 }}>
      <div style={{ fontSize: 12.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--hh-copper)', marginBottom: 4 }}>Brand members</div>
      <p style={hint}>People invited here can access this brand world. They still need product access (Team tab) to sign in.</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', margin: '14px 0 16px' }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@studio.com" style={{ ...inp, maxWidth: 280 }} onKeyDown={(e) => { if (e.key === 'Enter') invite() }} />
        <PillButton tone="ghost" onClick={invite}>Invite</PillButton>
        {note && <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{note}</span>}
      </div>
      <div style={{ border: '1px solid var(--hh-line)', borderRadius: 10, overflow: 'hidden', maxWidth: 480 }}>
        {members.map((m) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--hh-line)' }}>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</div>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: m.role === 'owner' ? 'var(--hh-copper)' : 'var(--text-faint)' }}>{m.role}</span>
            {m.role !== 'owner' && <ConfirmButton onConfirm={() => removeBrandMember(m.id).then(reload)} style={{ background: 'none', border: 'none', color: 'var(--hh-ember)', fontSize: 12 }}>Remove</ConfirmButton>}
          </div>
        ))}
        {members.length === 0 && <div style={{ padding: 14, fontSize: 12.5, color: 'var(--text-muted)' }}>No members yet.</div>}
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
        <div style={{ background: 'var(--hh-lotus)', border: '1px solid var(--hh-line)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          The approval gate isn’t active yet — run migration&nbsp;0006 in Supabase to switch it on. Until then anyone with a magic link can enter.
        </div>
      )}
      <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 20px', lineHeight: 1.55 }}>
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
          {status && <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{status}</span>}
        </div>
      )}

      <div style={{ border: '1px solid var(--hh-line)', borderRadius: 12, overflow: 'hidden' }}>
        {members.map((m) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--hh-line)' }}>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</div>
            <span style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: m.role === 'admin' ? 'var(--hh-copper)' : 'var(--text-faint)' }}>{m.role}</span>
            {isAdmin && auth.email?.toLowerCase() !== m.email.toLowerCase() && (
              <>
                <button className="hh-btn" onClick={() => toggle(m)} style={{ background: 'none', border: '1px solid var(--hh-line)', borderRadius: 6, padding: '3px 10px', fontSize: 11.5, color: 'var(--text-muted)' }}>
                  Make {m.role === 'admin' ? 'member' : 'admin'}
                </button>
                <ConfirmButton onConfirm={() => remove(m.id)} style={{ background: 'none', border: 'none', color: 'var(--hh-ember)', fontSize: 12 }}>Remove</ConfirmButton>
              </>
            )}
            {auth.email?.toLowerCase() === m.email.toLowerCase() && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>you</span>}
          </div>
        ))}
        {members.length === 0 && <div style={{ padding: '16px', fontSize: 13, color: 'var(--text-muted)' }}>No members loaded.</div>}
      </div>
    </section>
  )
}

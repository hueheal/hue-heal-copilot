import { useEffect, useState } from 'react'
import PageHeader, { PillButton } from '../components/PageHeader'
import ConfirmButton from '../components/ConfirmButton'
import { useAuth } from '../lib/auth'
import {
  type Client,
  STAGES,
  listClients,
  addClient,
  updateClient,
  deleteClient,
  seedSampleData,
  gbpCompact,
} from '../lib/studioOps'
import type { ClientStage } from '../lib/database.types'

const STAGE_KEYS = STAGES.map((s) => s.key)

export default function Clients() {
  const auth = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', sector: '', value: '', note: '' })
  const [err, setErr] = useState<string | null>(null)

  const gated = auth.mode === 'connected' && !auth.session
  const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

  async function load() {
    if (gated) {
      setClients([])
      return
    }
    try {
      await seedSampleData()
    } catch {
      /* not signed in yet, or seed race — ignore */
    }
    setClients(await listClients())
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.session, auth.mode])

  async function submitClient() {
    if (!form.name.trim()) return
    const value = parseInt(form.value.replace(/[^0-9]/g, ''), 10)
    try {
      await addClient({
        name: form.name.trim(),
        sector: form.sector.trim(),
        stage: 'lead',
        value_gbp: Number.isFinite(value) && value > 0 ? value : null,
        note: form.note.trim(),
      })
      setForm({ name: '', sector: '', value: '', note: '' })
      setAdding(false)
      setErr(null)
      setClients(await listClients())
    } catch (e) {
      setErr(`Couldn’t add client: ${msg(e)}`)
    }
  }

  async function move(c: Client, dir: -1 | 1) {
    const idx = STAGE_KEYS.indexOf(c.stage)
    const next = STAGE_KEYS[idx + dir]
    if (!next) return
    try {
      await updateClient(c.id, { stage: next as ClientStage })
      setErr(null)
      setClients(await listClients())
    } catch (e) {
      setErr(`Couldn’t move client: ${msg(e)}`)
    }
  }

  async function remove(id: string) {
    try {
      await deleteClient(id)
      setErr(null)
      setClients(await listClients())
    } catch (e) {
      setErr(`Couldn’t remove client: ${msg(e)}`)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Clients"
        subtitle="Your book of work across hospitality, F&B, health & fitness and education — from first lead to delivery."
        action={<PillButton tone="accent" onClick={() => setAdding((v) => !v)}>{adding ? 'Close' : '＋ Add client'}</PillButton>}
      />

      <div style={{ padding: '30px 40px' }}>
        {gated && (
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Sign in on the <strong>Social Copilot</strong> page to load your clients.
          </p>
        )}

        {err && (
          <div style={{ background: '#F6E7DD', border: '1px solid var(--hh-copper)', color: 'var(--hh-terracotta)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13.5 }}>
            {err}
          </div>
        )}

        {adding && (
          <div style={{ background: 'var(--hh-bone)', border: '1px solid var(--hh-line-card)', borderRadius: 14, padding: 20, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {([
              ['name', 'Name', 'e.g. Wild Botanic'],
              ['sector', 'Sector', 'e.g. Hospitality'],
              ['value', 'Value £', '38000'],
              ['note', 'Note', 'Intro call Thursday'],
            ] as const).map(([key, label, ph]) => (
              <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: key === 'note' ? '2 1 200px' : '1 1 120px' }}>
                <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>{label}</span>
                <input
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={ph}
                  style={{ border: '1px solid var(--hh-line)', background: 'var(--hh-lotus)', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'var(--font-sans)' }}
                />
              </label>
            ))}
            <PillButton tone="ink" onClick={submitClient}>Add</PillButton>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'start' }}>
          {STAGES.map((col, colIdx) => {
            const list = clients.filter((c) => c.stage === col.key)
            return (
              <div key={col.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-faint)', padding: '0 4px 14px' }}>
                  {col.label}
                  <span style={{ fontWeight: 500 }}>· {list.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {list.map((c) => (
                    <div key={c.id} className="hh-card-hover" style={{ background: 'var(--hh-bone)', border: '1px solid var(--hh-line-card)', borderRadius: 14, padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{c.name}</div>
                        <div className="hh-serif" style={{ fontSize: 16, color: 'var(--hh-copper)' }}>{gbpCompact(c.value_gbp)}</div>
                      </div>
                      {c.sector && (
                        <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)', marginTop: 6 }}>{c.sector}</div>
                      )}
                      {c.note && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>{c.note}</div>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, opacity: 0.9 }}>
                        <button className="hh-btn" onClick={() => move(c, -1)} disabled={colIdx === 0} title="Move back"
                          style={{ background: 'none', border: '1px solid var(--hh-line)', borderRadius: 6, width: 24, height: 22, color: colIdx === 0 ? 'var(--hh-line)' : 'var(--text-faint)' }}>◀</button>
                        <button className="hh-btn" onClick={() => move(c, 1)} disabled={colIdx === STAGES.length - 1} title="Move forward"
                          style={{ background: 'none', border: '1px solid var(--hh-line)', borderRadius: 6, width: 24, height: 22, color: colIdx === STAGES.length - 1 ? 'var(--hh-line)' : 'var(--text-faint)' }}>▶</button>
                        <ConfirmButton onConfirm={() => remove(c.id)} title="Remove client"
                          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 16, lineHeight: 1 }}>×</ConfirmButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

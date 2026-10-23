import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowsClockwise, ArrowSquareOut, Globe, HardDrives, GitBranch, EnvelopeSimple, Database, Plus, X } from '@phosphor-icons/react'
import { useLife } from './V2App'
import { addConnection, checkPortfolio, listClients, listConnections, portfolioAct, removeConnection, live, type ClientRow, type Connection } from './life'

/* Portfolio: everything Hue & Heal runs, and how it is doing. The studio, the
   ventures and the clients, each with its live website, hosting, code, email
   and data, checked twice a day by the portfolio connector and on demand. */

const ICON: Record<string, typeof Globe> = { website: Globe, hosting: HardDrives, repo: GitBranch, email: EnvelopeSimple, database: Database }
const RANK: Record<Connection['status'], number> = { down: 0, warn: 1, needs_key: 2, unchecked: 3, ok: 4 }
const WORD: Record<Connection['status'], string> = { ok: 'Healthy', warn: 'Needs a look', down: 'Down', needs_key: 'Not fully connected', unchecked: 'Not checked yet' }
const KEY_HELP: Record<string, string> = {
  NETLIFY_TOKEN: 'bash scripts/connect-provider.sh netlify',
  VERCEL_TOKEN: 'bash scripts/connect-provider.sh vercel',
  GITHUB_TOKEN: 'bash scripts/connect-provider.sh github',
  RESEND_API_KEY_REMEDAE: 'bash scripts/connect-remedae-email.sh',
}

const ago = (iso: string | null) => {
  if (!iso) return ''
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`
}
const worst = (cs: Connection[]) => cs.reduce<Connection['status']>((w, c) => (RANK[c.status] < RANK[w] ? c.status : w), 'ok')
const linkOf = (c: Connection) => {
  if (c.provider === 'web') return c.config.url
  if (c.provider === 'github') return `https://github.com/${c.config.repo}`
  if (c.provider === 'netlify') return c.config.name ? `https://app.netlify.com/sites/${c.config.name}/deploys` : ''
  if (c.provider === 'vercel') return c.config.name ? `https://vercel.com/dashboard` : ''
  return ''
}

export default function Portfolio() {
  const { brands, inLens, lens } = useLife()
  const [conns, setConns] = useState<Connection[] | null>(null)
  const [clients, setClients] = useState<ClientRow[]>([])
  const [checking, setChecking] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const load = useCallback(() => Promise.all([listConnections(), listClients()]).then(([c, cl]) => { setConns(c); setClients(cl) }), [])
  useEffect(() => { void load() }, [load])

  const check = async (scope: { brandId?: string; clientId?: string } = {}, key = 'all') => {
    setChecking(key)
    const r = await checkPortfolio(scope)
    setChecking(null)
    if (r.error) setNote(r.error)
    await load()
  }
  const rebuild = async (c: Connection) => {
    const r = await portfolioAct(c.id, 'rebuild')
    setNote(r.error ?? r.note ?? 'Rebuilding.')
  }

  const all = conns ?? []
  const groups = useMemo(() => {
    const studio = brands.filter((b) => /hue\s*&\s*heal/i.test(b.name))
    const ventures = brands.filter((b) => !/hue\s*&\s*heal/i.test(b.name))
    return { studio, ventures }
  }, [brands])
  const shown = all.filter((c) => (c.brand_id ? inLens(c.brand_id) : lens === 'all'))
  const attention = shown.filter((c) => c.status === 'down' || c.status === 'warn').length
  const lastChecked = all.map((c) => c.checked_at).filter(Boolean).sort().pop() ?? null

  return (
    <div className="v2-col v2-wide v2-portfolio">
      <div className="v2-page-head">
        <h1 className="v2-h-page">Portfolio</h1>
        <div className="v2-radar-status">
          <span className="v2-quiet">{lastChecked ? `Checked ${ago(lastChecked)}` : 'Not checked yet'}</span>
          <button className="v2-chip" disabled={!!checking} onClick={() => void check()}><ArrowsClockwise size={15} className={checking === 'all' ? 'v2-spin' : undefined} />{checking === 'all' ? 'Checking' : 'Check now'}</button>
        </div>
      </div>
      <p className="v2-radar-sub">
        Everything Hue & Heal runs, checked twice a day.
        {conns && <> {attention ? `${attention} ${attention === 1 ? 'thing needs' : 'things need'} a look.` : 'Nothing needs you right now.'}</>}
      </p>
      {note && <p className="v2-quiet" role="status">{note}</p>}

      {conns === null ? <div className="v2-stack">{[0, 1].map((i) => <div key={i} className="v2-skeleton" style={{ height: 220 }} />)}</div> : (
        <>
          {[...groups.studio, ...groups.ventures].filter((b) => inLens(b.id)).length > 0 && (
            <section className="v2-section">
              <div className="v2-section-head"><h2 className="v2-label">The studio and its ventures</h2></div>
              <div className="v2-port-grid">
                {[...groups.studio, ...groups.ventures].filter((b) => inLens(b.id)).map((b) => (
                  <PortCard key={b.id} title={b.name} color={b.accent_color} conns={all.filter((c) => c.brand_id === b.id)} busy={checking === b.id}
                    onCheck={() => void check({ brandId: b.id }, b.id)} onRebuild={rebuild} onChanged={load} scope={{ brand_id: b.id }} />
                ))}
              </div>
            </section>
          )}
          {lens === 'all' && (
            <section className="v2-section">
              <div className="v2-section-head"><h2 className="v2-label">Clients</h2></div>
              {clients.length ? (
                <div className="v2-port-grid">
                  {clients.map((cl) => (
                    <PortCard key={cl.id} title={cl.name} subtitle={[cl.sector, cl.stage].filter(Boolean).join(' · ')} conns={all.filter((c) => c.client_id === cl.id)} busy={checking === cl.id}
                      onCheck={() => void check({ clientId: cl.id }, cl.id)} onRebuild={rebuild} onChanged={load} scope={{ client_id: cl.id }} />
                  ))}
                </div>
              ) : <p className="v2-quiet">No clients yet. Clients added in the studio appear here, ready for their sites to be connected.</p>}
            </section>
          )}
        </>
      )}
    </div>
  )
}

function PortCard({ title, subtitle, color, conns, busy, onCheck, onRebuild, onChanged, scope }: {
  title: string; subtitle?: string; color?: string | null; conns: Connection[]; busy: boolean
  onCheck: () => void; onRebuild: (c: Connection) => Promise<void>; onChanged: () => Promise<unknown>; scope: { brand_id?: string; client_id?: string }
}) {
  const [adding, setAdding] = useState(false)
  const state = conns.length ? worst(conns) : 'unchecked'
  const site = conns.find((c) => c.kind === 'website')
  const missingKeys = [...new Set(conns.filter((c) => c.status === 'needs_key' && KEY_HELP[c.secret_name]).map((c) => c.secret_name))]
  return (
    <article className="v2-port" style={{ ['--c' as never]: color || 'var(--accent)' }}>
      <header className="v2-port-head">
        <span className="v2-port-mark" aria-hidden>{title.replace(/&/g, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>
        <div>
          <h3>{title}</h3>
          <span className="v2-meta">{subtitle || (site ? String(site.config.url).replace(/^https?:\/\//, '') : 'No website connected')}</span>
        </div>
        <span className="v2-port-state" data-s={state}>{conns.length ? WORD[state] : 'Nothing connected'}</span>
      </header>

      <ul className="v2-port-rows">
        {conns.map((c) => {
          const Icon = ICON[c.kind] ?? Globe
          const href = linkOf(c)
          return (
            <li key={c.id} data-s={c.status}>
              <i aria-hidden />
              <Icon size={16} aria-hidden />
              <span className="v2-port-label">{c.label}</span>
              <span className="v2-port-sum">{c.summary || 'Not checked yet'}</span>
              <span className="v2-port-acts">
                {c.provider === 'netlify' && c.status !== 'needs_key' && <button className="v2-link" onClick={() => void onRebuild(c)}>Rebuild</button>}
                {href && <a className="v2-link" href={href} target="_blank" rel="noreferrer" aria-label={`Open ${c.label}`}><ArrowSquareOut size={14} /></a>}
                <button className="v2-x" aria-label={`Remove ${c.label}`} onClick={async () => { if (window.confirm(`Stop watching ${title}'s ${c.label.toLowerCase()}?`)) { await removeConnection(c.id); await onChanged() } }}><X size={11} /></button>
              </span>
            </li>
          )
        })}
      </ul>

      {missingKeys.length > 0 && (
        <p className="v2-fine v2-port-keys">To finish connecting, run on your Mac: {missingKeys.map((k) => <code key={k}>{KEY_HELP[k]}</code>)}</p>
      )}

      {adding ? <AddConnection scope={scope} count={conns.length} onDone={async () => { setAdding(false); await onChanged() }} onCancel={() => setAdding(false)} /> : (
        <div className="v2-chips v2-port-foot">
          <button className="v2-chip" disabled={busy || !conns.length} onClick={onCheck}><ArrowsClockwise size={14} className={busy ? 'v2-spin' : undefined} />{busy ? 'Checking' : 'Check'}</button>
          <button className="v2-chip" onClick={() => setAdding(true)}><Plus size={14} weight="bold" />Connect</button>
        </div>
      )}
    </article>
  )
}

const KINDS: { kind: Connection['kind']; label: string; providers: { p: string; label: string; fields: { key: string; label: string; placeholder: string }[]; secret: string }[] }[] = [
  { kind: 'website', label: 'Website', providers: [{ p: 'web', label: 'Any website', fields: [{ key: 'url', label: 'Address', placeholder: 'https://…' }], secret: '' }] },
  { kind: 'hosting', label: 'Hosting', providers: [
    { p: 'netlify', label: 'Netlify', fields: [{ key: 'site_id', label: 'Site ID', placeholder: 'Netlify, Site configuration, Site ID' }, { key: 'name', label: 'Site name', placeholder: 'e.g. mossislandgame' }], secret: 'NETLIFY_TOKEN' },
    { p: 'vercel', label: 'Vercel', fields: [{ key: 'project_id', label: 'Project ID', placeholder: 'prj_…' }, { key: 'team_id', label: 'Team ID', placeholder: 'team_…' }, { key: 'name', label: 'Project name', placeholder: '' }], secret: 'VERCEL_TOKEN' },
  ] },
  { kind: 'repo', label: 'Code', providers: [{ p: 'github', label: 'GitHub', fields: [{ key: 'repo', label: 'Repository', placeholder: 'owner/name' }, { key: 'branch', label: 'Branch', placeholder: 'main' }], secret: 'GITHUB_TOKEN' }] },
]

function AddConnection({ scope, count, onDone, onCancel }: { scope: { brand_id?: string; client_id?: string }; count: number; onDone: () => Promise<void>; onCancel: () => void }) {
  const [ki, setKi] = useState(0)
  const [pi, setPi] = useState(0)
  const [vals, setVals] = useState<Record<string, string>>({})
  const [err, setErr] = useState<string | null>(null)
  const k = KINDS[ki], p = k.providers[Math.min(pi, k.providers.length - 1)]
  const save = async () => {
    const config = Object.fromEntries(p.fields.map((f) => [f.key, (vals[f.key] ?? '').trim()]).filter(([, v]) => v))
    if (!config[p.fields[0].key]) { setErr(`Add the ${p.fields[0].label.toLowerCase()}.`); return }
    if (p.p === 'web' && !/^https?:\/\//.test(config.url)) config.url = `https://${config.url}`
    const r = await addConnection({ ...scope, label: k.label, kind: k.kind, provider: p.p, config, secret_name: p.secret, position: count })
    if (r.error) { setErr(r.error); return }
    if (r.id) await checkPortfolio({ id: r.id })
    await onDone()
  }
  return (
    <div className="v2-port-add">
      <div className="v2-chips">
        {KINDS.map((x, i) => <button key={x.kind} className="v2-chip" data-primary={i === ki ? '1' : undefined} onClick={() => { setKi(i); setPi(0); setVals({}) }}>{x.label}</button>)}
      </div>
      {k.providers.length > 1 && (
        <div className="v2-chips">{k.providers.map((x, i) => <button key={x.p} className="v2-chip" data-primary={i === pi ? '1' : undefined} onClick={() => { setPi(i); setVals({}) }}>{x.label}</button>)}</div>
      )}
      {p.fields.map((f) => (
        <label key={f.key} className="v2-port-field"><span>{f.label}</span>
          <input name={f.key} autoComplete="off" spellCheck={false} value={vals[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />
        </label>
      ))}
      {err && <p className="v2-fine" role="alert">{err}</p>}
      <div className="v2-chips">
        <button className="v2-chip" data-primary="1" onClick={() => void save()}>Connect</button>
        <button className="v2-chip" onClick={onCancel}>Cancel</button>
      </div>
      {!live && <p className="v2-fine">Sample mode: sign in to connect.</p>}
    </div>
  )
}

import { useMemo, useState } from 'react'

/* ============================================================
   Batches. Content batches the seats produce (newsletter, socials,
   journal anchors) live as files under /batches in the repo; this
   page makes them readable in the studio. Markdown renders as
   plain reading text, newsletter HTML renders in a sandboxed
   frame exactly as an inbox would lay it out.
   ============================================================ */

const RAW = import.meta.glob('../../batches/**/*.{md,html}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

interface BatchFile {
  path: string
  name: string
  content: string
}
interface Batch {
  key: string
  files: BatchFile[]
}

function collect(): Batch[] {
  const byBatch = new Map<string, BatchFile[]>()
  for (const [path, content] of Object.entries(RAW)) {
    const m = path.match(/batches\/([^/]+)\/(.+)$/)
    if (!m) continue
    const list = byBatch.get(m[1]) ?? []
    list.push({ path, name: m[2], content })
    byBatch.set(m[1], list)
  }
  const order = (n: string) =>
    n === 'README.md' ? 0 : n.endsWith('.html') ? 1 : n.startsWith('social/') ? 3 : 2
  return [...byBatch.entries()]
    .map(([key, files]) => ({ key, files: files.sort((a, b) => order(a.name) - order(b.name) || a.name.localeCompare(b.name)) }))
    .sort((a, b) => b.key.localeCompare(a.key))
}

export default function Batches() {
  const batches = useMemo(collect, [])
  const [openKey, setOpenKey] = useState(batches[0]?.key)
  const [openFile, setOpenFile] = useState<string | undefined>(batches[0]?.files[0]?.name)
  const batch = batches.find((b) => b.key === openKey) ?? batches[0]
  const file = batch?.files.find((f) => f.name === openFile) ?? batch?.files[0]

  if (!batches.length) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--ck-text-2)' }}>
        No batches yet. When the seats produce one, it appears here.
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(220px, 280px) minmax(0, 1fr)', alignItems: 'start', padding: '8px 0 48px' }}>
      <aside style={{ display: 'grid', gap: 16 }}>
        {batches.map((b) => (
          <div key={b.key} style={{ border: '1px solid var(--ck-border)', borderRadius: 14, background: 'var(--ck-surface)', overflow: 'hidden' }}>
            <button
              onClick={() => {
                setOpenKey(b.key)
                setOpenFile(b.files[0]?.name)
              }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px', background: 'transparent', border: 0, cursor: 'pointer', fontWeight: 600, color: 'var(--ck-text)' }}
            >
              {b.key}
            </button>
            {b.key === batch?.key && (
              <div style={{ borderTop: '1px solid var(--ck-border)', padding: 6 }}>
                {b.files.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => setOpenFile(f.name)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '7px 10px',
                      borderRadius: 8,
                      border: 0,
                      cursor: 'pointer',
                      fontSize: 13,
                      background: f.name === file?.name ? 'color-mix(in srgb, var(--ck-accent) 14%, transparent)' : 'transparent',
                      color: f.name === file?.name ? 'var(--ck-text)' : 'var(--ck-text-2)',
                    }}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </aside>

      <section style={{ border: '1px solid var(--ck-border)', borderRadius: 14, background: 'var(--ck-surface)', minHeight: 480, overflow: 'hidden' }}>
        {file?.name.endsWith('.html') ? (
          <iframe
            title={file.name}
            sandbox=""
            srcDoc={file.content}
            style={{ width: '100%', height: 'min(1400px, 80vh)', border: 0, background: '#f7f4ea' }}
          />
        ) : (
          <article style={{ padding: '20px 24px', whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.65, color: 'var(--ck-text)', overflowX: 'auto' }}>
            {file?.content}
          </article>
        )}
      </section>
    </div>
  )
}

// ============================================================================
// The game's own quest cards, for Moss Island posts.
//
// Moss Island posts show quest cards exactly as the app does. This mounts the
// game's own QuestCard (src/child/cards.tsx in ~/Claude/moss-island) inside the
// running app with the demo family, the way that repo's scripts/shots/capture.mjs
// takes its reference cards, and returns each card as a transparent PNG at 3x.
// Read-only: it starts Moss Island's own Vite dev server with the cloud off,
// on its own origin, and stops it afterwards.
//   const cards = await captureCards(['cal-halloween-1', 'notes'])  // Map id -> PNG Buffer
// ============================================================================
import { spawn } from 'node:child_process'
import http from 'node:http'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const MOSS = process.env.MOSS_REPO ?? join(process.env.HOME ?? '', 'Claude', 'moss-island')
const PORT = Number(process.env.MOSS_CARDS_PORT ?? 5349)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const up = () => new Promise((res) => {
  const r = http.request({ host: '127.0.0.1', port: PORT, path: '/app', headers: { Host: `posts.localhost:${PORT}` }, timeout: 2500 }, (x) => { x.resume(); res(x.statusCode === 200) })
  r.on('error', () => res(false)); r.on('timeout', () => { r.destroy(); res(false) }); r.end()
})

async function startServer() {
  if (await up()) return null
  const server = spawn(process.execPath, [join(MOSS, 'node_modules/vite/bin/vite.js'), '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
    cwd: MOSS, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
  })
  let out = ''
  server.stdout.on('data', (d) => { out += d }); server.stderr.on('data', (d) => { out += d })
  for (let i = 0; i < 120 && !(await up()); i++) { if (server.exitCode !== null) break; await sleep(500) }
  if (!(await up())) { server.kill(); throw new Error(`Moss Island's dev server did not start: ${out.slice(-400)}`) }
  return server
}

/** ids -> Map(id, PNG Buffer). Quests the game does not know are left out. */
export async function captureCards(browser, ids) {
  const want = [...new Set(ids.filter(Boolean))]
  const out = new Map()
  if (!want.length || !existsSync(join(MOSS, 'node_modules/vite/bin/vite.js'))) return out
  const server = await startServer()
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, reducedMotion: 'reduce', locale: 'en-GB', timezoneId: 'Europe/London', serviceWorkers: 'block' })
  try {
    await ctx.addInitScript(() => { try { localStorage.setItem('mi-cloud-off', '1') } catch { /* fine */ } })
    const page = await ctx.newPage()
    const base = `http://posts-${Date.now().toString(36)}.localhost:${PORT}`
    await page.goto(`${base}/app?demo=reset&solo=1&moment=home`, { waitUntil: 'domcontentloaded' })
    // The store is ready once the demo family is set up.
    for (let i = 0; i < 200; i++) {
      const ok = await page.evaluate(async () => {
        const t = await fetch('/src/app/App.tsx').then((r) => r.text())
        const url = /from\s*"(\/src\/state\/store\.ts[^"]*)"/.exec(t)?.[1] ?? '/src/state/store.ts'
        window.__miStoreUrl = url
        const s = await import(url)
        return !!(s.getState().ready && s.getState().family?.setupDone)
      }).catch(() => false)
      if (ok) break
      await sleep(150)
    }
    await sleep(1200)
    // The first imports can land while Vite is still optimising its dependencies:
    // one reload and a second try settles it.
    const mount = (id) => page.evaluate(async (id) => {
        const w = window
        const src = (p) => fetch(p).then((r) => r.text())
        const main = await src('/src/main.tsx')
        const dom = /"(\/node_modules\/\.vite\/deps\/react-dom_client\.js[^"]*)"/.exec(main)?.[1]
        const ver = /\?v=([0-9a-f]+)/.exec(dom ?? '')?.[1]
        const react = `/node_modules/.vite/deps/react.js${ver ? `?v=${ver}` : ''}`
        const home = await src('/src/child/Home.tsx')
        const cardsUrl = /from\s*"(\/src\/child\/cards\.tsx[^"]*)"/.exec(home)?.[1] ?? '/src/child/cards.tsx'
        const [Rm, Dm, cards, store, deal, data] = await Promise.all([import(react), import(dom), import(cardsUrl), import(w.__miStoreUrl), import('/src/game/deal.ts'), import('/src/data/quests.ts')])
        const R = Rm.createElement ? Rm : Rm.default, createRoot = (Dm.createRoot ? Dm : Dm.default).createRoot
        const f = store.getState().family, kid = f.children[0]
        const q = deal.questById(f, id) ?? data.QUESTS.find((x) => x.id === id)
        if (!q) return ''
        document.getElementById('posts-mount')?.remove()
        const host = document.createElement('div'); host.id = 'posts-mount'
        host.style.cssText = 'position:fixed;left:12px;top:12px;width:366px;z-index:2147483000'
        document.querySelector('.app').appendChild(host)
        w.__postsRoot?.unmount(); w.__postsRoot = createRoot(host)
        w.__postsRoot.render(R.createElement(cards.QuestCard, { q, fam: f, childId: kid.id, age: kid.age }))
        await new Promise((r) => setTimeout(r, 500))
        return q.title
      }, id)
    for (const id of want) {
      let title = ''
      try { title = await mount(id) } catch {
        await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(2500)
        title = await mount(id).catch(() => '')
      }
      if (!title) continue
      const card = page.locator('#posts-mount > .qf')
      await card.waitFor({ timeout: 10000 }).catch(() => null)
      await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 6000) }))) })
      // Only the card is painted: everything else is hidden and the page clear.
      await page.addStyleTag({ content: 'html.pm, html.pm body{background:transparent!important} html.pm body *{visibility:hidden!important} html.pm #posts-mount > .qf, html.pm #posts-mount > .qf *{visibility:visible!important} #posts-mount > .qf{box-shadow:none!important}' })
      await page.evaluate(() => document.documentElement.classList.add('pm'))
      await sleep(600)
      out.set(id, await card.screenshot({ omitBackground: true, animations: 'disabled', caret: 'hide' }))
      await page.evaluate(() => document.documentElement.classList.remove('pm'))
    }
  } finally {
    await ctx.close()
    if (server) server.kill('SIGTERM')
  }
  return out
}

// ============================================================================
// Renders designed posts to 1080 x 1350 JPEG slides with headless Chrome, the
// way the website and Moss Island chats render their own posts. Used by
// scripts/digest-local.mjs (render) each morning on the Mac.
//
//   import { renderPosts } from './post-render/render.mjs'
//   const out = await renderPosts(posts)   // [{ company, slides: [Buffer] }]
//
// The slides are served from a small local server rather than opened as
// files, so the pages reach Hue & Heal's website fonts and lockups (/hh),
// Moss Island's art (/moss), Copilot's public folder (/copilot) and the
// game's own quest cards (/card/<id>.png, captured by moss-cards.mjs).
//
// Test on a sample:  node scripts/post-render/render.mjs <posts.json> <out dir>
// ============================================================================
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, createReadStream } from 'node:fs'
import { join, dirname, extname, normalize } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import http from 'node:http'
import { slideHtml } from './brands.mjs'
import { captureCards } from './moss-cards.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const COPILOT_PUBLIC = join(here, '..', '..', 'public')
const MOSS_ART = process.env.MOSS_ART ?? join(process.env.HOME ?? '', 'Claude', 'moss-island', 'public', 'art')
const QUESTS = (() => {
  try { return JSON.parse(readFileSync(join(here, '..', '..', 'supabase', 'functions', '_shared', 'moss-quests.json'), 'utf8')) } catch { return { quests: [], packs: [] } }
})()
const TYPES = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }

async function browser() {
  const core = process.env.PW ?? join(process.env.HOME ?? '', '.local/lib/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs')
  const { chromium } = await import(existsSync(core) ? pathToFileURL(core).href : 'playwright-core')
  try { return await chromium.launch() } catch {
    return chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  }
}

/** A static server for the slides and their assets, on a free localhost port. */
function serve(dir) {
  // /hh/... is Hue & Heal's own kit: the website's Newsreader and Poppins files (OFL) and lockups.
  const roots = { s: dir, card: dir, moss: MOSS_ART, copilot: COPILOT_PUBLIC, hh: join(here, 'hh') }
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0])
    const [, top, ...rest] = url.split('/')
    const root = roots[top]
    const path = root && normalize(join(root, ...rest))
    if (!path || !path.startsWith(root) || !existsSync(path)) { res.writeHead(404); res.end(); return }
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' })
    createReadStream(path).pipe(res)
  })
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, base: `http://localhost:${server.address().port}` })))
}

/** posts: [{ company, slides: [slide], photo, pack? }] -> [{ company, slides: [jpeg Buffer] }] */
export async function renderPosts(posts) {
  const b = await browser()
  const dir = join(tmpdir(), `post-render-${process.pid}-${Date.now().toString(36)}`)
  mkdirSync(dir, { recursive: true })
  const { server, base } = await serve(dir)
  const out = []
  try {
    // The real quest cards first, from the game itself.
    const ids = posts.filter((p) => p.company === 'Moss Island').flatMap((p) => (p.slides ?? []).filter((s) => s.kind === 'quest').map((s) => s.quest_id))
    const cards = ids.length ? await captureCards(b, ids).catch((e) => { console.error('Quest cards:', e.message); return new Map() }) : new Map()
    for (const [id, png] of cards) writeFileSync(join(dir, `${id}.png`), png)

    for (const post of posts) {
      const slides = post.slides ?? []
      const questIds = slides.filter((s) => s.kind === 'quest').map((s) => s.quest_id)
      // A Moss post about a pack shows that pack's scene: the pack of its first quest.
      const firstQuest = QUESTS.quests.find((q) => q.id === questIds[0])
      const pack = post.pack || (firstQuest && firstQuest.home !== 'foundation' ? firstQuest.home : '')
      const shots = []
      for (let i = 0; i < slides.length; i++) {
        const s = slides[i]
        const ctx = {
          index: i, total: slides.length, photo: post.photo || '', pack,
          quest: (id) => QUESTS.quests.find((q) => q.id === id),
          card: (id) => (cards.has(id) ? `/card/${encodeURIComponent(id)}.png` : ''),
          questIndex: questIds.slice(0, questIds.indexOf(s.quest_id) + 1).length, questTotal: questIds.length,
          hasArt: (p) => existsSync(join(MOSS_ART, p)),
        }
        const name = `s-${out.length}-${i}.html`
        writeFileSync(join(dir, name), slideHtml(post.company, s, ctx))
        const p = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 })
        await p.goto(`${base}/s/${name}`, { waitUntil: 'networkidle', timeout: 45_000 })
        await p.waitForSelector('body[data-ready]', { timeout: 20_000 }).catch(() => null)
        await p.waitForTimeout(300)
        shots.push(await p.screenshot({ type: 'jpeg', quality: 90 }))
        await p.close()
      }
      out.push({ company: post.company, slides: shots })
    }
  } finally {
    server.close()
    await b.close()
    rmSync(dir, { recursive: true, force: true })
  }
  return out
}

/* CLI: render a sample file of posts to a folder. */
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [src, dest = join(here, 'out')] = process.argv.slice(2)
  if (!src) { console.error('Usage: render.mjs <posts.json> [out dir]'); process.exit(2) }
  mkdirSync(dest, { recursive: true })
  const res = await renderPosts(JSON.parse(readFileSync(src, 'utf8')))
  res.forEach((r, n) => r.slides.forEach((buf, i) => writeFileSync(join(dest, `${n + 1}-${r.company.toLowerCase().replace(/[^a-z]+/g, '-')}-${i + 1}.jpg`), buf)))
  console.log(`Rendered ${res.reduce((t, r) => t + r.slides.length, 0)} slides to ${dest}`)
}

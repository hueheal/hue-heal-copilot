#!/usr/bin/env node
// ============================================================================
// Moss Island's real quests, for the Founder's Digest posts.
//
// Moss Island posts show real quests from the game, never invented ones. This
// reads the game's own data (src/data/quests.ts and packs.ts in
// ~/Claude/moss-island, through that repo's Vite, read-only) and writes a
// compact catalogue to supabase/functions/_shared/moss-quests.json:
//   quests: id, word, mins, title, why, steps, skill, home (the pack or "foundation")
//   packs:  id, name, kind, colour, from, to, on (the current or next run)
// The digest-local runner refreshes it before writing each morning.
//   node scripts/moss-quests.mjs [path to the moss-island repo]
// ============================================================================
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const MOSS = process.argv[2] ?? join(process.env.HOME ?? '', 'Claude', 'moss-island')
const OUT = join(here, '..', 'supabase', 'functions', '_shared', 'moss-quests.json')

const { createServer } = createRequire(join(MOSS, 'package.json'))('vite')
const vite = await createServer({ root: MOSS, logLevel: 'error', server: { middlewareMode: true, hmr: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
try {
  const { QUESTS } = await vite.ssrLoadModule('/src/data/quests.ts')
  const { PACKS, runOf } = await vite.ssrLoadModule('/src/data/packs.ts')
  // Live, shippable packs only: never the internal partner demos, the
  // parent-switched packs or Global drafts awaiting approval.
  const live = PACKS.filter((p) => !p.draft && p.activation !== 'parent' && !p.private && p.kind !== 'partner' && !p.packIds)
  const homeOf = new Map()
  for (const p of live) for (const id of p.questIds) if (!homeOf.has(id)) homeOf.set(id, p.id)
  const blocked = new Set(PACKS.filter((p) => p.activation === 'parent' || p.private || p.kind === 'partner' || p.draft).flatMap((p) => p.questIds))
  const quests = QUESTS.filter((q) => !q.private && !blocked.has(q.id) && Array.isArray(q.steps) && q.steps.length).map((q) => ({
    id: q.id, word: q.word, mins: q.mins, title: q.title, why: q.why ?? '', steps: q.steps.slice(0, 4), skill: q.skill,
    home: q.home ?? homeOf.get(q.id) ?? 'foundation',
  }))
  const packs = live.map((p) => { const r = runOf(p); return { id: p.id, name: r.name ?? p.name, kind: p.kind, colour: p.colour, from: r.releasedOn ?? null, to: r.endsOn ?? null, on: r.on ?? null } })
  writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), quests, packs }))
  console.log(`${quests.length} quests, ${packs.length} packs -> ${OUT}`)
} finally {
  await vite.close()
}

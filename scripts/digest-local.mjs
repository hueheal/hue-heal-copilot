#!/usr/bin/env node
// ============================================================================
// The Founder's Digest, written on the Mac on the Claude plan.
//
// The cloud opens each day's digest at prep time (06:30 London) with its
// context ready, and waits for the Mac until send time (07:30). A scheduled
// Claude task on the Mac runs:
//
//   node scripts/digest-local.mjs context     the rules, the shape and today's context
//                                             (prints NOTHING TO DO when the day is handled)
//   node scripts/digest-local.mjs file <json> files the written digest; the cloud then
//                                             saves the posts and tasks, makes the
//                                             images and sends it at send time
//   node scripts/digest-local.mjs render      draws each post in its brand's design
//                                             (scripts/post-render) once the cover
//                                             photos are ready, and uploads the slides
//   node scripts/digest-local.mjs fail <why>  hands the day to the cloud now
//
// If the Mac is asleep, nothing is lost: at send time the cloud writes it.
// Auth: the Supabase CLI token from the macOS keychain, used in-process only.
// ============================================================================
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import RULES from '../supabase/functions/_shared/digest-rules.json' with { type: 'json' }
import { renderPosts } from './post-render/render.mjs'

const PROJECT = 'dxniwcwoacyrjlyhymoh'
const TZ = 'Europe/London'
const token = execSync('security find-generic-password -s "Supabase CLI" -w', { encoding: 'utf8' }).trim()
const [cmd, ...rest] = process.argv.slice(2)

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ query }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.message ?? `Database ${res.status}`)
  return body
}
const q = (v) => { if (v === null || v === undefined) return 'null'; const tag = `q${Math.random().toString(36).slice(2, 8)}`; return `$${tag}$${String(v)}$${tag}$` }
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const owner = async () => (await sql(`select owner from life_profile where digest_lens is not null and coalesce((digest_lens->>'enabled')::boolean, true) limit 1`))[0]?.owner
const row = async (o) => (await sql(`select id, stage, context, send_after from founder_digests where owner = ${q(o)} and digest_date = ${q(today())}`))[0]

async function context() {
  const o = await owner()
  if (!o) return console.log('NOTHING TO DO: the digest is switched off.')
  let r = await row(o)
  if (!r) {
    // Earlier than the cloud's prep time: ask it to open the day for the Mac now.
    await sql(`select public.founder_digest_call(jsonb_build_object('op', 'open_mac', 'owner', ${q(o)}::text))`)
    for (let i = 0; i < 30 && !r; i++) { await new Promise((ok) => setTimeout(ok, 3000)); r = await row(o) }
  }
  if (!r) return console.log('NOTHING TO DO: the cloud did not open today\'s digest. It will write it itself at send time.')
  if (r.stage !== 'mac') return console.log(`NOTHING TO DO: today's digest is already ${r.stage === 'sent' ? 'sent' : `with the cloud (${r.stage})`}.`)
  const sendBy = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(r.send_after))
  console.log([
    `# Founder's Digest for ${today()}: write it, then file it before ${sendBy} London time`,
    '',
    '## How to work',
    '1. Read the rules and the context below.',
    '2. Research the news yourself with web search: stories published in the last 7 days, real pages you have opened, following the research rules. Aim for six to eight candidates, then choose the best four to six.',
    '3. Write the digest as ONE JSON object that matches the schema exactly (every key present; existing_task_id is "" for a new step). Exactly one post each for Hue & Heal, Remedae and Moss Island, in that order.',
    '4. Save it to a file and run: node scripts/digest-local.mjs file <that file>',
    '   If you cannot finish, run: node scripts/digest-local.mjs fail "<why>" and the cloud will write it.',
    '',
    '## Rules for the writing', RULES.system,
    '', '## Rules for the research', RULES.news_system.replace('file six to eight items with the file_news tool, once, when you are done', 'gather six to eight items'),
    '', '## Schema (JSON Schema)', JSON.stringify(RULES.schema, null, 1),
    '', '## Context', r.context,
  ].join('\n'))
}

async function file(path) {
  if (!path) throw new Error('Give the path to the JSON file.')
  const o = await owner()
  const r = o && await row(o)
  if (!r || r.stage !== 'mac') return console.log(`Not filed: today's digest is ${r ? r.stage : 'not open'}, so the cloud has it.`)
  const text = readFileSync(path, 'utf8').trim().replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '')
  const d = JSON.parse(text)
  const missing = Object.keys(RULES.schema.properties).filter((k) => !(k in d))
  if (missing.length) throw new Error(`The digest is missing: ${missing.join(', ')}`)
  const companies = (d.posts ?? []).map((p) => p.company)
  for (const c of ['Hue & Heal', 'Remedae', 'Moss Island']) if (!companies.includes(c)) throw new Error(`No post for ${c}.`)
  if (/[–—]/.test(JSON.stringify(d))) throw new Error('The digest has em or en dashes; replace them with commas, colons or full stops.')
  const out = await sql(`update founder_digests set state = state || jsonb_build_object('raw', ${q(JSON.stringify(d))}::jsonb), stage = 'filed', source = 'mac', attempts = 0, updated_at = now() where id = ${q(r.id)} and stage = 'mac' returning id`)
  if (!out.length) return console.log('Not filed: the cloud took the day over a moment ago.')
  await sql(`select public.founder_digest_call('{"op":"tick"}'::jsonb)`)
  console.log(`Filed. Now run: node scripts/digest-local.mjs render. Copilot saves the posts and next steps, makes the cover photos, and sends it at ${new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(r.send_after))}.`)
}

async function fail(why) {
  const o = await owner()
  const r = o && await row(o)
  if (!r || r.stage !== 'mac') return console.log('Nothing to hand over.')
  await sql(`update founder_digests set stage = 'news', source = 'cloud', error = ${q(`The Mac handed it over: ${String(why ?? '').slice(0, 200)}`)} where id = ${q(r.id)} and stage = 'mac'`)
  await sql(`select public.founder_digest_call('{"op":"tick"}'::jsonb)`)
  console.log('Handed to the cloud.')
}

/* The project's service key, fetched with the CLI token for the uploads and
   used in-process only. */
async function serviceKey() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/api-keys?reveal=true`, { headers: { authorization: `Bearer ${token}` } })
  const keys = await res.json()
  const k = Array.isArray(keys) ? keys.find((x) => x.name === 'service_role') : null
  if (!k?.api_key) throw new Error('Could not read the project key for the uploads.')
  return k.api_key
}

async function render() {
  const o = await owner()
  if (!o) return console.log('Nothing to draw.')
  // The cover photos come first; wait for them (up to 12 minutes).
  let r
  for (let i = 0; i < 48; i++) {
    r = (await sql(`select id, stage, digest_date, content from founder_digests where owner = ${q(o)} and digest_date = ${q(today())}`))[0]
    if (!r || ['render', 'send', 'sent', 'failed'].includes(r.stage)) break
    await new Promise((ok) => setTimeout(ok, 15_000))
  }
  if (!r || r.stage !== 'render') return console.log(`Nothing to draw: today's digest is ${r ? r.stage : 'not open'}.`)
  const content = r.content
  const posts = content.posts ?? []
  const drawn = await renderPosts(posts.map((p) => ({ company: p.company, slides: p.slides, photo: p.image_url ?? '' })))
  const key = await serviceKey()
  const base = `https://${PROJECT}.supabase.co/storage/v1`
  for (let n = 0; n < posts.length; n++) {
    const slug = posts[n].company.toLowerCase().replace(/[^a-z]+/g, '-')
    const stamp = Date.now().toString(36)
    const urls = []
    for (let i = 0; i < drawn[n].slides.length; i++) {
      const path = `${o}/digest/${r.digest_date}-${slug}-${stamp}-${i + 1}.jpg`
      const up = await fetch(`${base}/object/social-assets/${path}`, { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'image/jpeg', 'x-upsert': 'true' }, body: drawn[n].slides[i] })
      if (!up.ok) throw new Error(`Upload failed (${up.status}): ${(await up.text()).slice(0, 120)}`)
      urls.push(`${base}/object/public/social-assets/${path}`)
    }
    posts[n].slide_urls = urls
    if (posts[n].post_id) await sql(`update social_posts set slide_urls = ${q(`{${urls.map((u) => `"${u}"`).join(',')}}`)}::text[], image_url = ${q(urls[0])}, updated_at = now() where id = ${q(posts[n].post_id)}`)
  }
  const done = await sql(`update founder_digests set content = ${q(JSON.stringify({ ...content, posts }))}::jsonb, stage = 'send', updated_at = now() where id = ${q(r.id)} and stage = 'render' returning id`)
  if (!done.length) return console.log('Drawn, but the digest had already gone with the photos. The designs are on the posts in Copilot.')
  await sql(`select public.founder_digest_call('{"op":"tick"}'::jsonb)`)
  console.log(`Drew ${drawn.reduce((t, d) => t + d.slides.length, 0)} slides across ${posts.length} posts. The digest sends at send time.`)
}

const run = { context, file: () => file(rest[0]), render, fail: () => fail(rest.join(' ')) }[cmd]
if (!run) { console.error('Usage: digest-local.mjs context | file <json> | render | fail <why>'); process.exit(2) }
run().catch((e) => { console.error(e.message); process.exit(1) })

#!/usr/bin/env node
// ============================================================================
// Tender radar, run from the founder's own machine.
// UK Contracts Finder (and Find a Tender) refuse requests from cloud data
// centres, so the Supabase function cannot reach them. This script can: it
// reads each founder's tender phrases from life_profile, searches open
// notices for each phrase (quoted, so the feed returns only real matches),
// and files new ones into life_pipeline as kind 'tender', stage 'new'.
// Existing notices are left alone, so a tracked or dismissed tender stays so.
//
// Usage:  node scripts/tender-radar.mjs            (scan and file)
//         node scripts/tender-radar.mjs --dry-run  (scan and print only)
// Auth:   the Supabase CLI token from the macOS keychain, used in-process only.
// ============================================================================
import { execSync } from 'node:child_process'

const PROJECT = 'dxniwcwoacyrjlyhymoh'
const DRY = process.argv.includes('--dry-run')
const token = execSync('security find-generic-password -s "Supabase CLI" -w', { encoding: 'utf8' }).trim()

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ query }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.message ?? `Database ${res.status}`)
  return body
}

const decode = (t) => String(t ?? '').replace(/&#0*39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))

async function search(phrase) {
  const res = await fetch('https://www.contractsfinder.service.gov.uk/api/rest/2/search_notices/json', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'HueHealCopilot/2.0 (+https://copilotadmin.hueandheal.com)' },
    body: JSON.stringify({ searchCriteria: { keyword: `"${phrase}"`, statuses: ['Open'], types: ['Contract', 'Tender', 'EarlyEngagement'] }, size: 50 }),
  })
  if (!res.ok) throw new Error(`Contracts Finder ${res.status} for "${phrase}"`)
  const d = await res.json()
  const needle = phrase.toLowerCase()
  return (d.noticeList ?? []).map((n) => n.item)
    .filter((i) => `${i.title ?? ''} ${i.description ?? ''}`.toLowerCase().includes(needle))
    .map((i) => ({ i, phrase }))
}

const profiles = await sql("select owner, tender_keywords from public.life_profile where array_length(tender_keywords, 1) > 0")
let filed = 0
for (const { owner, tender_keywords } of profiles) {
  const seen = new Map()
  for (const phrase of tender_keywords.slice(0, 15)) {
    try { for (const hit of await search(phrase.trim())) if (!seen.has(hit.i.id)) seen.set(hit.i.id, hit) }
    catch (e) { console.error(e.message) }
  }
  const rows = [...seen.values()].map(({ i, phrase }) => {
    const value = Math.max(Number(i.valueLow ?? 0), Number(i.valueHigh ?? 0))
    return {
      owner, kind: 'tender', source: 'tender_radar', source_ref: String(i.id), stage: 'new',
      title: decode(i.title || 'Untitled notice').slice(0, 300), org: decode(i.organisationName).slice(0, 200),
      value_pence: value ? Math.round(value * 100) : null, deadline: i.deadlineDate ?? null,
      url: `https://www.contractsfinder.service.gov.uk/Notice/${i.id}`,
      notes: `Matched “${phrase}”. ${decode(i.description).replace(/\s+/g, ' ').slice(0, 700)}`,
    }
  })
  console.log(`${rows.length} matching open notices for ${tender_keywords.length} phrases`)
  if (DRY || !rows.length) { rows.slice(0, 10).forEach((r) => console.log(' -', r.title.slice(0, 80), '|', r.org.slice(0, 40))); continue }
  const tag = `r${Date.now().toString(36)}`
  const payload = JSON.stringify(rows)
  const out = await sql(`insert into public.life_pipeline (owner, kind, source, source_ref, stage, title, org, value_pence, deadline, url, notes)
    select owner, kind, source, source_ref, stage, title, org, value_pence, deadline, url, notes
    from jsonb_to_recordset($${tag}$${payload}$${tag}$::jsonb) as x(owner uuid, kind text, source text, source_ref text, stage text, title text, org text, value_pence bigint, deadline timestamptz, url text, notes text)
    on conflict (owner, source, source_ref) do nothing returning id`)
  filed += out.length
  console.log(`${out.length} new on the radar`)
}
console.log(DRY ? 'Dry run: nothing filed.' : `Done: ${filed} new notices filed.`)

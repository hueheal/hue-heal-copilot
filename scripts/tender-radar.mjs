#!/usr/bin/env node
// ============================================================================
// Contracts Finder feed for the Opportunity Radar, run from the founder's Mac.
// UK Contracts Finder (and Find a Tender) refuse requests from cloud data
// centres, so the Commercial Engine cannot reach them. This script can: it
// reads each founder's phrases from life_profile.tender_keywords, searches
// open notices for each phrase (quoted, so the feed returns only real
// matches), and files new ones onto the radar unscored (studio lane). The
// engine scores them against the Hue & Heal lens at its next scan. Notices
// already on the radar are left alone, so a passed one stays passed.
//
// Usage:  node scripts/tender-radar.mjs            (scan and file)
//         node scripts/tender-radar.mjs --dry-run  (scan and print only)
// Auth:   the Supabase CLI token from the macOS keychain, used in-process only.
// Schedule: launchd, 06:00 and 13:00 (scripts/com.hueandheal.tender-feed.plist).
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
      owner, lane: 'studio', category: 'tender', source: 'contracts_finder', source_ref: String(i.id), source_name: 'Contracts Finder',
      title: decode(i.title || 'Untitled notice').slice(0, 300), org: decode(i.organisationName).slice(0, 200),
      money: value ? `£${Math.round(value).toLocaleString('en-GB')}` : '', value_pence: value ? Math.round(value * 100) : null, deadline: i.deadlineDate ?? null,
      location: decode(i.regionText || 'UK').slice(0, 120),
      url: `https://www.contractsfinder.service.gov.uk/Notice/${i.id}`,
      summary: `Matched “${phrase}”. ${decode(i.description).replace(/\s+/g, ' ').slice(0, 700)}`,
    }
  })
  console.log(`${rows.length} matching open notices for ${tender_keywords.length} phrases`)
  if (DRY || !rows.length) { rows.slice(0, 10).forEach((r) => console.log(' -', r.title.slice(0, 80), '|', r.org.slice(0, 40))); continue }
  const tag = `r${Date.now().toString(36)}`
  const payload = JSON.stringify(rows)
  const out = await sql(`insert into public.radar_opportunities (owner, lane, category, source, source_ref, source_name, title, org, money, value_pence, deadline, location, url, summary)
    select owner, lane, category, source, source_ref, source_name, title, org, money, value_pence, deadline, location, url, summary
    from jsonb_to_recordset($${tag}$${payload}$${tag}$::jsonb) as x(owner uuid, lane text, category text, source text, source_ref text, source_name text, title text, org text, money text, value_pence bigint, deadline timestamptz, location text, url text, summary text)
    on conflict (owner, source, source_ref) do nothing returning id`)
  filed += out.length
  console.log(`${out.length} new on the radar, to be scored at the next scan`)
}
console.log(`${new Date().toISOString()} ${DRY ? 'Dry run: nothing filed.' : `Done: ${filed} new notices filed.`}`)

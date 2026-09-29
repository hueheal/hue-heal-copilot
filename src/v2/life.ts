import { supabase, isSupabaseConfigured, functionsBase } from '../lib/supabase'

/* ============================================================
   Copilot V2 data: the founder's life above the businesses.
   Every table is owner-scoped by row security; brand_id is
   optional (null = life). The assistant and the outside world
   (tenders, calendar feed, sending approved email) live in the
   life-agent and life-sync functions. Local mode runs on a
   sample life so the screens can be judged without signing in.
   ============================================================ */

export interface LifeProfile {
  display_name: string; mission: string; purpose: string; values_list: string[]
  focus_areas: { name: string; why?: string }[]; weekly_focus: string
  tender_keywords: string[]; calendar_ics: string; voice_replies: boolean; radar_lens: RadarLens
}
export interface RadarLens {
  identity?: string; look_for?: string; buyers?: string; down_rank?: string; geography?: string; contracts?: string
  ventures?: { product: string; direction: string }[]; venture_rule?: string
}
export type RadarLane = 'studio' | 'contracts' | 'venture' | 'outbound'
export type RadarAction = 'pursue_now' | 'outreach_now' | 'partner' | 'product_funding' | 'watch' | 'pass'
export interface Opportunity {
  id: string; lane: RadarLane; category: string; title: string; org: string; summary: string
  fit: number | null; fit_detail: Partial<Record<'sector' | 'scope' | 'ambition' | 'capability' | 'access', number | null>>
  action: RadarAction | null; why: string; angle: string; money: string; value_pence: number | null
  deadline: string | null; deadline_note: string; location: string; signal_date: string | null; product: string
  source_name: string; url: string; source: string; status: 'open' | 'closed' | 'expired' | 'tracked' | 'watching' | 'passed'
  closed_reason: string; decision_note: string; change_note: string; pipeline_id: string | null
  first_seen: string; changed_at: string | null; last_checked: string
}
export interface RadarBrief { priorities: { text: string; opportunity_id: string | null }[]; verdict: { label: string; text: string; opportunity_id: string | null }[]; insight: string }
export interface RadarRun { id: string; status: 'running' | 'done' | 'failed'; brief: RadarBrief | null; usage: { usd?: number; searches?: number }; started_at: string; finished_at: string | null; error: string | null; lanes?: { lane: string; status: string }[] }
export interface Milestone { id: string; brand_id: string | null; title: string; detail: string; horizon: Horizon; due: string | null; status: 'planned' | 'active' | 'done' | 'dropped'; position: number }
export type Horizon = 'week' | 'quarter' | 'year' | 'someday'
export interface LifeTask { id: string; brand_id: string | null; title: string; due: string | null; status: 'open' | 'done'; is_now: boolean; created_at: string }
export interface PipelineItem {
  id: string; brand_id: string | null; kind: 'lead' | 'deal' | 'partnership' | 'tender'; title: string; org: string
  contact_name: string; contact_email: string; value_pence: number | null; stage: string; next_step: string
  next_due: string | null; deadline: string | null; url: string; notes: string; source: string; created_at: string
}
export interface LifeEvent { id: string; brand_id: string | null; title: string; starts_at: string; ends_at: string | null; all_day: boolean; location: string; source: string }
export interface LifeAction { id: string; kind: 'email' | 'booking'; summary: string; payload: Record<string, string>; status: string; created_at: string; brand_id?: string | null }
export interface LifeMessage { id: string; role: 'user' | 'assistant'; text: string; via: string; actions: { kind: string; summary: string; ref?: string }[]; created_at: string }
export interface TeamApproval { id: string; task: string; dept: string | null; brand_id: string | null; created_at: string }

export const EMPTY_PROFILE: LifeProfile = { display_name: '', mission: '', purpose: '', values_list: [], focus_areas: [], weekly_focus: '', tender_keywords: [], calendar_ics: '', voice_replies: false, radar_lens: {} }
export const live = isSupabaseConfigured && !!supabase
const db = () => supabase!

/* ---- Local-mode sample life ---- */
const at = (dayOffset: number, h: number, m = 0) => { const d = new Date(); d.setDate(d.getDate() + dayOffset); d.setHours(h, m, 0, 0); return d.toISOString() }
const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10) }
const uid = () => Math.random().toString(36).slice(2, 10)
const demo = {
  profile: { ...EMPTY_PROFILE, display_name: 'Maria', mission: 'Build calm, beautiful tools that help people heal and grow, and a studio that lets me do my best work without burning out.', purpose: 'Design as care: for people, for the planet, for myself.', weekly_focus: 'Get Remedae\'s pilot testers onboarded and send the two university proposals.', focus_areas: [{ name: 'Remedae pilot' }, { name: 'Studio pipeline' }, { name: 'Health and rest' }], tender_keywords: ['experience design', 'immersive', 'visitor experience'], calendar_ics: '',
    radar_lens: { identity: 'Entertainment-grade product, experience and service design for wellness, hospitality, learning and family.', look_for: 'Zero-to-one products, immersive environments and premium guest experiences.', buyers: 'Funded startups, hospitality groups, museums and children\'s brands.', down_rank: 'Generic websites and ordinary public-sector service design.', geography: 'UK-first, not UK-only.', contracts: 'Senior and lead product or experience design, contract first.', ventures: [{ product: 'Remedae', direction: 'Traditional healing knowledge as a consumer app.' }], venture_rule: 'Never reshape a product to chase a grant.' } } as LifeProfile,
  tasks: [
    { id: 't1', brand_id: null, title: 'Approve the pricing outline so Growth can write the paywall copy', due: day(0), status: 'open', is_now: true, created_at: at(-1, 9) },
    { id: 't2', brand_id: null, title: 'Reply to the King\'s College research lead', due: day(1), status: 'open', is_now: false, created_at: at(-2, 9) },
    { id: 't3', brand_id: null, title: 'Book a physio appointment', due: day(3), status: 'open', is_now: false, created_at: at(-3, 9) },
  ] as LifeTask[],
  milestones: [
    { id: 'm1', brand_id: null, title: 'Remedae pilot: 100 testers active', detail: '', horizon: 'quarter', due: day(40), status: 'active', position: 0 },
    { id: 'm2', brand_id: null, title: 'Two studio clients signed for Q1', detail: '', horizon: 'quarter', due: day(70), status: 'planned', position: 1 },
    { id: 'm3', brand_id: null, title: 'Send both university proposals', detail: '', horizon: 'week', due: day(4), status: 'active', position: 0 },
    { id: 'm4', brand_id: null, title: 'Remedae seed round closed', detail: '', horizon: 'year', due: day(200), status: 'planned', position: 0 },
    { id: 'm5', brand_id: null, title: 'Write the Mind arm\'s first coaching programme', detail: '', horizon: 'someday', due: null, status: 'planned', position: 0 },
  ] as Milestone[],
  pipeline: [
    { id: 'p1', brand_id: null, kind: 'partnership', title: 'Pilot research partnership', org: 'King\'s College London', contact_name: '', contact_email: '', value_pence: null, stage: 'meeting', next_step: 'Send the one-page proposal', next_due: day(2), deadline: null, url: '', notes: '', source: 'manual', created_at: at(-6, 9) },
    { id: 'p2', brand_id: null, kind: 'deal', title: 'Service design sprint', org: 'Hackney Wellbeing Hub', contact_name: '', contact_email: '', value_pence: 1850000, stage: 'proposal', next_step: 'Follow up on the proposal', next_due: day(1), deadline: null, url: '', notes: '', source: 'manual', created_at: at(-9, 9) },
    { id: 'p3', brand_id: null, kind: 'lead', title: 'Brand refresh enquiry', org: 'Soma Studio', contact_name: '', contact_email: '', value_pence: null, stage: 'new', next_step: 'Book an intro call', next_due: day(5), deadline: null, url: '', notes: '', source: 'manual', created_at: at(-1, 9) },
    { id: 'p4', brand_id: null, kind: 'tender', title: 'Digital Installation Design, Request for Quotation', org: 'Tullie House Museum and Art Gallery Trust', contact_name: '', contact_email: '', value_pence: 1400000, stage: 'new', next_step: '', next_due: null, deadline: at(30, 10), url: 'https://www.contractsfinder.service.gov.uk/Notice/a64c3ffe-9b90-4d78-ba49-01674d5c46ed', notes: 'Matched “design”. Sample notice from the radar.', source: 'tender_radar', created_at: at(0, 7) },
  ] as PipelineItem[],
  events: [
    { id: 'e1', brand_id: null, title: 'Remedae stand-up with Growth', starts_at: at(0, 10), ends_at: at(0, 10, 30), all_day: false, location: '', source: 'manual' },
    { id: 'e2', brand_id: null, title: 'Call: King\'s College research lead', starts_at: at(0, 14), ends_at: at(0, 14, 45), all_day: false, location: 'Teams', source: 'manual' },
    { id: 'e3', brand_id: null, title: 'Yoga', starts_at: at(0, 18, 30), ends_at: at(0, 19, 30), all_day: false, location: '', source: 'manual' },
    { id: 'e4', brand_id: null, title: 'Hackney Wellbeing Hub workshop', starts_at: at(2, 11), ends_at: at(2, 13), all_day: false, location: 'Hackney', source: 'manual' },
  ] as LifeEvent[],
  actions: [
    { id: 'a1', kind: 'email', summary: 'Email to lead@kcl.ac.uk: Remedae pilot research partnership', payload: { to: 'lead@kcl.ac.uk', subject: 'Remedae pilot research partnership', body: 'Hi,\n\nThank you for the conversation last week. Attached is a one-page outline of how a research partnership on the Remedae pilot could work.\n\nWarmly,\nMaria', from: 'Maria <maria@remedae.app>' }, status: 'pending', created_at: at(0, 8) },
  ] as LifeAction[],
  messages: [] as LifeMessage[],
}

/* ---- Profile ---- */
export async function getProfile(): Promise<LifeProfile> {
  if (!live) return demo.profile
  const { data } = await db().from('life_profile' as never).select('*').maybeSingle()
  return { ...EMPTY_PROFILE, ...((data ?? {}) as Partial<LifeProfile>) }
}
export async function saveProfile(patch: Partial<LifeProfile>): Promise<void> {
  if (!live) { Object.assign(demo.profile, patch); return }
  const { data: u } = await db().auth.getUser()
  await db().from('life_profile' as never).upsert({ owner: u.user?.id, ...patch, updated_at: new Date().toISOString() } as never, { onConflict: 'owner' })
}

/* ---- Tasks ---- */
export async function listTasks(): Promise<LifeTask[]> {
  if (!live) return demo.tasks.filter((t) => t.status === 'open')
  const { data } = await db().from('life_tasks' as never).select('id, brand_id, title, due, status, is_now, created_at').eq('status', 'open').order('is_now', { ascending: false }).order('due', { ascending: true, nullsFirst: false }).limit(60)
  return (data ?? []) as LifeTask[]
}
export async function addTask(title: string, extra: Partial<LifeTask> = {}): Promise<LifeTask | null> {
  const row = { title: title.trim(), due: extra.due ?? null, brand_id: extra.brand_id ?? null, is_now: !!extra.is_now }
  if (!live) { const t = { id: uid(), status: 'open', created_at: new Date().toISOString(), ...row } as LifeTask; demo.tasks.push(t); return t }
  const { data } = await db().from('life_tasks' as never).insert(row as never).select('id, brand_id, title, due, status, is_now, created_at').single()
  return (data ?? null) as LifeTask | null
}
export async function doneTask(id: string): Promise<void> {
  if (!live) { const t = demo.tasks.find((x) => x.id === id); if (t) { t.status = 'done'; t.is_now = false } return }
  await db().from('life_tasks' as never).update({ status: 'done', is_now: false, done_at: new Date().toISOString() } as never).eq('id', id)
}
export async function makeNow(id: string): Promise<void> {
  if (!live) { demo.tasks.forEach((t) => { t.is_now = t.id === id }); return }
  await db().from('life_tasks' as never).update({ is_now: false } as never).eq('is_now', true)
  await db().from('life_tasks' as never).update({ is_now: true } as never).eq('id', id)
}

/* ---- Milestones ---- */
export async function listMilestones(): Promise<Milestone[]> {
  if (!live) return demo.milestones.filter((m) => m.status !== 'dropped')
  const { data } = await db().from('life_milestones' as never).select('id, brand_id, title, detail, horizon, due, status, position').neq('status', 'dropped').order('position').order('due', { ascending: true, nullsFirst: false })
  return (data ?? []) as Milestone[]
}
export async function addMilestone(m: Pick<Milestone, 'title' | 'horizon'> & Partial<Milestone>): Promise<Milestone | null> {
  const row = { title: m.title.trim(), horizon: m.horizon, due: m.due ?? null, brand_id: m.brand_id ?? null, detail: m.detail ?? '' }
  if (!live) { const x = { id: uid(), status: 'planned', position: 99, ...row } as Milestone; demo.milestones.push(x); return x }
  const { data } = await db().from('life_milestones' as never).insert(row as never).select('id, brand_id, title, detail, horizon, due, status, position').single()
  return (data ?? null) as Milestone | null
}
export async function updateMilestone(id: string, patch: Partial<Milestone>): Promise<void> {
  if (!live) { Object.assign(demo.milestones.find((m) => m.id === id) ?? {}, patch); return }
  await db().from('life_milestones' as never).update({ ...patch, updated_at: new Date().toISOString() } as never).eq('id', id)
}

/* ---- Pipeline ---- */
export async function listPipeline(): Promise<PipelineItem[]> {
  if (!live) return demo.pipeline.filter((p) => p.stage !== 'dismissed')
  const { data } = await db().from('life_pipeline' as never).select('*').neq('stage', 'dismissed').order('next_due', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }).limit(200)
  return (data ?? []) as PipelineItem[]
}
export async function updatePipeline(id: string, patch: Partial<PipelineItem>): Promise<void> {
  if (!live) { Object.assign(demo.pipeline.find((p) => p.id === id) ?? {}, patch); return }
  await db().from('life_pipeline' as never).update({ ...patch, updated_at: new Date().toISOString() } as never).eq('id', id)
}
export async function addPipeline(p: Pick<PipelineItem, 'title' | 'kind'> & Partial<PipelineItem>): Promise<PipelineItem | null> {
  const row = { title: p.title.trim(), kind: p.kind, org: p.org ?? '', stage: p.stage ?? 'new', next_step: p.next_step ?? '', next_due: p.next_due ?? null, brand_id: p.brand_id ?? null, value_pence: p.value_pence ?? null }
  if (!live) { const x = { id: uid(), contact_name: '', contact_email: '', deadline: null, url: '', notes: '', source: 'manual', created_at: new Date().toISOString(), ...row } as PipelineItem; demo.pipeline.push(x); return x }
  const { data } = await db().from('life_pipeline' as never).insert(row as never).select('*').single()
  return (data ?? null) as PipelineItem | null
}

/* ---- Calendar ---- */
export async function listEvents(fromISO: string, toISO: string): Promise<LifeEvent[]> {
  if (!live) return demo.events.filter((e) => e.starts_at >= fromISO && e.starts_at <= toISO).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const { data } = await db().from('life_events' as never).select('id, brand_id, title, starts_at, ends_at, all_day, location, source').gte('starts_at', fromISO).lte('starts_at', toISO).order('starts_at').limit(300)
  return (data ?? []) as LifeEvent[]
}
export async function addEvent(e: Pick<LifeEvent, 'title' | 'starts_at'> & Partial<LifeEvent>): Promise<void> {
  const row = { title: e.title.trim(), starts_at: e.starts_at, ends_at: e.ends_at ?? null, location: e.location ?? '', brand_id: e.brand_id ?? null }
  if (!live) { demo.events.push({ id: uid(), all_day: false, source: 'manual', ...row } as LifeEvent); return }
  await db().from('life_events' as never).insert(row as never)
}

/* ---- Approvals ---- */
export async function listActions(): Promise<LifeAction[]> {
  if (!live) return demo.actions.filter((a) => a.status === 'pending')
  const { data } = await db().from('life_actions' as never).select('id, kind, summary, payload, status, created_at, brand_id').eq('status', 'pending').order('created_at', { ascending: false }).limit(20)
  return (data ?? []) as LifeAction[]
}
export async function listTeamApprovals(): Promise<TeamApproval[]> {
  if (!live) return [{ id: 'j1', task: 'Two Instagram posts for the sleep ritual launch', dept: 'growth', brand_id: null, created_at: at(0, 7) }]
  const { data } = await db().from('role_jobs').select('id, task, dept, brand_id, created_at').eq('status', 'done').eq('approval', 'pending').order('created_at', { ascending: false }).limit(20)
  return (data ?? []) as TeamApproval[]
}

/* ---- Functions ---- */
async function call<T>(fn: string, body: unknown): Promise<T & { error?: string }> {
  const { data } = await db().auth.getSession()
  const token = data.session?.access_token
  if (!token || !functionsBase) return { error: 'Sign in again to continue.' } as T & { error?: string }
  const res = await fetch(`${functionsBase}/${fn}`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })
  return res.json().catch(() => ({ error: `Copilot did not answer (${res.status}).` }))
}

export type EmailEdits = { to?: string; subject?: string; body?: string }
export async function decideAction(id: string, approve: boolean, edits?: EmailEdits): Promise<{ status?: string; error?: string }> {
  if (!live) { const a = demo.actions.find((x) => x.id === id); if (a) { Object.assign(a.payload, edits ?? {}); a.status = approve ? (a.kind === 'email' ? 'sent' : 'approved') : 'declined' } return { status: a?.status } }
  return call('life-sync', { op: 'decide', actionId: id, approve, edits })
}
export async function syncCalendar(): Promise<{ imported?: number; note?: string; error?: string }> {
  if (!live) return { imported: 0, note: 'Sample mode: the live app imports your published calendar.' }
  return call('life-sync', { op: 'calendar' })
}


/* ---- Opportunity radar (the Commercial Engine) ---- */
const demoOpp = (o: Partial<Opportunity> & Pick<Opportunity, 'id' | 'lane' | 'title' | 'org'>): Opportunity => ({
  category: 'other', summary: '', fit: 4, fit_detail: { sector: 4, scope: 4, ambition: 4, capability: 4, access: 3 }, action: 'watch', why: '', angle: '', money: '', value_pence: null,
  deadline: null, deadline_note: '', location: '', signal_date: null, product: '', source_name: '', url: '', source: 'engine', status: 'open',
  closed_reason: '', decision_note: '', change_note: '', pipeline_id: null, first_seen: at(0, 6), changed_at: null, last_checked: at(0, 6), ...o,
})
const demoRadar: Opportunity[] = [
  demoOpp({ id: 'o1', lane: 'outbound', category: 'signal', title: 'New wellness club inside a five-star resort', org: 'Thornfield Estate Hotels', fit: 5, fit_detail: { sector: 5, scope: 5, ambition: 4, capability: 5, access: 4 }, action: 'outreach_now', location: 'Cotswolds', signal_date: day(-1), source_name: 'Sample source', why: 'Hospitality and wellbeing meeting in one guest proposition: exactly where Hue & Heal offers more than UX.', angle: 'Pitch the whole wellness journey across the stay, pre-arrival to post-stay, with physical and digital touchpoints working as one.' }),
  demoOpp({ id: 'o2', lane: 'studio', category: 'tender', title: 'Immersive gallery: concept to installation', org: 'Riverside Museums Trust', fit: 5, action: 'partner', money: '£420,000', value_pence: 42000000, deadline: at(6, 17), deadline_note: 'Clarification questions close in 2 days', location: 'Leeds', source_name: 'Sample portal', why: 'A permanent immersive environment with narrative, interaction and visitor journey at its heart.', angle: 'Lead on experience concept, narrative architecture and interaction; partner with an AV and fabrication house for delivery.', change_note: '' }),
  demoOpp({ id: 'o3', lane: 'contracts', category: 'contract', title: 'Senior product designer, participant journeys', org: 'A national health research charity', fit: 4, action: 'pursue_now', money: '£500 to £600 a day', deadline: at(24, 17), location: 'London, hybrid', source_name: 'Sample job board', why: 'Well paid, health-adjacent and live on the original post.', angle: 'Lead with behavioural design and participant experience at scale.' }),
  demoOpp({ id: 'o4', lane: 'venture', category: 'grant', title: 'Innovation fund for health and work', org: 'A UK government department', fit: 3, fit_detail: { sector: 3, scope: 3, ambition: 3, capability: 3, access: 3 }, action: 'watch', product: 'Remedae', deadline: at(27, 17), source_name: 'Sample grant portal', why: 'Wellbeing and behaviour change overlap, but neither product solves the stated problem today.', angle: 'Do not reshape Remedae to apply.' }),
  demoOpp({ id: 'o5', lane: 'outbound', category: 'signal', title: 'Series A to expand across the Gulf', org: 'Luma Rituals', fit: 4, action: 'outreach_now', money: '$5m raised', location: 'Dubai', signal_date: day(-1), why: 'Wellness brand moving from online to physical retail with fresh capital.', angle: 'Pitch the experience system that travels with the expansion: retail, ritual, storytelling and loyalty.' }),
  demoOpp({ id: 'o6', lane: 'studio', category: 'tender', title: 'Website refresh framework lot', org: 'A district council', fit: 2, action: 'pass', source: 'contracts_finder', why: 'Generic website work with no design ambition.' }),
  demoOpp({ id: 'o7', lane: 'contracts', category: 'contract', title: 'HealthTech product designer, outside IR35', org: 'A digital health scaleup', fit: 4, action: 'pursue_now', status: 'closed', closed_reason: 'The original post says it is no longer accepting applications.', changed_at: at(0, 6) }),
]
const demoRun: RadarRun = { id: 'r1', status: 'done', started_at: at(0, 6, 30), finished_at: at(0, 6, 41), error: null, usage: { usd: 0.82, searches: 19 }, brief: {
  priorities: [
    { text: 'Write to Thornfield Estate Hotels today. Their new wellness club opened yesterday, and the whole-stay journey is a better opening than a club redesign.', opportunity_id: 'o1' },
    { text: 'Decide on the Riverside immersive gallery before Thursday, when clarification questions close. It needs an AV partner to bid.', opportunity_id: 'o2' },
    { text: 'Stop pursuing the outside-IR35 HealthTech role: the original post has closed, even though aggregators still list it.', opportunity_id: 'o7' },
  ],
  verdict: [
    { label: 'Best new prospect', text: 'Thornfield Estate Hotels, five out of five.', opportunity_id: 'o1' },
    { label: 'Best live studio contract', text: 'Riverside immersive gallery, five out of five.', opportunity_id: 'o2' },
    { label: 'Best paid contract for you', text: 'Senior product designer at the health research charity.', opportunity_id: 'o3' },
    { label: 'Product funding worth it', text: 'None today; do not reshape a product for a grant.', opportunity_id: null },
  ],
  insight: 'The strongest development is not a tender. A luxury hospitality group building wellness into its guest proposition is the client Hue & Heal should cultivate: wellbeing as an experience-design problem, not only a healthcare one.',
} }

export async function listOpportunities(): Promise<Opportunity[]> {
  if (!live) return demoRadar
  const since = new Date(Date.now() - 3 * 86400000).toISOString()
  const { data } = await db().from('radar_opportunities' as never).select('*')
    .or(`status.in.(open,watching,tracked),and(status.in.(closed,expired),changed_at.gte.${since})`)
    .order('fit', { ascending: false, nullsFirst: false }).order('first_seen', { ascending: false }).limit(300)
  return (data ?? []) as Opportunity[]
}
export async function latestRuns(): Promise<{ latest: RadarRun | null; briefed: RadarRun | null }> {
  if (!live) return { latest: demoRun, briefed: demoRun }
  const { data } = await db().from('radar_runs' as never).select('id, status, brief, usage, started_at, finished_at, error').order('started_at', { ascending: false }).limit(8)
  const runs = (data ?? []) as RadarRun[]
  const latest = runs[0] ?? null
  if (latest?.status === 'running') {
    const { data: jobs } = await db().from('radar_jobs' as never).select('lane, status').eq('run_id', latest.id)
    latest.lanes = (jobs ?? []) as { lane: string; status: string }[]
  }
  return { latest, briefed: runs.find((r) => r.brief) ?? null }
}
export async function radarDecide(id: string, decision: 'pursue' | 'watch' | 'pass' | 'reopen', note = ''): Promise<{ error?: string }> {
  if (!live) { const o = demoRadar.find((x) => x.id === id); if (o) { o.status = decision === 'pursue' ? 'tracked' : decision === 'watch' ? 'watching' : decision === 'pass' ? 'passed' : 'open'; o.decision_note = note } return {} }
  const { error } = await db().rpc('radar_decide' as never, { opp: id, decision, note } as never)
  return error ? { error: error.message } : {}
}
export async function runRadar(): Promise<{ runId?: string; note?: string; error?: string }> {
  if (!live) return { note: 'Sample mode: the live app runs the engine.' }
  return call('radar-engine', { op: 'run' })
}
export const isNew = (o: Opportunity) => Date.now() - new Date(o.first_seen).getTime() < 36 * 3600000
export const isUpdated = (o: Opportunity) => !!o.changed_at && !isNew(o) && Date.now() - new Date(o.changed_at).getTime() < 36 * 3600000 && !!o.change_note
export const isUrgent = (o: Opportunity) => { const d = daysUntil(o.deadline); return d !== null && d >= 0 && d <= 7 }

/* ---- The conversation ---- */
export async function listMessages(limit = 60): Promise<LifeMessage[]> {
  if (!live) return demo.messages
  const { data } = await db().from('life_messages' as never).select('id, role, text, via, actions, created_at').order('created_at', { ascending: false }).limit(limit)
  return ((data ?? []) as LifeMessage[]).reverse()
}
export async function ask(message: string, via: 'chat' | 'voice'): Promise<{ reply?: string; actions?: LifeMessage['actions']; pending?: LifeAction[]; error?: string }> {
  if (!live) {
    const now = new Date().toISOString()
    demo.messages.push({ id: uid(), role: 'user', text: message, via, actions: [], created_at: now })
    const reply = 'This is the sample life, so I can\'t act on that here. Signed in, I would do it now and tell you what changed.'
    demo.messages.push({ id: uid(), role: 'assistant', text: reply, via, actions: [], created_at: now })
    return { reply, actions: [], pending: demo.actions.filter((a) => a.status === 'pending') }
  }
  return call('life-agent', { message, via })
}

/* ---- Formatting ---- */
export const money = (pence: number | null) => (pence ? `£${Math.round(pence / 100).toLocaleString('en-GB')}` : '')
export const shortDate = (iso: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '')
export const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
export const isToday = (iso: string | null) => !!iso && new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toDateString() === new Date().toDateString()
export const daysUntil = (iso: string | null) => (iso ? Math.round((new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).getTime() - Date.now()) / 86400000) : null)

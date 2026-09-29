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
  tender_keywords: string[]; calendar_ics: string; voice_replies: boolean
}
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

export const EMPTY_PROFILE: LifeProfile = { display_name: '', mission: '', purpose: '', values_list: [], focus_areas: [], weekly_focus: '', tender_keywords: [], calendar_ics: '', voice_replies: false }
export const live = isSupabaseConfigured && !!supabase
const db = () => supabase!

/* ---- Local-mode sample life ---- */
const at = (dayOffset: number, h: number, m = 0) => { const d = new Date(); d.setDate(d.getDate() + dayOffset); d.setHours(h, m, 0, 0); return d.toISOString() }
const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10) }
const uid = () => Math.random().toString(36).slice(2, 10)
const demo = {
  profile: { ...EMPTY_PROFILE, display_name: 'Maria', mission: 'Build calm, beautiful tools that help people heal and grow, and a studio that lets me do my best work without burning out.', purpose: 'Design as care: for people, for the planet, for myself.', weekly_focus: 'Get Remedae\'s pilot testers onboarded and send the two university proposals.', focus_areas: [{ name: 'Remedae pilot' }, { name: 'Studio pipeline' }, { name: 'Health and rest' }], tender_keywords: ['service design', 'user research', 'wellbeing'], calendar_ics: '' } as LifeProfile,
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

export async function decideAction(id: string, approve: boolean): Promise<{ status?: string; error?: string }> {
  if (!live) { const a = demo.actions.find((x) => x.id === id); if (a) a.status = approve ? (a.kind === 'email' ? 'sent' : 'approved') : 'declined'; return { status: a?.status } }
  return call('life-sync', { op: 'decide', actionId: id, approve })
}
export async function scanTenders(): Promise<{ added?: number; note?: string; error?: string }> {
  if (!live) return { added: 0, note: 'Sample mode: the live app scans Contracts Finder.' }
  return call('life-sync', { op: 'tenders' })
}
export async function syncCalendar(): Promise<{ imported?: number; note?: string; error?: string }> {
  if (!live) return { imported: 0, note: 'Sample mode: the live app imports your published calendar.' }
  return call('life-sync', { op: 'calendar' })
}

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

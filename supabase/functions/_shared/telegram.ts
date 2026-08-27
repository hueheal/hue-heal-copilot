// ============================================================================
// Telegram transport. One bot serves every workspace; a chat is bound to one
// (owner, brand) pair by org_channels, so a message in a chat can only ever
// reach the roles of that workspace.
// ============================================================================
const TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const API = (method: string) => `https://api.telegram.org/bot${TOKEN}/${method}`

const LIMIT = 3800 // Telegram caps at 4096; leave room for entities

/** Split on paragraph boundaries so a long deliverable stays readable. */
export function chunk(text: string, limit = LIMIT): string[] {
  if (text.length <= limit) return [text]
  const out: string[] = []
  let buf = ''
  for (const para of text.split('\n')) {
    const piece = para.length > limit ? para.slice(0, limit) : para
    if ((buf + '\n' + piece).length > limit) { if (buf) out.push(buf); buf = piece }
    else buf = buf ? `${buf}\n${piece}` : piece
  }
  if (buf) out.push(buf)
  return out
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export const b = (s: string) => `<b>${esc(s)}</b>`
export const plain = esc

export async function sendMessage(chatId: string, html: string): Promise<void> {
  if (!TOKEN) return
  for (const part of chunk(html)) {
    await fetch(API('sendMessage'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: part, parse_mode: 'HTML', disable_web_page_preview: true }),
    }).catch(() => {})
  }
}

export const hasTelegram = () => Boolean(TOKEN)

/** Render a deliverable for a phone: headline, then the shape of it. */
export function formatDeliverable(
  roleName: string,
  kind: string,
  d: { title?: string; summary?: string; sections?: { heading: string; body: string }[]; actions?: { kind: string; topic: string }[]; needs?: { title: string }[]; experiments?: { title: string }[]; handoffs?: { to?: string; subject?: string }[] },
  opts: { full?: boolean } = {},
): string {
  const label = kind === 'digest' ? 'weekly digest' : kind === 'scheduled' ? 'standing task' : 'deliverable'
  const out: string[] = [`${b(roleName)} · ${plain(label)}`, '', b(d.title ?? 'Untitled'), plain(d.summary ?? '')]
  if (opts.full) {
    for (const s of d.sections ?? []) out.push('', b(s.heading), plain(s.body))
  } else if ((d.sections ?? []).length) {
    out.push('', plain((d.sections ?? []).map((s) => `• ${s.heading}`).join('\n')))
  }
  if ((d.actions ?? []).length) {
    out.push('', b('Proposed'), plain((d.actions ?? []).map((a) => `• [${a.kind}] ${a.topic}`).join('\n')))
  }
  if ((d.handoffs ?? []).length) {
    out.push('', b('Handed to colleagues'), plain((d.handoffs ?? []).map((h) => `• ${h.to}: ${h.subject}`).join('\n')))
  }
  const pending = [...(d.needs ?? []).map((n) => `• request: ${n.title}`), ...(d.experiments ?? []).map((e) => `• experiment: ${e.title}`)]
  if (pending.length) out.push('', b('Awaiting your call'), plain(pending.join('\n')), plain('Reply /inbox to approve or decline.'))
  return out.join('\n')
}

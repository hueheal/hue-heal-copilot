import { supabase, functionsBase } from './supabase'

/* The copilot's connection to the Hue & Heal website (hueandheal.com, an
   Astro site on Netlify). Publishing marks a journal piece published and
   rebuilds the site; emails are rendered by the site's own design and sent
   to the Hue & Heal list. All of it runs through the hh-site function. */

export const HH_SITE = 'https://hueandheal.netlify.app' // becomes https://www.hueandheal.com when the domain moves

async function call<T>(body: Record<string, unknown>): Promise<T & { error?: string }> {
  if (!supabase || !functionsBase) return { error: 'Not connected' } as T & { error?: string }
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return { error: 'Sign in first' } as T & { error?: string }
  const res = await fetch(`${functionsBase}/hh-site`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })
  return res.json().catch(() => ({ error: `The website connection did not answer (${res.status}).` }))
}

export const publishToSite = (articleId: string) =>
  call<{ status?: string; url?: string; rebuilt?: boolean; missingHero?: boolean }>({ op: 'publish', articleId })
export const unpublishFromSite = (articleId: string) =>
  call<{ status?: string; rebuilt?: boolean }>({ op: 'unpublish', articleId })

export type SiteEmailType = 'letter' | 'essay'
export const renderSiteEmail = (type: SiteEmailType, data: Record<string, unknown>) =>
  call<{ subject?: string; html?: string; text?: string }>({ op: 'render', type, data })
export const sendSiteEmail = (type: SiteEmailType, data: Record<string, unknown>, mode: 'test' | 'list', groups?: string[]) =>
  call<{ sentTo?: string; sent?: number; subject?: string }>({ op: 'email', type, data, mode, groups })

/* The essay email for a published journal piece, in the site renderer's shape. */
export function essayEmailData(a: { title: string; dek: string; slug: string; hero?: string; readingTime?: string; takeaways?: string[] }) {
  return { title: a.title, dek: a.dek, url: `/journal/${a.slug}`, image: a.hero || undefined, readingTime: a.readingTime || undefined, takeaways: a.takeaways ?? [], kicker: 'From the Journal' }
}

// Which Resend key sends for which domain. Each business verifies its own
// domain in Resend, so a Remedae email (from @remedae.app) goes out on
// Remedae's key and everything else on the studio's key.
// Secrets: RESEND_API_KEY (studio, hueandheal.com), RESEND_API_KEY_REMEDAE.
const KEYS: Record<string, string> = {
  'remedae.app': 'RESEND_API_KEY_REMEDAE',
}

export function domainOf(from: string): string {
  return (from.match(/<([^>]+)>/)?.[1] ?? from).split('@')[1]?.trim().toLowerCase() ?? ''
}

/* The key for this sender, or '' with a plain reason when it is missing. */
export function resendKeyFor(from: string): { key: string; missing?: string } {
  const domain = domainOf(from)
  const name = KEYS[domain]
  if (name) {
    const key = Deno.env.get(name) ?? ''
    return key ? { key } : { key: '', missing: `Email from ${domain} is not connected yet: the ${name} secret is not set.` }
  }
  const key = Deno.env.get('RESEND_API_KEY') ?? ''
  return key ? { key } : { key: '', missing: 'Email is not configured on the server (RESEND_API_KEY).' }
}

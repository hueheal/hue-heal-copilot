// ============================================================================
// House-name enforcement. The studio is written "Hue & Heal", exactly: models
// drift to "Hue and Heal" / "Hue and Heals" in prose no matter what the prompt
// says, so every writer function passes its generated payload through
// enforceBrandName() before returning or saving it.
// Deliberately conservative: requires the & form or whitespace around "and",
// so domains ("hueandheal.com") and the lowercase wordmark ("hue&heal.") are
// never touched.
// ============================================================================

// All-caps occurrences (headings) keep their case; everything else becomes
// the canonical "Hue & Heal".
const keepCaps = (m: string) => (m === m.toUpperCase() ? 'HUE & HEAL' : 'Hue & Heal')
const FIXES: [RegExp, string | ((m: string) => string)][] = [
  [/\bhue\s+(?:and|\+|n)\s+heals?\b/gi, keepCaps], // "hue and heal(s)" in any case
  [/\bhue\s+&\s+heals?\b/gi, keepCaps], // "hue & heal(s)" with spaces, any case
  [/\bHue\s*&\s*Heals\b/g, 'Hue & Heal'], // "Hue & Heals" / "Hue&Heals"
  [/\bHue\s*&\s*Heal\b/g, 'Hue & Heal'], // normalise "Hue&Heal" / odd spacing
  // NOT matched on purpose: "hueandheal.com" (no spaces) and the lowercase
  // wordmark "hue&heal." (no spaces), which are design/domain, not prose.
]

export function fixBrandName(text: string): string {
  let out = text
  for (const [re, to] of FIXES) out = typeof to === 'string' ? out.replace(re, to) : out.replace(re, to)
  return out
}

/** Deep-apply fixBrandName to every string in a JSON-ish payload. */
export function enforceBrandName<T>(value: T): T {
  if (typeof value === 'string') return fixBrandName(value) as T
  if (Array.isArray(value)) return value.map((v) => enforceBrandName(v)) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = enforceBrandName(v)
    return out as T
  }
  return value
}

/** The system-prompt line every writer carries. */
export function brandNameRule(brandName?: string | null): string {
  const n = (brandName ?? 'Hue & Heal').trim() || 'Hue & Heal'
  return n === 'Hue & Heal'
    ? 'The studio\'s name is written exactly "Hue & Heal", with an ampersand: never "Hue and Heal", never "Hue and Heals", never "Hue & Heals", never "H&H".'
    : `The brand's name is written exactly "${n}": never reworded, pluralised, or expanded.`
}

import { supabase, isSupabaseConfigured, functionsBase } from './supabase'

/* Sends uploaded brand inputs to the synthesize-brand edge function, which asks
   Claude (PDF + vision) to extract a starting brand identity. Returns a partial
   set of brand fields to pre-fill the onboarding wizard (review-then-apply). */

export interface SynthesisResult {
  name?: string
  accent_color?: string
  display_font?: 'ivyora' | 'poppins'
  tone_of_voice?: string
  writing_guidelines?: string
  image_master_prompt?: string
  image_negatives?: string
  suggested_modules?: string[]
  summary?: string
}

interface FileInput { name: string; type: string; dataBase64: string }

async function toInput(file: File): Promise<FileInput> {
  const dataBase64 = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = reject
    r.readAsDataURL(file)
  })
  return { name: file.name, type: file.type || 'application/octet-stream', dataBase64 }
}

export async function synthesizeBrand(
  files: File[],
  notes = '',
): Promise<{ result: SynthesisResult | null; error?: string }> {
  if (!(isSupabaseConfigured && supabase && functionsBase)) return { result: null, error: 'Not connected' }
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return { result: null, error: 'Sign in first' }
  try {
    const inputs = await Promise.all(files.map(toInput))
    const res = await fetch(`${functionsBase}/synthesize-brand`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ files: inputs, notes }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { result: null, error: data?.error ? String(data.error) : `Synthesis ${res.status}` }
    return { result: (data?.brand ?? null) as SynthesisResult | null }
  } catch (e) {
    return { result: null, error: String(e) }
  }
}

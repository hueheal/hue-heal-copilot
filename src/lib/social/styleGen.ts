import { supabase, isSupabaseConfigured, functionsBase } from '../supabase'
import type { SocialStyle } from './style'

/* Calls generate-social-style: inspiration + reference images -> a SocialStyle
   profile for the brand, for review-then-save in the "social look" setup. */

async function imgToInput(file: File): Promise<{ type: string; dataBase64: string }> {
  const dataBase64 = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = reject
    r.readAsDataURL(file)
  })
  return { type: file.type || 'image/jpeg', dataBase64 }
}

export async function generateSocialStyle(input: {
  inspiration: string
  files: File[]
  brandName?: string
  accentColor?: string
}): Promise<{ style: SocialStyle | null; error?: string }> {
  if (!(isSupabaseConfigured && supabase && functionsBase)) return { style: null, error: 'Not connected' }
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return { style: null, error: 'Sign in first' }
  try {
    const images = await Promise.all(input.files.filter((f) => f.type.startsWith('image/')).slice(0, 4).map(imgToInput))
    const res = await fetch(`${functionsBase}/generate-social-style`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ inspiration: input.inspiration, images, brandName: input.brandName, accentColor: input.accentColor }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { style: null, error: data?.error ? String(data.error) : `Style ${res.status}` }
    return { style: (data?.style ?? null) as SocialStyle | null }
  } catch (e) {
    return { style: null, error: String(e) }
  }
}

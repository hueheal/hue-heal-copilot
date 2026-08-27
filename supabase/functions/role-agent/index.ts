// ============================================================================
// Hue & Heal :: role-agent
// One on-demand run of a workspace role (persona agent). The client sends the
// role definition, the task, the live workspace snapshot and the brand pack;
// this returns the structured deliverable. verify_jwt on.
// Deploy:  npx supabase functions deploy role-agent --project-ref <ref>
// ============================================================================
import { corsHeaders, json } from '../_shared/cors.ts'
import { runPersona, type RoleDef, type BrandDef } from '../_shared/roleCore.ts'

interface Body { role: RoleDef; task: string; facts: string; brand?: BrandDef }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  let body: Body
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }
  if (!body.role?.name || !body.task?.trim()) return json({ error: 'role and task are required' }, 400)
  try {
    const deliverable = await runPersona(body.role, body.brand ?? {}, body.facts ?? '', body.task)
    return json({ deliverable })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502)
  }
})

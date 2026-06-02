// Edge Function: delete a user (auth.users + cascades to public."user").
// Only callable by admins. Refuses to delete the caller themselves.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
    } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Unauthorized' }, 401)

    const { data: profile, error: profileErr } = await admin
      .from('user')
      .select('app_role')
      .eq('id', user.id)
      .single()
    if (profileErr || profile?.app_role !== 'admin') {
      return json({ error: 'Forbidden — admin only' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const targetId = String(body?.userId ?? '')
    if (!targetId) return json({ error: 'userId required' }, 400)

    if (targetId === user.id) {
      return json({ error: 'You cannot delete your own account' }, 400)
    }

    const { error } = await admin.auth.admin.deleteUser(targetId)
    if (error) return json({ error: error.message }, 400)

    return json({ ok: true })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

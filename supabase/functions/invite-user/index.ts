// Edge Function: invite a teacher by email.
// Only callable by admins (verified via JWT against public."user".app_role).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Admin client: bypasses RLS, used for auth.admin operations
    const admin = createClient(supabaseUrl, serviceRoleKey)

    // User client: respects the caller's JWT for identity verification
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
    } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Unauthorized' }, 401)

    // Verify caller is an admin (queried via admin client to bypass RLS)
    const { data: profile, error: profileErr } = await admin
      .from('user')
      .select('app_role')
      .eq('id', user.id)
      .single()
    if (profileErr || profile?.app_role !== 'admin') {
      return json({ error: 'Forbidden — admin only' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const email = String(body?.email ?? '').trim().toLowerCase()
    if (!email || !email.includes('@')) {
      return json({ error: 'Valid email required' }, 400)
    }

    // redirectTo tells Supabase where to send the user after clicking the link.
    // The frontend passes its own origin so this works in every environment
    // (local dev, staging, production) without hardcoding URLs here.
    const redirectTo = body?.redirectTo ? String(body.redirectTo) : undefined

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      ...(redirectTo ? { redirectTo } : {}),
    })
    if (error) {
      // Log the full error so it appears in the Edge Function logs dashboard
      console.error('inviteUserByEmail failed:', error.status, error.message, error)
      return json({ error: error.message }, 400)
    }

    return json({ ok: true, user: { id: data.user?.id, email: data.user?.email } })
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

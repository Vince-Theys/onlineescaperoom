import { supabase } from '../utils/supabase'
import type { AppUser, SessionWithTeacher } from '../types'

/**
 * Fetch ALL sessions across every teacher.
 * RLS allows this only for admins (is_admin() policy).
 * Profiles are fetched separately and merged in JS because there is no
 * explicit FK between session.created_by and profiles.id.
 */
export async function listAllSessions(): Promise<SessionWithTeacher[]> {
  const [{ data: sessions, error: sessionsError }, { data: users, error: usersError }] =
    await Promise.all([
      supabase
        .from('session')
        .select('*, escape_room!inner(level_count)')
        .order('updated_at', { ascending: false }),
      supabase.from('user').select('id, name'),
    ])

  if (sessionsError) throw sessionsError
  if (usersError) throw usersError

  const nameMap: Record<string, string> = {}
  for (const u of users ?? []) {
    nameMap[u.id] = u.name
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (sessions ?? []).map(({ escape_room, ...s }: any) => ({
    ...s,
    level_count: escape_room?.level_count ?? 5,
    teacher_email: nameMap[s.created_by] ?? s.created_by,
  }))
}

/**
 * Fetch all user profiles, ordered oldest-first.
 * RLS allows this only for admins.
 */
export async function listUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from('user')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

/**
 * Promote or demote a user.
 * RLS allows this only for admins.
 */
export async function updateUserRole(
  userId: string,
  app_role: 'teacher' | 'admin',
): Promise<void> {
  const { error } = await supabase
    .from('user')
    .update({ app_role })
    .eq('id', userId)
  if (error) throw error
}

/**
 * Send a Supabase invite email to the given address.
 * Calls the `invite-user` Edge Function (requires service_role on the server side).
 */
export async function inviteUser(email: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: {
      email,
      // Send users to the accept-invite page so they can set a password.
      // window.location.origin handles localhost, staging, and production.
      redirectTo: `${window.location.origin}/accept-invite`,
    },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}

/**
 * Permanently delete a user (auth + cascade to public."user" + their sessions).
 * Calls the `delete-user` Edge Function.
 */
export async function deleteUser(userId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-user', {
    body: { userId },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}

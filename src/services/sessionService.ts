import { supabase } from '../utils/supabase';
import type { Session } from '../types';

/** Flattens the escape_room join into a flat Session object */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenSession(raw: any): Session {
  const { escape_room, ...rest } = raw
  return { ...rest, level_count: escape_room?.level_count ?? 5 }
}

export async function listSessions(): Promise<Session[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('session')
    .select('*, escape_room!inner(level_count)')
    .eq('created_by', user.id)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(flattenSession);
}

export async function getSession(id: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('session')
    .select('*, escape_room!inner(level_count)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? flattenSession(data) : null;
}

export async function startSession(id: string): Promise<Session> {
  const { data, error } = await supabase
    .from('session')
    .update({ started_at: new Date().toISOString(), current_level: 1 })
    .eq('id', id)
    .select('*, escape_room!inner(level_count)')
    .single();
  if (error) throw error;
  return flattenSession(data);
}

export async function updateSession(
  id: string,
  patch: Partial<Pick<Session, 'team_name' | 'status'>>
): Promise<Session> {
  const { data, error } = await supabase
    .from('session')
    .update(patch)
    .eq('id', id)
    .select('*, escape_room!inner(level_count)')
    .single();
  if (error) throw error;
  return flattenSession(data);
}

export async function deleteSession(id: string): Promise<void> {
  // Read escape_room_id before deleting so we can clean up the 1:1 room afterwards
  const session = await getSession(id);

  const { error: sessionError } = await supabase
    .from('session')
    .delete()
    .eq('id', id);
  if (sessionError) throw sessionError;

  if (session?.escape_room_id) {
    await supabase.from('escape_room').delete().eq('id', session.escape_room_id);
  }
}

export async function restartSession(id: string): Promise<Session> {
  const { data, error } = await supabase
    .from('session')
    .update({ started_at: new Date().toISOString(), current_level: 1, status: 'active', level_attempts: null })
    .eq('id', id)
    .select('*, escape_room!inner(level_count)')
    .single();
  if (error) throw error;
  return flattenSession(data);
}

export async function advanceLevel(id: string, nextLevel: number, levelAttempts: Record<string, number>): Promise<void> {
  const { error } = await supabase
    .from('session')
    .update({ current_level: nextLevel, level_attempts: levelAttempts })
    .eq('id', id)
  if (error) throw error
}

export async function completeSession(id: string, levelAttempts: Record<string, number>): Promise<void> {
  const { error } = await supabase
    .from('session')
    .update({ status: 'completed', level_attempts: levelAttempts })
    .eq('id', id)
  if (error) throw error
}

export async function resetSession(id: string): Promise<void> {
  const { error } = await supabase
    .from('session')
    .update({ current_level: 1, status: 'active', started_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function createSession(teamName: string, levelCount: number = 5): Promise<Session> {
  const { data: { user } } = await supabase.auth.getUser();

  // Each session gets its own escape room (1:1 in MVP)
  const { data: room, error: roomError } = await supabase
    .from('escape_room')
    .insert({ title: teamName, level_count: levelCount, ...(user && { created_by: user.id }) })
    .select()
    .single();
  if (roomError) throw roomError;

  const { data: session, error: sessionError } = await supabase
    .from('session')
    .insert({
      team_name: teamName,
      escape_room_id: room.id,
      ...(user && { created_by: user.id }),
      status: 'active',
    })
    .select()
    .single();
  if (sessionError) throw sessionError;

  return { ...session, level_count: room.level_count };
}

export async function duplicateSession(sourceSessionId: string): Promise<Session> {
  const { data: { user } } = await supabase.auth.getUser()

  // 1 — fetch source session + its escape_room
  const source = await getSession(sourceSessionId)
  if (!source) throw new Error('Sessie niet gevonden')

  // 2 — create new escape_room with same level_count
  const { data: newRoom, error: roomErr } = await supabase
    .from('escape_room')
    .insert({
      title: `${source.team_name} (kopie)`,
      level_count: source.level_count,
      ...(user && { created_by: user.id }),
    })
    .select()
    .single()
  if (roomErr) throw roomErr

  // 3 — create new session (fresh progress, status active)
  const { data: newSession, error: sessionErr } = await supabase
    .from('session')
    .insert({
      team_name: `${source.team_name} (kopie)`,
      escape_room_id: newRoom.id,
      status: 'active',
      ...(user && { created_by: user.id }),
    })
    .select()
    .single()
  if (sessionErr) throw sessionErr

  // 4 — copy all questions + answer_options
  const { data: questions } = await supabase
    .from('question')
    .select('*, answer_option(*)')
    .eq('escape_room_id', source.escape_room_id)
    .order('level_number', { ascending: true })

  for (const q of questions ?? []) {
    const { data: newQ, error: qErr } = await supabase
      .from('question')
      .insert({
        escape_room_id: newRoom.id,
        level_number: q.level_number,
        question_text: q.question_text,
        question_type: q.question_type,
        room_name: q.room_name,
        room_theme: q.room_theme,
        room_icon: q.room_icon,
        room_tint: q.room_tint,
      })
      .select()
      .single()
    if (qErr) throw qErr

    if (q.answer_option?.length) {
      const { error: aErr } = await supabase
        .from('answer_option')
        .insert(
          q.answer_option.map((o: { option_text: string; is_correct: boolean }) => ({
            question_id: newQ.id,
            option_text: o.option_text,
            is_correct: o.is_correct,
          }))
        )
      if (aErr) throw aErr
    }
  }

  return { ...newSession, level_count: newRoom.level_count }
}

export async function updateLevelCount(escapeRoomId: string, newCount: number): Promise<void> {
  const { error } = await supabase
    .from('escape_room')
    .update({ level_count: newCount })
    .eq('id', escapeRoomId)
  if (error) throw error
}

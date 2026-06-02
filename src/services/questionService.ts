import { supabase } from '../utils/supabase';
import type { QuestionWithOptions } from '../types';

export async function listQuestionsWithOptions(
  escapeRoomId: string,
): Promise<QuestionWithOptions[]> {
  const { data, error } = await supabase
    .from('question')
    .select('*, answer_options:answer_option(*)')
    .eq('escape_room_id', escapeRoomId)
    .order('level_number', { ascending: true });
  if (error) throw error;
  return (data ?? []) as QuestionWithOptions[];
}

export async function createQuestion(payload: {
  escapeRoomId: string;
  levelNumber: number;
  questionText: string;
  questionType?: string;
  roomName?: string | null;
  roomTheme?: string | null;
  roomIcon?: string | null;
  roomTint?: string | null;
  options: { text: string; isCorrect: boolean }[];
}): Promise<QuestionWithOptions> {
  const { data: question, error: qErr } = await supabase
    .from('question')
    .insert({
      escape_room_id: payload.escapeRoomId,
      level_number: payload.levelNumber,
      question_text: payload.questionText,
      question_type: payload.questionType ?? 'multiple_choice',
      room_name:  payload.roomName  ?? null,
      room_theme: payload.roomTheme ?? null,
      room_icon:  payload.roomIcon  ?? null,
      room_tint:  payload.roomTint  ?? null,
    })
    .select()
    .single();
  if (qErr) throw qErr;

  const { data: answer_options, error: aErr } = await supabase
    .from('answer_option')
    .insert(
      payload.options.map((o) => ({
        question_id: question.id,
        option_text: o.text,
        is_correct: o.isCorrect,
      })),
    )
    .select();
  if (aErr) throw aErr;

  return { ...question, answer_options: answer_options ?? [] };
}

export async function updateQuestion(
  id: string,
  patch: {
    questionText: string;
    questionType?: string;
    roomName?: string | null;
    roomTheme?: string | null;
    roomIcon?: string | null;
    roomTint?: string | null;
    options: { text: string; isCorrect: boolean }[];
  },
): Promise<QuestionWithOptions> {
  const { data: question, error: qErr } = await supabase
    .from('question')
    .update({
      question_text: patch.questionText,
      ...(patch.questionType ? { question_type: patch.questionType } : {}),
      room_name:  patch.roomName  ?? null,
      room_theme: patch.roomTheme ?? null,
      room_icon:  patch.roomIcon  ?? null,
      room_tint:  patch.roomTint  ?? null,
    })
    .eq('id', id)
    .select()
    .single();
  if (qErr) throw qErr;

  const { error: delErr } = await supabase
    .from('answer_option')
    .delete()
    .eq('question_id', id);
  if (delErr) throw delErr;

  const { data: answer_options, error: aErr } = await supabase
    .from('answer_option')
    .insert(
      patch.options.map((o) => ({
        question_id: id,
        option_text: o.text,
        is_correct: o.isCorrect,
      })),
    )
    .select();
  if (aErr) throw aErr;

  return { ...question, answer_options: answer_options ?? [] };
}

export async function getQuestionCountsByEscapeRoom(
  escapeRoomIds: string[],
): Promise<Record<string, number>> {
  if (escapeRoomIds.length === 0) return {};
  const { data, error } = await supabase
    .from('question')
    .select('escape_room_id')
    .in('escape_room_id', escapeRoomIds);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.escape_room_id] = (counts[row.escape_room_id] ?? 0) + 1;
  }
  return counts;
}

export async function deleteQuestion(
  id: string,
  allQuestions: QuestionWithOptions[],
): Promise<void> {
  const { error: delOptErr } = await supabase
    .from('answer_option')
    .delete()
    .eq('question_id', id);
  if (delOptErr) throw delOptErr;

  const { error: delQErr } = await supabase
    .from('question')
    .delete()
    .eq('id', id);
  if (delQErr) throw delQErr;

  const survivors = allQuestions
    .filter((q) => q.id !== id)
    .sort((a, b) => a.level_number - b.level_number);

  await Promise.all(
    survivors
      .filter((q, i) => q.level_number !== i + 1)
      .map((q) =>
        supabase
          .from('question')
          .update({ level_number: survivors.indexOf(q) + 1 })
          .eq('id', q.id),
      ),
  );
}

/** Reorders questions by updating their level_number to match the given ordered list of question IDs. */
export async function reorderLevels(
  orderedQuestionIds: (string | null)[]
): Promise<void> {
  const updates = orderedQuestionIds
    .map((id, i) => ({ id, level_number: i + 1 }))
    .filter((u): u is { id: string; level_number: number } => u.id !== null)

  for (const { id, level_number } of updates) {
    const { error } = await supabase
      .from('question')
      .update({ level_number })
      .eq('id', id)
    if (error) throw error
  }
}

/** Deletes all questions with level_number above maxLevel (answer_options cascade automatically) */
export async function deleteQuestionsAboveLevel(
  escapeRoomId: string,
  maxLevel: number,
): Promise<void> {
  const { error } = await supabase
    .from('question')
    .delete()
    .eq('escape_room_id', escapeRoomId)
    .gt('level_number', maxLevel)
  if (error) throw error
}

export interface Session {
  id: string
  escape_room_id: string
  created_by: string
  team_name: string
  current_level: number | null
  status: "active" | "completed"
  started_at: string | null
  updated_at: string
  level_attempts: Record<string, number> | null
  level_count: number
}

export interface Question {
  id: string
  escape_room_id: string
  level_number: number
  question_text: string
  question_type: string
  room_name:  string | null
  room_theme: string | null
  room_icon:  string | null
  room_tint:  string | null
}

export interface AnswerOption {
  id: string
  question_id: string
  option_text: string
  is_correct: boolean
}

export interface QuestionWithOptions extends Question {
  answer_options: AnswerOption[]
}

export interface AppUser {
  id: string
  /** DB column is `name` but contains the user's email address */
  name: string;
  app_role: 'teacher' | 'admin';
  /** 'pending' = invited but hasn't accepted yet, 'active' = signed in at least once */
  status: 'pending' | 'active';
  created_at: string;
}

export interface SessionWithTeacher extends Session {
  teacher_email: string
}

export interface SessionWithSetup extends Session {
  questionCount: number
  teacher_email?: string
}

export type AnswerState = "idle" | "correct" | "wrong"

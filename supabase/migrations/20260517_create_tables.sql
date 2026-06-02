-- ─────────────────────────────────────────────────────────────────────────────
-- Base schema: create all application tables.
-- Uses CREATE TABLE IF NOT EXISTS throughout so this is safe to run against
-- the production database where tables were created manually before migrations
-- were introduced. On a fresh environment (CI, staging, new developer) this
-- creates everything from scratch so the subsequent RLS migrations can run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── user ─────────────────────────────────────────────────────────────────────
-- Mirrors auth.users. "user" is a reserved word in PostgreSQL → always quote it.
CREATE TABLE IF NOT EXISTS public."user" (
  id         UUID PRIMARY KEY,           -- matches auth.users.id
  name       TEXT,                       -- stores the user's email address
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  app_role   TEXT NOT NULL DEFAULT 'teacher' CHECK (app_role IN ('teacher', 'admin')),
  status     TEXT NOT NULL DEFAULT 'active'  CHECK (status  IN ('pending', 'active'))
);

-- ─── escape_room ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS escape_room (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by  UUID REFERENCES public."user"(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── question ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS question (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escape_room_id UUID NOT NULL REFERENCES escape_room(id) ON DELETE CASCADE,
  level_number  INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice'
);

-- ─── answer_option ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS answer_option (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct  BOOLEAN NOT NULL DEFAULT false
);

-- ─── session ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escape_room_id UUID NOT NULL REFERENCES escape_room(id) ON DELETE CASCADE,
  created_by     UUID REFERENCES public."user"(id) ON DELETE SET NULL,
  team_name      TEXT NOT NULL,
  current_level  INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  level_attempts JSONB
);

-- ─── progress ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES session(id)  ON DELETE CASCADE,
  question_id  UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  given_answer TEXT,
  is_correct   BOOLEAN
);

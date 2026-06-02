-- ─────────────────────────────────────────────────────────────────────────────
-- Session isolation: teachers see only their own sessions.
-- All CREATE POLICY statements are wrapped in DO $$ blocks so re-running this
-- migration (or running it after 20260517_create_tables on production where
-- policies already exist) does not error out.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Enable RLS on all tables ─────────────────────────────────────────────────
ALTER TABLE session       ENABLE ROW LEVEL SECURITY;
ALTER TABLE escape_room   ENABLE ROW LEVEL SECURITY;
ALTER TABLE question      ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_option ENABLE ROW LEVEL SECURITY;

-- ─── session ──────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "teacher_owns_session" ON session
    FOR ALL TO authenticated
    USING     (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_session" ON session
    FOR SELECT TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "anon_update_session_progress" ON session
    FOR UPDATE TO anon
    USING     (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── escape_room ──────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "teacher_owns_escape_room" ON escape_room
    FOR ALL TO authenticated
    USING     (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_escape_room" ON escape_room
    FOR SELECT TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── question ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "teacher_owns_question" ON question
    FOR ALL TO authenticated
    USING (
      escape_room_id IN (
        SELECT id FROM escape_room WHERE created_by = auth.uid()
      )
    )
    WITH CHECK (
      escape_room_id IN (
        SELECT id FROM escape_room WHERE created_by = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_question" ON question
    FOR SELECT TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── answer_option ────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "teacher_owns_answer_option" ON answer_option
    FOR ALL TO authenticated
    USING (
      question_id IN (
        SELECT q.id FROM question q
        JOIN escape_room r ON r.id = q.escape_room_id
        WHERE r.created_by = auth.uid()
      )
    )
    WITH CHECK (
      question_id IN (
        SELECT q.id FROM question q
        JOIN escape_room r ON r.id = q.escape_room_id
        WHERE r.created_by = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_answer_option" ON answer_option
    FOR SELECT TO anon
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Admin role system
-- Adds app_role + status columns, trigger, is_admin() helper, and RLS.
-- All CREATE POLICY statements use DO $$ EXCEPTION WHEN duplicate_object so
-- this migration is safe to re-run and safe after 20260517_create_tables on
-- production where some objects may already exist.
--
-- IMPORTANT: we use `app_role` (not `role`) deliberately. Supabase's auth.users
-- table has a `role` column that PostgREST reads to issue `SET LOCAL ROLE` on
-- every request. Naming our column `role` would break every API call with
-- `role "admin" does not exist`. `app_role` keeps the two concepts separate.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Clean up a profiles table that an earlier failed run may have left ───────
DROP TABLE IF EXISTS profiles;

-- ─── Add app_role column (20260517 already creates it via IF NOT EXISTS) ──────
ALTER TABLE public."user"
  ADD COLUMN IF NOT EXISTS app_role TEXT NOT NULL DEFAULT 'teacher'
  CHECK (app_role IN ('teacher', 'admin'));

-- Remove legacy `role` column if it exists from an earlier iteration
ALTER TABLE public."user" DROP COLUMN IF EXISTS role;

-- ─── Auto-populate "user" row for every new sign-up ──────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public."user" (id, name)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── is_admin() helper ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."user" WHERE id = auth.uid() AND app_role = 'admin'
  );
$$;

-- ─── RLS on "user" ────────────────────────────────────────────────────────────
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "read_own_user" ON public."user"
    FOR SELECT TO authenticated
    USING (id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_read_all_users" ON public."user"
    FOR SELECT TO authenticated
    USING (is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_update_users" ON public."user"
    FOR UPDATE TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Admin read-all policies on game tables ───────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "admin_read_all_sessions" ON session
    FOR SELECT TO authenticated USING (is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_read_all_escape_rooms" ON escape_room
    FOR SELECT TO authenticated USING (is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_read_all_questions" ON question
    FOR SELECT TO authenticated USING (is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_read_all_answer_options" ON answer_option
    FOR SELECT TO authenticated USING (is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Bootstrap first admin ────────────────────────────────────────────────────
-- After running this migration, promote the first admin manually:
--
--   UPDATE public."user" SET app_role = 'admin' WHERE name = 'your-email@example.com';
--

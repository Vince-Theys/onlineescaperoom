-- ─────────────────────────────────────────────────────────────────────────────
-- User invites: track pending vs. active users
--
-- When an admin invites a user via supabase.auth.admin.inviteUserByEmail,
-- Supabase inserts an auth.users row with `invited_at` set and
-- `email_confirmed_at = NULL`. Once the invitee clicks the email link and
-- sets a password, `email_confirmed_at` becomes non-null. We mirror these
-- two states into a `status` column on public."user".
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── status column ───────────────────────────────────────────────────────────
ALTER TABLE public."user"
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('pending', 'active'));

-- Backfill: any existing auth.users without a confirmed email becomes pending.
UPDATE public."user" pu
SET status = 'pending'
FROM auth.users au
WHERE pu.id = au.id
  AND au.email_confirmed_at IS NULL
  AND au.invited_at IS NOT NULL;

-- ─── Updated trigger that detects invites ────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public."user" (id, name, status)
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN NEW.invited_at IS NOT NULL AND NEW.email_confirmed_at IS NULL
        THEN 'pending'
      ELSE 'active'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ─── Flip status to 'active' when the invitee confirms their email ───────────
CREATE OR REPLACE FUNCTION handle_user_confirmed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public."user"
    SET status = 'active'
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_confirmed();

-- ─── Admin can DELETE users (RLS on public."user") ───────────────────────────
-- The actual auth.users deletion is performed by the Edge Function with
-- service_role; ON DELETE CASCADE on the FK auto-cleans public."user".
-- This policy is here only as a safety net.
DO $$ BEGIN
  CREATE POLICY "admin_delete_users" ON public."user"
    FOR DELETE TO authenticated
    USING (is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

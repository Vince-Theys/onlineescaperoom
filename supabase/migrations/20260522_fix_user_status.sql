-- ─────────────────────────────────────────────────────────────────────────────
-- Fix user status tracking
--
-- The previous handle_new_user() tried to detect invited users via invited_at,
-- but Supabase does not reliably set that field when the SMTP send fails, causing
-- newly invited users to land in public."user" with status = 'active'.
--
-- Because signup is disabled (invite-only system), every new auth.users row is
-- an invited user who has not yet set a password. We can therefore simplify:
--   • Always insert as 'pending' on creation.
--   • Flip to 'active' via the existing on_auth_user_confirmed trigger once
--     email_confirmed_at becomes non-null (i.e. they accept the invite and
--     set a password).
--
-- The backfill re-derives status from email_confirmed_at for all existing rows.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Updated trigger: always pending on creation ──────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public."user" (id, name, status)
  VALUES (NEW.id, NEW.email, 'pending')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ─── Backfill: derive correct status from email_confirmed_at ─────────────────
UPDATE public."user" pu
SET status = CASE
  WHEN au.email_confirmed_at IS NOT NULL THEN 'active'
  ELSE 'pending'
END
FROM auth.users au
WHERE pu.id = au.id;

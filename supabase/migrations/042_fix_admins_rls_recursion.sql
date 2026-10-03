-- 041's admins_self_read policy queries `admins` from inside its own USING
-- clause — that inner query is itself subject to RLS on `admins`, which
-- re-evaluates the same policy, which queries `admins` again, forever.
-- Confirmed live: "infinite recursion detected in policy for relation
-- admins" the moment middleware tried to check admin status.
--
-- Standard fix: a SECURITY DEFINER function runs with the privileges of its
-- owner (which has BYPASSRLS), so the EXISTS check inside it doesn't
-- re-trigger admins' own RLS. audit_log's policies have the same problem
-- transitively (they query admins too), so they get the same fix.
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE user_id = p_user_id);
$$;

DROP POLICY "admins_self_read" ON admins;
CREATE POLICY "admins_self_read" ON admins FOR SELECT USING (is_admin());

DROP POLICY "audit_log_admin_read" ON audit_log;
CREATE POLICY "audit_log_admin_read" ON audit_log FOR SELECT USING (is_admin());

DROP POLICY "audit_log_admin_insert" ON audit_log;
CREATE POLICY "audit_log_admin_insert" ON audit_log FOR INSERT WITH CHECK (
  admin_id = auth.uid() AND is_admin()
);

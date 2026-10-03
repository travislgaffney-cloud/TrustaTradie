-- Replaces the single shared admin password with individual Supabase Auth
-- accounts gated by membership in this table. Deliberately separate from
-- profiles.role: that enum means "what kind of marketplace participant"
-- (customer/tradie) and a profile can only hold one value, which is the
-- wrong semantic layer for something that should be grantable/revocable
-- independent of marketplace identity.
CREATE TABLE admins (
  user_id    UUID PRIMARY KEY REFERENCES profiles(id),
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Only existing admins can read the admin list. No INSERT/UPDATE/DELETE
-- policy at all on purpose — granting/revoking admin access happens via a
-- direct DB write, never through the app itself, so it can't be done by
-- anyone whose own admin access was itself granted through a bug.
CREATE POLICY "admins_self_read" ON admins FOR SELECT USING (
  EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid())
);

-- Append-only record of every admin action: who, what, when, on which
-- record. "Append-only" here means what RLS can actually guarantee: no
-- UPDATE or DELETE policy exists for ANY role, including authenticated
-- admins, so nothing short of the service-role key (which bypasses RLS by
-- design, same as every other table) can alter or remove a row once
-- written. That's a secrets-management boundary, not an RLS one — keep the
-- service-role key safe.
CREATE TABLE audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     UUID NOT NULL REFERENCES profiles(id),
  action       TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id    TEXT NOT NULL,
  details      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_admin_id ON audit_log(admin_id);
CREATE INDEX idx_audit_log_target ON audit_log(target_table, target_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_admin_read" ON audit_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid())
);

CREATE POLICY "audit_log_admin_insert" ON audit_log FOR INSERT WITH CHECK (
  admin_id = auth.uid()
  AND EXISTS (SELECT 1 FROM admins a WHERE a.user_id = auth.uid())
);

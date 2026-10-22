-- "Contact Us" button on both the customer and tradie side — a direct line
-- to admin that isn't tied to a specific job (unlike disputes) or a crash
-- (unlike bug_reports). first_name/last_name/email are captured as typed,
-- not read off profiles, since the user may want admin to reply to a
-- different address than their account email.
CREATE TABLE contact_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id),
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  message     TEXT NOT NULL,
  responded   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contact_messages_created_at ON contact_messages(created_at DESC);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_messages_self_insert" ON contact_messages FOR INSERT WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "contact_messages_self_read" ON contact_messages FOR SELECT USING (
  user_id = auth.uid()
);
CREATE POLICY "contact_messages_admin_read" ON contact_messages FOR SELECT USING (
  is_admin()
);
CREATE POLICY "contact_messages_admin_update" ON contact_messages FOR UPDATE USING (
  is_admin()
);

-- `admins` is admin-read-only (migration 042), so any ordinary customer or
-- tradie trying to notify admins of something (a contact message here, but
-- the same gap already existed for dispute notifications in
-- app/(customer)/payments/[jobId].tsx) got back an empty result from RLS and
-- silently never pushed anyone. SECURITY DEFINER bypasses that same way
-- is_admin() does, exposing only the id list — not granted_by/granted_at —
-- to any authenticated caller.
CREATE OR REPLACE FUNCTION admin_user_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT user_id FROM admins;
$$;

GRANT EXECUTE ON FUNCTION admin_user_ids() TO authenticated;

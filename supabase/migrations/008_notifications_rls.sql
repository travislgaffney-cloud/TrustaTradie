-- Allow authenticated users to insert notifications (e.g. tradies notifying customers)
-- The existing policy only allowed service_role, which blocked client-side inserts.
DROP POLICY IF EXISTS "notifications_service_insert" ON notifications;

CREATE POLICY "notifications_authenticated_insert" ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

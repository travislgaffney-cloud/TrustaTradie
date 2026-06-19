-- Allow users to delete their own notifications (e.g. swipe-to-delete in the app)
CREATE POLICY "notifications_own_delete" ON notifications FOR DELETE USING (user_id = auth.uid());

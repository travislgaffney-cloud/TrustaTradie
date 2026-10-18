-- Lets a tradie dismiss their own rejected quote card (the job went to
-- another tradie) from their own list. Scoped to rejected-only so a tradie
-- can't delete a still-pending or accepted quote out from under a job.
CREATE POLICY "quotes_tradie_delete_rejected" ON quotes FOR DELETE USING (
  auth.uid() = tradie_id AND status = 'rejected'
);

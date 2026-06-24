-- Allow the accepted tradie to update job status (start job, complete job)
CREATE POLICY "jobs_tradie_update_status" ON jobs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM quotes
    WHERE quotes.job_id = jobs.id
      AND quotes.tradie_id = auth.uid()
      AND quotes.status = 'accepted'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotes
    WHERE quotes.job_id = jobs.id
      AND quotes.tradie_id = auth.uid()
      AND quotes.status = 'accepted'
  )
);

-- Allow customers to delete their own jobs
CREATE POLICY "jobs_customer_delete" ON jobs FOR DELETE USING (auth.uid() = customer_id);

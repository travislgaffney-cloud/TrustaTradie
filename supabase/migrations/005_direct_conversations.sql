-- Allow conversations without a job (direct customer→tradie discovery chats)

ALTER TABLE conversations
  DROP CONSTRAINT conversations_job_id_fkey,
  ALTER COLUMN job_id DROP NOT NULL,
  ADD CONSTRAINT conversations_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

-- Drop the old unique constraint that required job_id
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_job_id_customer_id_tradie_id_key;

-- Job-based conversations: still unique per (job, customer, tradie)
CREATE UNIQUE INDEX IF NOT EXISTS conversations_unique_job
  ON conversations (job_id, customer_id, tradie_id)
  WHERE job_id IS NOT NULL;

-- Direct conversations: one per (customer, tradie) pair without a job
CREATE UNIQUE INDEX IF NOT EXISTS conversations_unique_direct
  ON conversations (customer_id, tradie_id)
  WHERE job_id IS NULL;

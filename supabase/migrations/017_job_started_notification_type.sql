-- Add job_started notification type for when tradies mark a job as in progress
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'job_started';

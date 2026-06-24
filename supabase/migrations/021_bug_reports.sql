CREATE TABLE bug_reports (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  error_message TEXT NOT NULL,
  stack_trace   TEXT,
  screen        TEXT,
  device_info   JSONB,
  app_version   TEXT,
  resolved      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bug_reports_created ON bug_reports(created_at DESC);

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bug_reports_insert" ON bug_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bug_reports_service_all" ON bug_reports FOR ALL USING (auth.role() = 'service_role');

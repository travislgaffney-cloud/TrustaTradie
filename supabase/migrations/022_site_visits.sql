CREATE TYPE site_visit_status AS ENUM ('proposed', 'confirmed', 'completed', 'cancelled');

CREATE TABLE site_visits (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id            UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  tradie_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  proposed_datetime TIMESTAMPTZ NOT NULL,
  status            site_visit_status NOT NULL DEFAULT 'proposed',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, tradie_id)
);

CREATE INDEX idx_site_visits_job ON site_visits(job_id);
CREATE INDEX idx_site_visits_tradie ON site_visits(tradie_id);

CREATE TRIGGER trg_site_visits_updated_at BEFORE UPDATE ON site_visits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_visits_read" ON site_visits FOR SELECT TO authenticated
  USING (tradie_id = auth.uid() OR customer_id = auth.uid());
CREATE POLICY "site_visits_tradie_insert" ON site_visits FOR INSERT TO authenticated
  WITH CHECK (tradie_id = auth.uid());
CREATE POLICY "site_visits_update" ON site_visits FOR UPDATE TO authenticated
  USING (tradie_id = auth.uid() OR customer_id = auth.uid());

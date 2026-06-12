-- =============================================
-- EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE user_role AS ENUM ('customer', 'tradie', 'admin');
CREATE TYPE trade_category AS ENUM (
  'electrical', 'building', 'plumbing',
  'landscaping', 'roofing', 'tiling'
);
CREATE TYPE job_status AS ENUM (
  'draft', 'open', 'quotes_received', 'accepted',
  'in_progress', 'pending_completion', 'completed',
  'cancelled', 'disputed'
);
CREATE TYPE quote_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE payment_status AS ENUM (
  'pending', 'held_in_escrow', 'released', 'refunded', 'failed'
);
CREATE TYPE notification_type AS ENUM (
  'new_job_nearby', 'new_quote_received', 'quote_accepted',
  'quote_rejected', 'job_completed', 'payment_released',
  'new_message', 'rating_received'
);
CREATE TYPE document_type AS ENUM ('licence', 'insurance', 'certificate', 'other');

-- =============================================
-- PROFILES (extends auth.users)
-- =============================================
CREATE TABLE profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                  user_role NOT NULL DEFAULT 'customer',
  full_name             TEXT NOT NULL DEFAULT '',
  avatar_url            TEXT,
  phone                 TEXT,
  bio                   TEXT,
  location              GEOGRAPHY(POINT, 4326),
  address_text          TEXT,
  push_token            TEXT,
  bank_name             TEXT,
  bank_account_number   TEXT,
  bank_branch_code      TEXT,
  bank_account_type     TEXT,
  onboarding_complete   BOOLEAN DEFAULT FALSE,
  is_suspended          BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup using user metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer')
  );

  -- If tradie, create tradie_profiles row too
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'customer') = 'tradie' THEN
    INSERT INTO tradie_profiles (id, categories)
    VALUES (
      NEW.id,
      COALESCE(
        (SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'categories'))::trade_category[]),
        '{}'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- TRADIE PROFILES
-- =============================================
CREATE TABLE tradie_profiles (
  id                UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  categories        trade_category[] NOT NULL DEFAULT '{}',
  years_experience  INTEGER,
  hourly_rate       NUMERIC(10,2),
  cipc_number       TEXT,
  vat_number        TEXT,
  is_verified       BOOLEAN DEFAULT FALSE,
  average_rating    NUMERIC(3,2) DEFAULT 0,
  total_reviews     INTEGER DEFAULT 0,
  completed_jobs    INTEGER DEFAULT 0,
  service_radius_km INTEGER DEFAULT 50,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- JOBS
-- =============================================
CREATE TABLE jobs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  category          trade_category NOT NULL,
  status            job_status NOT NULL DEFAULT 'open',
  location          GEOGRAPHY(POINT, 4326),
  address_text      TEXT NOT NULL DEFAULT '',
  suburb            TEXT,
  province          TEXT,
  ai_image_url      TEXT,
  budget_min        NUMERIC(10,2),
  budget_max        NUMERIC(10,2),
  preferred_start   DATE,
  accepted_quote_id UUID,
  view_count        INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_location    ON jobs USING GIST(location);
CREATE INDEX idx_jobs_category    ON jobs(category);
CREATE INDEX idx_jobs_status      ON jobs(status);
CREATE INDEX idx_jobs_customer_id ON jobs(customer_id);

-- =============================================
-- JOB IMAGES
-- =============================================
CREATE TABLE job_images (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id     UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  is_ai      BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- QUOTES
-- =============================================
CREATE TABLE quotes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  tradie_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount        NUMERIC(10,2) NOT NULL,
  includes_vat  BOOLEAN DEFAULT TRUE,
  message       TEXT,
  timeline_days INTEGER,
  status        quote_status NOT NULL DEFAULT 'pending',
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, tradie_id)
);

CREATE INDEX idx_quotes_job_id    ON quotes(job_id);
CREATE INDEX idx_quotes_tradie_id ON quotes(tradie_id);

-- Add FK from jobs to quotes (resolves circular dependency)
ALTER TABLE jobs
  ADD CONSTRAINT fk_accepted_quote
  FOREIGN KEY (accepted_quote_id) REFERENCES quotes(id) ON DELETE SET NULL;

-- =============================================
-- PAYMENTS
-- =============================================
CREATE TABLE payments (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id                  UUID NOT NULL REFERENCES jobs(id),
  quote_id                UUID NOT NULL REFERENCES quotes(id),
  customer_id             UUID NOT NULL REFERENCES profiles(id),
  tradie_id               UUID NOT NULL REFERENCES profiles(id),
  amount_total            NUMERIC(10,2) NOT NULL,
  platform_fee            NUMERIC(10,2) NOT NULL,
  tradie_payout           NUMERIC(10,2) NOT NULL,
  status                  payment_status NOT NULL DEFAULT 'pending',
  payfast_payment_id      TEXT,
  payfast_pf_payment_id   TEXT,
  paid_at                 TIMESTAMPTZ,
  released_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_job_id       ON payments(job_id);
CREATE INDEX idx_payments_tradie_id    ON payments(tradie_id);
CREATE INDEX idx_payments_customer_id  ON payments(customer_id);

-- =============================================
-- RATINGS
-- =============================================
CREATE TABLE ratings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  quote_id    UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  tradie_id   UUID NOT NULL REFERENCES profiles(id),
  score       INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, customer_id)
);

CREATE INDEX idx_ratings_tradie_id ON ratings(tradie_id);

CREATE OR REPLACE FUNCTION update_tradie_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tradie_profiles
  SET
    average_rating = (SELECT ROUND(AVG(score)::NUMERIC, 2) FROM ratings WHERE tradie_id = NEW.tradie_id),
    total_reviews  = (SELECT COUNT(*) FROM ratings WHERE tradie_id = NEW.tradie_id)
  WHERE id = NEW.tradie_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_rating
  AFTER INSERT OR UPDATE ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_tradie_rating();

-- =============================================
-- CONVERSATIONS & MESSAGES
-- =============================================
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id          UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES profiles(id),
  tradie_id       UUID NOT NULL REFERENCES profiles(id),
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, customer_id, tradie_id)
);

CREATE INDEX idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX idx_conversations_tradie_id   ON conversations(tradie_id);

CREATE TABLE messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES profiles(id),
  content          TEXT,
  attachment_url   TEXT,
  attachment_type  TEXT,
  is_read          BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

-- =============================================
-- TRADIE DOCUMENTS
-- =============================================
CREATE TABLE tradie_documents (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tradie_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         document_type NOT NULL DEFAULT 'certificate',
  label        TEXT NOT NULL,
  url          TEXT NOT NULL,
  expiry_date  DATE,
  is_verified  BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PORTFOLIO IMAGES
-- =============================================
CREATE TABLE portfolio_images (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tradie_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  caption    TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- NOTIFICATIONS
-- =============================================
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- =============================================
-- PENDING PAYOUTS (admin queue)
-- =============================================
CREATE TABLE pending_payouts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id      UUID NOT NULL REFERENCES payments(id),
  tradie_id       UUID NOT NULL REFERENCES profiles(id),
  amount          NUMERIC(10,2) NOT NULL,
  bank_name       TEXT,
  bank_account    TEXT,
  branch_code     TEXT,
  account_type    TEXT,
  is_processed    BOOLEAN DEFAULT FALSE,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- NEARBY JOBS RPC FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION get_nearby_jobs(
  p_lat        DOUBLE PRECISION,
  p_lng        DOUBLE PRECISION,
  p_radius_km  INTEGER,
  p_category   trade_category DEFAULT NULL
)
RETURNS TABLE (
  id            UUID,
  customer_id   UUID,
  title         TEXT,
  description   TEXT,
  category      trade_category,
  status        job_status,
  address_text  TEXT,
  suburb        TEXT,
  province      TEXT,
  ai_image_url  TEXT,
  budget_min    NUMERIC,
  budget_max    NUMERIC,
  preferred_start DATE,
  view_count    INTEGER,
  created_at    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ,
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  distance_km   DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id, j.customer_id, j.title, j.description, j.category, j.status,
    j.address_text, j.suburb, j.province, j.ai_image_url,
    j.budget_min, j.budget_max, j.preferred_start, j.view_count,
    j.created_at, j.updated_at,
    ST_Y(j.location::geometry) AS latitude,
    ST_X(j.location::geometry) AS longitude,
    ST_Distance(j.location, ST_MakePoint(p_lng, p_lat)::geography) / 1000.0 AS distance_km
  FROM jobs j
  WHERE
    j.status = 'open'
    AND j.location IS NOT NULL
    AND ST_DWithin(j.location, ST_MakePoint(p_lng, p_lat)::geography, p_radius_km * 1000)
    AND (p_category IS NULL OR j.category = p_category)
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_own_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_own_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

ALTER TABLE tradie_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tradie_profiles_public_read" ON tradie_profiles FOR SELECT USING (true);
CREATE POLICY "tradie_profiles_own_all" ON tradie_profiles FOR ALL USING (auth.uid() = id);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_open_read" ON jobs FOR SELECT USING (status != 'draft' OR customer_id = auth.uid());
CREATE POLICY "jobs_customer_insert" ON jobs FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "jobs_customer_update" ON jobs FOR UPDATE USING (auth.uid() = customer_id);

ALTER TABLE job_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_images_public_read" ON job_images FOR SELECT USING (true);
CREATE POLICY "job_images_insert" ON job_images FOR INSERT WITH CHECK (
  job_id IN (SELECT id FROM jobs WHERE customer_id = auth.uid())
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes_read" ON quotes FOR SELECT USING (
  tradie_id = auth.uid() OR
  job_id IN (SELECT id FROM jobs WHERE customer_id = auth.uid())
);
CREATE POLICY "quotes_tradie_insert" ON quotes FOR INSERT WITH CHECK (auth.uid() = tradie_id);
CREATE POLICY "quotes_update" ON quotes FOR UPDATE USING (
  tradie_id = auth.uid() OR
  job_id IN (SELECT id FROM jobs WHERE customer_id = auth.uid())
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_parties_read" ON payments FOR SELECT USING (
  customer_id = auth.uid() OR tradie_id = auth.uid()
);
CREATE POLICY "payments_insert" ON payments FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "payments_service_role" ON payments FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings_public_read" ON ratings FOR SELECT USING (true);
CREATE POLICY "ratings_customer_insert" ON ratings FOR INSERT WITH CHECK (auth.uid() = customer_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_participants" ON conversations FOR SELECT USING (
  customer_id = auth.uid() OR tradie_id = auth.uid()
);
CREATE POLICY "conversations_insert" ON conversations FOR INSERT WITH CHECK (
  customer_id = auth.uid() OR tradie_id = auth.uid()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_participants_read" ON messages FOR SELECT USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE customer_id = auth.uid() OR tradie_id = auth.uid()
  )
);
CREATE POLICY "messages_sender_insert" ON messages FOR INSERT WITH CHECK (sender_id = auth.uid());

ALTER TABLE tradie_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "docs_own_read" ON tradie_documents FOR SELECT USING (tradie_id = auth.uid());
CREATE POLICY "docs_own_insert" ON tradie_documents FOR INSERT WITH CHECK (tradie_id = auth.uid());

ALTER TABLE portfolio_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portfolio_public_read" ON portfolio_images FOR SELECT USING (true);
CREATE POLICY "portfolio_own_all" ON portfolio_images FOR ALL USING (tradie_id = auth.uid());

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own_read" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_own_update" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_service_insert" ON notifications FOR INSERT WITH CHECK (auth.role() = 'service_role');

ALTER TABLE pending_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts_service_only" ON pending_payouts FOR ALL USING (auth.role() = 'service_role');

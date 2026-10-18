-- Geolocation-based matching (profiles.location, jobs.location, service_radius_km,
-- get_nearby_jobs, get_nearby_tradies) is being parked, not removed — all of
-- that stays in place for a later re-enable. This adds a parallel town-based
-- system: tradies list the towns they service, customers type a town when
-- posting a job, and matching becomes a plain exact-match lookup instead of
-- a distance query.
ALTER TABLE tradie_profiles ADD COLUMN IF NOT EXISTS service_towns TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS town TEXT;

CREATE INDEX IF NOT EXISTS idx_tradie_profiles_service_towns ON tradie_profiles USING GIN (service_towns);
CREATE INDEX IF NOT EXISTS idx_jobs_town ON jobs(town);

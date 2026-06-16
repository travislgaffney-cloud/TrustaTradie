-- RPC: get_nearby_tradies
-- Returns tradies within a radius, ordered by distance

CREATE OR REPLACE FUNCTION get_nearby_tradies(
  p_lat        DOUBLE PRECISION,
  p_lng        DOUBLE PRECISION,
  p_radius_km  INTEGER,
  p_category   trade_category DEFAULT NULL
)
RETURNS TABLE (
  id             UUID,
  full_name      TEXT,
  avatar_url     TEXT,
  bio            TEXT,
  suburb         TEXT,
  categories     trade_category[],
  average_rating DOUBLE PRECISION,
  total_reviews  INTEGER,
  completed_jobs INTEGER,
  is_verified    BOOLEAN,
  hourly_rate    NUMERIC,
  distance_km    DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.suburb,
    tp.categories,
    tp.average_rating,
    tp.total_reviews,
    tp.completed_jobs,
    tp.is_verified,
    tp.hourly_rate,
    ST_Distance(p.location, ST_MakePoint(p_lng, p_lat)::geography) / 1000.0 AS distance_km
  FROM profiles p
  JOIN tradie_profiles tp ON tp.id = p.id
  WHERE
    p.role = 'tradie'
    AND p.location IS NOT NULL
    AND ST_DWithin(p.location, ST_MakePoint(p_lng, p_lat)::geography, p_radius_km * 1000)
    AND (p_category IS NULL OR p_category = ANY(tp.categories))
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index for spatial queries on profiles.location
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles USING GIST(location);

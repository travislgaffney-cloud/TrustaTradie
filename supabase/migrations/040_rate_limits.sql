-- Fixed-window rate limiting shared by every edge function. One row per
-- (key, window) — key is caller-scoped, e.g. "user:<uuid>:tradesafe-checkout"
-- or "ip:<addr>:tradesafe-checkout". The RPC below does the increment
-- atomically (INSERT ... ON CONFLICT DO UPDATE) so concurrent requests from
-- the same caller can't race past the limit via a read-then-write gap.
CREATE TABLE rate_limits (
  key          TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count        INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

-- No RLS policies on purpose — this table is only ever touched via the
-- SECURITY DEFINER function below, called from edge functions using the
-- service role (which bypasses RLS anyway). Nothing else should read or
-- write it directly.
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
) RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, retry_after_seconds INTEGER)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  v_window_start := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);

  INSERT INTO rate_limits (key, window_start, count)
  VALUES (p_key, v_window_start, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET count = rate_limits.count + 1
  RETURNING rate_limits.count INTO v_count;

  -- Opportunistic cleanup instead of a cron job — cheap, and only ever
  -- touches windows that are long expired regardless of window size.
  IF random() < 0.01 THEN
    DELETE FROM rate_limits WHERE window_start < now() - interval '1 hour';
  END IF;

  RETURN QUERY SELECT
    v_count <= p_limit,
    v_count,
    GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_window_start + make_interval(secs => p_window_seconds) - now())))::INTEGER);
END;
$$ LANGUAGE plpgsql;

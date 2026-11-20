-- The rating-aggregation trigger (update_tradie_rating, from migration 001)
-- was never SECURITY DEFINER, so it ran with the privileges of whoever
-- submitted the rating -- the customer, not the tradie. tradie_profiles'
-- RLS policy ("tradie_profiles_own_all") only allows a row to be updated
-- by its own owner (auth.uid() = id), so the trigger's UPDATE silently
-- matched zero rows every time a customer rated a tradie: the rating
-- itself was inserted fine, but average_rating/total_reviews on
-- tradie_profiles never actually changed, leaving every tradie stuck
-- showing 0 stars and 0 reviews everywhere those cached columns are read
-- (the Tradies Nearby list, and the summary line on a tradie's own
-- profile page), even though their real reviews were visible further
-- down that same profile page (which queries the ratings table live).
CREATE OR REPLACE FUNCTION update_tradie_rating()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tradie_profiles
  SET
    average_rating = (SELECT ROUND(AVG(score)::NUMERIC, 2) FROM ratings WHERE tradie_id = NEW.tradie_id),
    total_reviews  = (SELECT COUNT(*) FROM ratings WHERE tradie_id = NEW.tradie_id)
  WHERE id = NEW.tradie_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- One-time backfill: recompute every tradie's cached rating/review count
-- from the real ratings table, since the trigger has never actually been
-- able to write these columns since the app launched.
UPDATE tradie_profiles tp
SET
  average_rating = COALESCE((SELECT ROUND(AVG(score)::NUMERIC, 2) FROM ratings WHERE tradie_id = tp.id), 0),
  total_reviews  = (SELECT COUNT(*) FROM ratings WHERE tradie_id = tp.id);
